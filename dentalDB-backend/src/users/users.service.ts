import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User, UserRole, isDoctorRole } from './entities/user.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Leave, LeaveStatus } from '../leave/entities/leave.entity';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { Role } from '../rbac/entities/role.entity';
import { UserRole as UserRoleAssignment } from '../rbac/entities/user-role.entity';
import { DoctorClinicAffiliation, AffiliationStatus } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { Branch } from '../branch/entities/branch.entity';
import { ShiftResolver } from '../shifts/shift-resolver.service';
import { AuthCacheService } from '../auth/auth-cache.service';
import { invalidateLiveAuthCache } from '../auth/live-auth-cache.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(Appointment) private aptRepo: Repository<Appointment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Leave) private leaveRepo: Repository<Leave>,
    @InjectRepository(DoctorCommission) private commissionRepo: Repository<DoctorCommission>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserRoleAssignment) private userRoleRepo: Repository<UserRoleAssignment>,
    @InjectRepository(DoctorClinicAffiliation) private affiliationRepo: Repository<DoctorClinicAffiliation>,
    private shiftResolver: ShiftResolver,
    private authCache: AuthCacheService,
    @Inject(CACHE_MANAGER) private liveCache: Cache,
  ) {}
 
  async findStaff(clinicId: string, query: any) {
    const { page = 1, limit = 12, roles, search, branchId, onShiftOnly } = query;

    let qb = this.repo
      .createQueryBuilder('u')
      .where('u.clinicId = :clinicId', { clinicId });

    if (roles) {
      // Support comma-separated role list. Each token is matched with ${ilike()} so
      // custom roles (e.g. "Doctor", "Senior Dentist") are found alongside the
      // built-in enum values (e.g. "dentist").
      const tokens: string[] = (roles as string).split(',').map((r: string) => r.trim()).filter(Boolean);
      // Cast enum to text before ${ilike()} — PostgreSQL cannot use ~~ on enum types directly
      const conditions = tokens.map((_: string, i: number) => `CAST(u.role AS text) ${ilike()} :role${i}`).join(' OR ');
      const params: Record<string, string> = {};
      tokens.forEach((t: string, i: number) => { params[`role${i}`] = `%${t}%`; });

      // A user assigned a role through the RBAC "Roles" module (user_roles →
      // roles) never gets their legacy `role` enum column updated — that
      // column only changes when a user is created with a matching built-in
      // role. Without this, staff who were made doctors purely via a custom
      // RBAC role assignment are invisible to every "roles=doctor,dentist"
      // lookup (appointment forms, walk-in queue, etc). Resolve matching RBAC
      // roles for this clinic and OR their assigned users into the filter.
      const rbacRoleConditions = tokens.map((_: string, i: number) => `r.name ${ilike()} :rname${i}`).join(' OR ');
      const rbacParams: Record<string, string> = {};
      tokens.forEach((t: string, i: number) => { rbacParams[`rname${i}`] = `%${t}%`; });
      const matchingRbacRoles = await this.roleRepo
        .createQueryBuilder('r')
        .where('r.clinicId = :clinicId', { clinicId })
        .andWhere(`(${rbacRoleConditions})`, rbacParams)
        .getMany();

      let rbacUserIds: string[] = [];
      if (matchingRbacRoles.length) {
        const assignments = await this.userRoleRepo.find({
          where: { roleId: In(matchingRbacRoles.map((r) => r.id)) },
        });
        rbacUserIds = assignments.map((a) => a.userId);
      }

      if (rbacUserIds.length) {
        qb = qb.andWhere(`((${conditions}) OR u.id IN (:...rbacUserIds))`, { ...params, rbacUserIds });
      } else {
        qb = qb.andWhere(`(${conditions})`, params);
      }
    } else {
      // No filter → exclude super_admin only
      qb = qb.andWhere('u.role != :superAdmin', { superAdmin: UserRole.SUPER_ADMIN });
    }

    // When a branch is selected, only show staff assigned to that branch
    if (branchId) {
      qb = qb
        .innerJoin('user_branches', 'ub', 'ub.user_id = u.id AND ub.branch_id = :branchId', { branchId });
    }
 
    if (search) {
      qb = qb.andWhere(
        `(u.firstName ${ilike()} :s OR u.lastName ${ilike()} :s OR u.email ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }
 
    qb = qb.orderBy('u.createdAt', 'DESC');
 
    const total = await qb.getCount();
    let data  = await qb.skip((+page - 1) * +limit).take(+limit).getMany();

    if ((onShiftOnly === 'true' || onShiftOnly === true) && data.length > 0) {
      data = await this.filterToOnShift(clinicId, data);
    }
 
    return { data, total: data.length, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) };
  }

  /** Keeps only staff currently within an active shift. Falls back to returning everyone unfiltered if the clinic hasn't configured the Shift Module at all (no patterns/assignments exist). */
  private async filterToOnShift(clinicId: string, staff: User[]): Promise<User[]> {
    const moduleInUse = await this.shiftResolver.hasAnyShiftConfig(clinicId);
    if (!moduleInUse) return staff;

    const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const nowHHMM = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

    const resolved = await this.shiftResolver.resolveMany(staff.map(s => s.id), clinicId, dateParts);
    return staff.filter(s => {
      const shift = resolved.get(s.id);
      return shift ? this.shiftResolver.isWithinShiftHours(shift, nowHHMM) : false;
    });
  }

  async findOne(clinicId: string, id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id, clinicId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Normalize incoming role values to valid UserRole enum values.
   * The RBAC system returns display names like "Doctor" which get lowercased
   * to "doctor" on the frontend, but the DB enum only has "dentist".
   * If the value doesn't map to any valid enum member, falls back to STAFF
   * so the DB INSERT never hits the enum constraint.
   */
  private normalizeRole(role: string): UserRole {
    if (!role) return UserRole.STAFF;
    const normalized = role.toLowerCase().trim();
    // Map common aliases to the correct enum value
    const ROLE_ALIASES: Record<string, UserRole> = {
      doctor:    UserRole.DENTIST,
      physician: UserRole.DENTIST,
      dr:        UserRole.DENTIST,
    };
    if (ROLE_ALIASES[normalized]) return ROLE_ALIASES[normalized];
    // If it's already a valid enum value, use it directly
    const enumValues = Object.values(UserRole) as string[];
    if (enumValues.includes(normalized)) return normalized as UserRole;
    // Custom RBAC role name (e.g. "Senior Nurse") — default to staff for the
    // enum column; the real role is persisted via the user_roles join table below.
    return UserRole.STAFF;
  }

  async create(clinicId: string, dto: any): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(dto.password || 'ChangeMe@123', 12);
    const { branchId, ...userDto } = dto;
    const user = this.repo.create({
      ...userDto,
      role: this.normalizeRole(dto.role),
      clinicId,
      password: hashed,
    } as Partial<User>);
    const saved = await this.repo.save(user);

    // Auto-assign the custom RBAC role whose name matches dto.role (case-insensitive)
    if (dto.role) {
      const matchingRole = await this.roleRepo
        .createQueryBuilder('r')
        .where('r.clinicId = :clinicId', { clinicId })
        .andWhere('LOWER(r.name) = LOWER(:name)', { name: dto.role.trim() })
        .getOne();
      if (matchingRole) {
        await this.userRoleRepo.delete({ userId: saved.id });
        await this.userRoleRepo.save(
          this.userRoleRepo.create({ userId: saved.id, roleId: matchingRole.id }),
        );
      }
    }

    // Assign to branch if branchId provided.
    //
    // IMPORTANT: this used to be a raw `INSERT INTO user_branches ...`
    // written with Postgres-only `$1, $2` placeholder syntax. That works
    // fine against the hosted Postgres backend, but this same code path
    // also runs inside the Electron-bundled SQLite backend (DB_DRIVER=sqlite
    // — see electron/main.js), where `$1`/`$2` are not positional
    // placeholders at all. The insert silently failed there, so staff
    // created on-device were never actually linked to their branch in
    // user_branches — they'd have zero branches, so BranchSwitcher.tsx's
    // "branches.length === 0 && !isAdmin" case rendered nothing at all for
    // them (not even the single-branch locked indicator), and
    // GET /branches/my (branch.service.ts#getUserBranches, which joins
    // through b.staff) returned an empty array every time.
    //
    // The relation query builder below goes through the ORM's `staff`
    // many-to-many relation (see Branch entity's @JoinTable) instead of
    // hand-rolled SQL, so it works identically against Postgres and SQLite.
    if (branchId) {
      await this.repo.manager
        .createQueryBuilder()
        .relation(Branch, 'staff')
        .of(branchId)
        .add(saved.id);
    }

    // Part 0.1 — Auto-create DoctorClinicAffiliation when assigning a doctor-type role
    const resolvedRole = this.normalizeRole(dto.role);
    if (isDoctorRole(resolvedRole)) {
      const existing = await this.affiliationRepo.findOne({
        where: { doctorUserId: saved.id, clinicId },
      });
      if (!existing) {
        await this.affiliationRepo.save(
          this.affiliationRepo.create({
            doctorUserId:        saved.id,
            clinicId,
            branchId:            branchId || null,
            status:              AffiliationStatus.ACTIVE,
            isPrimaryEmployment: true,
            invitedAt:           new Date(),
            joinedAt:            new Date(),
          }),
        );
      }
    }

    return saved;
  }

  async update(clinicId: string, id: string, dto: any): Promise<User> {
    await this.findOne(clinicId, id);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 12);
    if (dto.role) dto.role = this.normalizeRole(dto.role) as any;
    await this.repo.update({ id, clinicId }, dto);
    // A role/permission-affecting field changed — bust the fast-path
    // cache so it takes effect on this user's very next request instead
    // of waiting out CACHE_TTL_MS.
    if (dto.role !== undefined || dto.isActive !== undefined || dto.clinicId !== undefined) {
      await invalidateLiveAuthCache(this.liveCache, id);
    }
    return this.findOne(clinicId, id);
  }

  async deactivate(clinicId: string, id: string): Promise<User> {
    const user = await this.findOne(clinicId, id);
    user.isActive = false;
    const saved = await this.repo.save(user);
    await this.authCache.invalidate(id);
    await invalidateLiveAuthCache(this.liveCache, id);
    return saved;
  }

  async reactivate(clinicId: string, id: string): Promise<User> {
    const user = await this.findOne(clinicId, id);
    user.isActive = true;
    const saved = await this.repo.save(user);
    await invalidateLiveAuthCache(this.liveCache, id);
    return saved;
  }

  async deleteStaff(clinicId: string, id: string): Promise<void> {
    const user = await this.findOne(clinicId, id);
    if (user.role === 'owner') throw new Error('Cannot delete clinic owner');
    await this.repo.delete({ id, clinicId });
  }

  async getDentistPerformance(clinicId: string, dentistId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Monthly stats
    const [monthlyApts, overallApts] = await Promise.all([
      this.aptRepo.createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patientId)', 'totalPatients')
        .addSelect('COUNT(*)', 'totalAppointments')
        .where('a.clinicId = :clinicId', { clinicId })
        .andWhere('a.dentistId = :dentistId', { dentistId })
        .andWhere('a.status = :status', { status: AppointmentStatus.COMPLETED })
        .andWhere('a.scheduledAt >= :start', { start: monthStart })
        .andWhere('a.scheduledAt <= :end', { end: monthEnd })
        .getRawOne(),

      this.aptRepo.createQueryBuilder('a')
        .select('COUNT(DISTINCT a.patientId)', 'totalPatients')
        .addSelect('COUNT(*)', 'totalAppointments')
        .where('a.clinicId = :clinicId', { clinicId })
        .andWhere('a.dentistId = :dentistId', { dentistId })
        .andWhere('a.status = :status', { status: AppointmentStatus.COMPLETED })
        .getRawOne(),
    ]);

    // Service-only revenue and commission — read directly from doctor_commissions table
    // which only ever stores service line items (products are excluded at write time).
    const dentist = await this.repo.findOne({ where: { id: dentistId, clinicId } });
    const commissionRate = +(dentist?.commissionRate ?? 0);

    const commissionResult = await this.commissionRepo.createQueryBuilder('c')
      .select('COALESCE(SUM(c.serviceRevenue), 0)', 'totalServiceRevenue')
      .addSelect('COALESCE(SUM(c.amount), 0)', 'totalCommission')
      .where('c.clinicId = :clinicId', { clinicId })
      .andWhere('c.doctorId = :dentistId', { dentistId })
      .andWhere('c.createdAt >= :start', { start: monthStart })
      .andWhere('c.createdAt <= :end', { end: monthEnd })
      .getRawOne();

    const totalRevenue = parseFloat(commissionResult?.totalServiceRevenue ?? '0');
    const estimatedCommission = parseFloat(commissionResult?.totalCommission ?? '0');

    // Leave count this month
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const monthEndStr   = monthEnd.toISOString().slice(0, 10);
    const leaveThisMonth = await this.leaveRepo.createQueryBuilder('l')
      .where('l.clinicId = :clinicId', { clinicId })
      .andWhere('l.userId = :dentistId', { dentistId })
      .andWhere('l.status IN (:...statuses)', { statuses: ['approved', 'pending'] })
      .andWhere('l.startDate <= :monthEnd', { monthEnd: monthEndStr })
      .andWhere('l.endDate >= :monthStart', { monthStart: monthStartStr })
      .getCount();

    return {
      monthly: {
        totalPatients:        parseInt(monthlyApts?.totalPatients ?? '0', 10),
        totalAppointments:    parseInt(monthlyApts?.totalAppointments ?? '0', 10),
        totalRevenue:         +totalRevenue.toFixed(2),
        estimatedCommission,
        commissionRate,
        leaveThisMonth,
      },
      overall: {
        totalPatients:     parseInt(overallApts?.totalPatients ?? '0', 10),
        totalAppointments: parseInt(overallApts?.totalAppointments ?? '0', 10),
      },
    };
  }

  async getAdminDentistPerformance(clinicId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const dentists = await this.repo
      .createQueryBuilder('u')
      .where('u.clinicId = :clinicId', { clinicId })
      .andWhere('u.isActive = true')
      .andWhere(`(CAST(u.role AS text) ${ilike()} '%dentist%' OR CAST(u.role AS text) ${ilike()} '%doctor%')`)
      .getMany();

    const results = await Promise.all(
      dentists.map(async (d) => {
        const apts = await this.aptRepo.createQueryBuilder('a')
          .select('COUNT(*)', 'totalAppointments')
          .where('a.clinicId = :clinicId', { clinicId })
          .andWhere('a.dentistId = :dentistId', { dentistId: d.id })
          .andWhere('a.status = :status', { status: AppointmentStatus.COMPLETED })
          .andWhere('a.scheduledAt >= :start', { start: monthStart })
          .andWhere('a.scheduledAt <= :end', { end: monthEnd })
          .getRawOne();

        // Use doctor_commissions table so revenue = service-only, not full invoice total
        const commRev = await this.commissionRepo.createQueryBuilder('c')
          .select('COALESCE(SUM(c.serviceRevenue), 0)', 'totalServiceRevenue')
          .addSelect('COALESCE(SUM(c.amount), 0)', 'totalCommission')
          .where('c.clinicId = :clinicId', { clinicId })
          .andWhere('c.doctorId = :dentistId', { dentistId: d.id })
          .andWhere('c.createdAt >= :start', { start: monthStart })
          .andWhere('c.createdAt <= :end', { end: monthEnd })
          .getRawOne();

        const totalRevenue = parseFloat(commRev?.totalServiceRevenue ?? '0');
        const estimatedCommission = parseFloat(commRev?.totalCommission ?? '0');
        const commissionRate = +(d.commissionRate ?? 0);
        return {
          dentistId:           d.id,
          name:                `${d.firstName} ${d.lastName}`,
          totalAppointments:   parseInt(apts?.totalAppointments ?? '0', 10),
          totalRevenue:        +totalRevenue.toFixed(2),
          commissionRate,
          estimatedCommission: +estimatedCommission.toFixed(2),
        };
      }),
    );

    return results;
  }
}
