// dentalDB-backend/src/rbac/rbac.service.ts
import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateRoleDto, UpdateRoleDto, SetRolePermissionsDto,
  AssignRolesToUserDto, TogglePermissionDto,
} from './dto/rbac.dto';
import { invalidateLiveAuthCache } from '../auth/live-auth-cache.util';

export const SYSTEM_PERMISSIONS = [
  // Finance — Expenses
  { key: 'expense.view',     label: 'View Expenses',     group: 'Finance' },
  { key: 'expense.manage',   label: 'Manage Expenses',   group: 'Finance' },
  { key: 'expense.approve',  label: 'Approve Expenses',  group: 'Finance' },
  // Finance — Payroll
  { key: 'payroll.view',     label: 'View Payroll',      group: 'Finance' },
  { key: 'payroll.manage',   label: 'Manage Payroll',    group: 'Finance' },
  { key: 'payroll.finalize', label: 'Finalize Payroll',  group: 'Finance' },
  // Finance — Reports & Wallet
  { key: 'reports.view',     label: 'View Reports',      group: 'Finance' },
  { key: 'wallet.manage',    label: 'Manage Wallets',    group: 'Finance' },

  { key: 'dashboard.view',     label: 'View Dashboard',           group: 'Dashboard' },
  { key: 'queue.view',         label: 'View Waiting Room Queue',  group: 'Queue' },
  { key: 'queue.manage',       label: 'Edit / Delete Queue Entries', group: 'Queue' },
  { key: 'appointment.view',   label: 'View Appointments',        group: 'Appointments' },
  { key: 'appointment.create', label: 'Create Appointment',       group: 'Appointments' },
  { key: 'appointment.update', label: 'Update Appointment',       group: 'Appointments' },
  { key: 'appointment.delete', label: 'Delete Appointment',       group: 'Appointments' },
  { key: 'patient.view',       label: 'View Patients',            group: 'Patients' },
  { key: 'patient.create',     label: 'Create Patient',           group: 'Patients' },
  { key: 'patient.update',     label: 'Update Patient',           group: 'Patients' },
  { key: 'patient.delete',     label: 'Delete Patient',           group: 'Patients' },
  { key: 'patient.record',     label: 'Access Patient Records',   group: 'Patients' },
  { key: 'patient.merge',      label: 'Merge Duplicate Patients',  group: 'Patients' },
  { key: 'billing.view',       label: 'View Billing',             group: 'Billing' },
  { key: 'billing.manage',     label: 'Manage Billing',           group: 'Billing' },
  { key: 'invoice.create',     label: 'Create Invoice',           group: 'Billing' },
  { key: 'invoice.update',     label: 'Update Invoice',           group: 'Billing' },
  { key: 'invoice.delete',     label: 'Delete Invoice',           group: 'Billing' },
  { key: 'analytics.view',     label: 'View Analytics',           group: 'Analytics' },
  { key: 'staff.view',         label: 'View Staff',               group: 'Staff' },
  { key: 'staff.manage',       label: 'Manage Staff',             group: 'Staff' },
  { key: 'branch.view',        label: 'View Branches',            group: 'Branches' },
  { key: 'branch.manage',      label: 'Manage Branches',          group: 'Branches' },
  { key: 'shift.view',         label: 'View Shifts',              group: 'HR' },
  { key: 'shift.manage',       label: 'Manage Shifts',            group: 'HR' },
  { key: 'attendance.view',    label: 'View Attendance',          group: 'HR' },
  { key: 'attendance.manage',  label: 'Manage Attendance',        group: 'HR' },
  { key: 'leave.view',         label: 'View Leave',               group: 'HR' },
  { key: 'leave.manage',       label: 'Manage Leave',             group: 'HR' },
  { key: 'website.view',       label: 'View Website Builder',     group: 'Website' },
  { key: 'website.manage',     label: 'Manage Website',           group: 'Website' },
  { key: 'settings.view',      label: 'View Settings',            group: 'Settings' },
  { key: 'settings.manage',    label: 'Manage Settings',          group: 'Settings' },
  { key: 'roles.view',         label: 'View Roles & Permissions', group: 'Access Control' },
  { key: 'roles.manage',       label: 'Manage Roles & Permissions', group: 'Access Control' },
  { key: 'records.delete',     label: 'Delete Records',           group: 'Records' },
  { key: 'inventory.view',    label: 'View Inventory',        group: 'Inventory' },
  { key: 'inventory.manage',  label: 'Manage Inventory',      group: 'Inventory' },
  { key: 'services.view',     label: 'View Services',         group: 'Services'  },
  { key: 'services.manage',   label: 'Manage Services',       group: 'Services'  },
  { key: 'records.view',      label: 'View Clinical Records', group: 'Records'   },
  { key: 'records.create',    label: 'Create Clinical Record',group: 'Records'   },
  { key: 'records.update',    label: 'Update Clinical Record',group: 'Records'   },
  { key: 'audit.view',        label: 'View Audit Log',        group: 'Audit'     },
  { key: 'lab.view',          label: 'View Lab Work',         group: 'Lab'       },
  { key: 'lab.manage',        label: 'Manage Lab Work',       group: 'Lab'       },
  { key: 'blood_test.view',   label: 'View Blood Tests',      group: 'Lab'       },
  { key: 'blood_test.manage', label: 'Manage Blood Tests',    group: 'Lab'       },
  { key: 'holiday.view',      label: 'View Holidays',         group: 'Holidays & Notices' },
  { key: 'holiday.manage',    label: 'Manage Holidays',       group: 'Holidays & Notices' },
  { key: 'notice.view',       label: 'View Notices',          group: 'Holidays & Notices' },
  { key: 'notice.manage',     label: 'Manage Notices',        group: 'Holidays & Notices' },
  { key: 'tasks.view',        label: 'View Tasks',            group: 'Tasks' },
  { key: 'tasks.manage',      label: 'Create / Edit / Delete Tasks', group: 'Tasks' },

  // ── Part 7 — Marketplace / Clinic-side permissions ───────────────────────
  { key: 'listing.manage',       label: 'Manage Public Listing',          group: 'Marketplace' },
  { key: 'reviews.respond',      label: 'Respond to Reviews',             group: 'Marketplace' },
  { key: 'intake.manage',        label: 'Manage Intake Form Templates',   group: 'Marketplace' },
  { key: 'consent.manage',       label: 'Manage Consent Templates',       group: 'Marketplace' },
  { key: 'telehealth.manage',    label: 'Manage Telehealth Availability', group: 'Marketplace' },
  { key: 'affiliations.manage',  label: 'Manage Doctor Affiliations',     group: 'Marketplace' },

  // ── Part 7 — Doctor-side permissions ────────────────────────────────────
  { key: 'doctor.profile.manage',    label: 'Manage Doctor Profile',              group: 'Doctor' },
  { key: 'doctor.availability',      label: 'Manage Doctor Availability',         group: 'Doctor' },
  { key: 'doctor.invites',           label: 'Respond to Affiliation Invites',     group: 'Doctor' },
  { key: 'doctor.bookings',          label: 'Manage Independent Bookings',        group: 'Doctor' },
  { key: 'doctor.reviews.respond',   label: 'Respond to Reviews (Doctor-scoped)', group: 'Doctor' },
];

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)       private roleRepo:     Repository<Role>,
    @InjectRepository(Permission) private permRepo:     Repository<Permission>,
    @InjectRepository(UserRole)   private userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)       private userRepo:     Repository<User>,
    @Inject(CACHE_MANAGER)        private liveCache:    Cache,
  ) {}

  /** Every userId currently holding this role — used to bust the fast-path auth cache for all of them at once. */
  private async userIdsWithRole(roleId: string): Promise<string[]> {
    const rows = await this.userRoleRepo.find({ where: { roleId } });
    return rows.map((r) => r.userId);
  }

  // ─── Permissions ─────────────────────────────────────────────────────────────

  findAllPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  // ─── Roles ───────────────────────────────────────────────────────────────────

  findAllRoles(clinicId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: { clinicId },
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findRole(id: string, clinicId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id, clinicId },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(dto: CreateRoleDto, clinicId: string): Promise<Role> {
    const exists = await this.roleRepo.findOne({ where: { name: dto.name, clinicId } });
    if (exists) throw new ConflictException(`Role '${dto.name}' already exists`);
    const role = this.roleRepo.create({ ...dto, clinicId, permissions: [] });
    return this.roleRepo.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto, clinicId: string): Promise<Role> {
    const role = await this.findRole(id, clinicId);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be renamed');
    Object.assign(role, dto);
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string, clinicId: string): Promise<void> {
    const role = await this.findRole(id, clinicId);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deleted');
    const affectedUserIds = await this.userIdsWithRole(id);
    await this.userRoleRepo.delete({ roleId: id });
    await this.roleRepo.remove(role);
    await invalidateLiveAuthCache(this.liveCache, affectedUserIds);
  }

  async setRolePermissions(roleId: string, dto: SetRolePermissionsDto, clinicId: string): Promise<Role> {
    const role = await this.findRole(roleId, clinicId);
    const perms = dto.permissionIds.length
      ? await this.permRepo.findBy({ id: In(dto.permissionIds) })
      : [];
    if (perms.length !== dto.permissionIds.length)
      throw new BadRequestException('One or more permission IDs are invalid');
    role.permissions = perms;
    const affectedUserIds = await this.userIdsWithRole(roleId);
    const saved = await this.roleRepo.save(role);
    // Every user holding this role just had their effective permissions
    // change — without this, they'd keep their old permission set for up
    // to CACHE_TTL_MS after an admin just revoked/granted access.
    await invalidateLiveAuthCache(this.liveCache, affectedUserIds);
    return saved;
  }

  async toggleRolePermission(roleId: string, dto: TogglePermissionDto, clinicId: string): Promise<Role> {
    const role = await this.findRole(roleId, clinicId);
    const perm = await this.permRepo.findOne({ where: { id: dto.permissionId } });
    if (!perm) throw new NotFoundException('Permission not found');
    if (dto.enabled) {
      if (!role.permissions.some((p) => p.id === perm.id)) role.permissions.push(perm);
    } else {
      role.permissions = role.permissions.filter((p) => p.id !== perm.id);
    }
    const affectedUserIds = await this.userIdsWithRole(roleId);
    const saved = await this.roleRepo.save(role);
    await invalidateLiveAuthCache(this.liveCache, affectedUserIds);
    return saved;
  }

  // ─── User ↔ Roles ─────────────────────────────────────────────────────────

  getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepo.find({
      where: { userId },
      relations: ['role', 'role.permissions'],
    });
  }

  async assignRolesToUser(targetUserId: string, dto: AssignRolesToUserDto, clinicId: string, actorRole: string): Promise<UserRole[]> {
    const target = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');
    if (actorRole !== 'super_admin' && target.clinicId !== clinicId)
      throw new ForbiddenException('Cannot assign roles to users outside your clinic');

    const roles = dto.roleIds.length
      ? await this.roleRepo.findBy({ id: In(dto.roleIds), clinicId })
      : [];
    if (roles.length !== dto.roleIds.length)
      throw new BadRequestException('One or more role IDs are invalid or not in your clinic');

    await this.userRoleRepo.delete({ userId: targetUserId });
    const assignments = roles.map((r) =>
      this.userRoleRepo.create({ userId: targetUserId, roleId: r.id }),
    );
    const saved = await this.userRoleRepo.save(assignments);
    await invalidateLiveAuthCache(this.liveCache, targetUserId);
    return saved;
  }

  // ─── Permission resolution ────────────────────────────────────────────────

  async resolvePermissionsForUser(userId: string, role: string): Promise<string[]> {
    if (role === 'super_admin') {
      const all = await this.permRepo.find();
      return all.map((p) => p.key);
    }
    // Owner base role always gets all permissions
    if (role === 'owner') {
      const all = await this.permRepo.find();
      return all.map((p) => p.key);
    }
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['role', 'role.permissions'],
    });
    const keys = new Set<string>();
    for (const ur of userRoles) {
      for (const perm of ur.role?.permissions ?? []) keys.add(perm.key);
    }
    return [...keys];
  }

  async resolvePermissionSetForUser(userId: string, role: string): Promise<Set<string>> {
    if (role === 'super_admin') return new Set(['*']);
    // Owner base role gets wildcard — PermissionsGuard checks for '*'
    if (role === 'owner') return new Set(['*']);
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      relations: ['role', 'role.permissions'],
    });
    const keys = new Set<string>();
    for (const ur of userRoles) {
      for (const perm of ur.role?.permissions ?? []) keys.add(perm.key);
    }
    return keys;
  }

  // ─── Seeding ──────────────────────────────────────────────────────────────

  async seedSystemPermissions(): Promise<void> {
    for (const p of SYSTEM_PERMISSIONS) {
      const exists = await this.permRepo.findOne({ where: { key: p.key } });
      if (!exists) await this.permRepo.save(this.permRepo.create(p));
    }
  }

  async seedOwnerRoleForClinic(clinicId: string): Promise<Role> {
    let owner = await this.roleRepo.findOne({
      where: { name: 'Owner', clinicId },
      relations: ['permissions'],
    });
    const allPerms = await this.permRepo.find();
    if (owner) {
      // Self-heal: if new system permissions were added after this Owner
      // role was first created, make sure they get attached too — otherwise
      // an already-provisioned clinic's Owner role would silently drift out
      // of sync with the master permission list forever.
      if (owner.permissions.length !== allPerms.length) {
        owner.permissions = allPerms;
        owner = await this.roleRepo.save(owner);
      }
      return owner;
    }
    owner = this.roleRepo.create({
      name: 'Owner',
      description: 'Full access to all clinic features',
      clinicId,
      isSystem: true,
      permissions: allPerms,
    });
    return this.roleRepo.save(owner);
  }

  /**
   * Part 7 — Bootstrap a non-deletable "Independent Doctor" RBAC role
   * scoped to the doctor's own userId (clinicId = null context).
   * Created once at independent doctor signup.
   */
  async ensureIndependentDoctorRole(userId: string): Promise<void> {
    const DOCTOR_PERMS = [
      'dashboard.view',
      'appointment.view', 'appointment.create', 'appointment.update',
      'patient.view', 'patient.create', 'patient.update', 'patient.record',
      'billing.view', 'billing.manage', 'invoice.create', 'invoice.update',
      'records.view', 'records.create', 'records.update',
      'lab.view', 'lab.manage',
      'blood_test.view', 'blood_test.manage',
      'doctor.profile.manage', 'doctor.availability', 'doctor.invites',
      'doctor.bookings', 'doctor.reviews.respond',
      'intake.manage', 'consent.manage', 'telehealth.manage',
      'listing.manage', 'reviews.respond',
    ];

    // Independent doctors have no clinic, so this role is scoped by
    // doctorUserId instead of clinicId (clinicId is a uuid FK column and
    // can't hold a synthetic string key — see the doctorUserId doc comment
    // on the Role entity for why this was previously broken).
    let role = await this.roleRepo.findOne({
      where: { name: 'Independent Doctor', doctorUserId: userId },
      relations: ['permissions'],
    });

    if (!role) {
      const perms = await this.permRepo.find();
      const filtered = perms.filter(p => DOCTOR_PERMS.includes(p.key));
      role = await this.roleRepo.save(
        this.roleRepo.create({
          name: 'Independent Doctor',
          description: 'Default role for independent/freelance doctors',
          doctorUserId: userId,
          isSystem: true,
          permissions: filtered,
        }),
      );
    }

    // Assign role to user
    const existing = await this.userRoleRepo.findOne({ where: { userId, roleId: role.id } });
    if (!existing) {
      await this.userRoleRepo.save(this.userRoleRepo.create({ userId, roleId: role.id }));
    }
  }
}