import {
  Controller, Get, Post, Body, Param, Query, NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseAsNepalTime } from '../common/utils/timezone.util';
import { WebsiteBuilderService } from './website-builder.service';
import { ClinicWebsite } from './entities/clinic-website.entity';
import { ContactMessage } from './entities/contact-message.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branch/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { WebsiteOrder } from './entities/website-order.entity';
import { Product } from '../inventory/entities/product.entity';
import { ClinicService } from '../services/entities/service.entity';
import { ShiftResolver } from '../shifts/shift-resolver.service';
import { findOrCreatePatient } from '../patients/patient-dedup.util';

@ApiTags('Website Builder (Public)')
@Controller('website-builder/public')
export class WebsiteBuilderPublicController {
  constructor(
    private readonly service: WebsiteBuilderService,
    @InjectRepository(ClinicWebsite)  private websiteRepo:  Repository<ClinicWebsite>,
    @InjectRepository(ContactMessage) private contactRepo:  Repository<ContactMessage>,
    @InjectRepository(WebsiteOrder)   private orderRepo:    Repository<WebsiteOrder>,
    @InjectRepository(Product)        private productRepo:  Repository<Product>,
    @InjectRepository(Clinic)         private clinicRepo:   Repository<Clinic>,
    @InjectRepository(Branch)         private branchRepo:   Repository<Branch>,
    @InjectRepository(User)           private userRepo:     Repository<User>,
    @InjectRepository(Appointment)    private aptRepo:      Repository<Appointment>,
    @InjectRepository(Patient)        private patientRepo:  Repository<Patient>,
    @InjectRepository(Notification)   private notifRepo:    Repository<Notification>,
    @InjectRepository(ClinicService)  private serviceRepo:  Repository<ClinicService>,
    private readonly notifGateway: NotificationsGateway,
    private readonly shiftResolver: ShiftResolver,
  ) {}

  // ── Shared helper: resolve site by subdomain OR customDomain ─────────────────
  // NOTE: this is used by every public route (including branches/doctors/
  // slots/book, which the live builder preview also calls while a site is
  // still a draft) so it deliberately does NOT enforce isPublished here —
  // that check belongs only on the full-page `getPublic` route below, which
  // is what real subdomain/custom-domain visitors hit. Gating it here too
  // would break the "Live Preview" pane for any clinic that hasn't hit
  // Publish yet.
  private async resolveSite(identifier: string): Promise<ClinicWebsite> {
    const normalized = identifier.replace(/^www\./, '');
    const site = await this.websiteRepo.findOne({
      where: [
        { subdomain:    normalized },
        { customDomain: normalized },
        { customDomain: `www.${normalized}` },
      ],
      relations: ['clinic'],
    });
    if (!site) throw new NotFoundException('Website not found');
    return site;
  }

  /** Active branches for a clinic, cheapest-first (used to auto-resolve a single branch). */
  private async getActiveBranches(clinicId: string): Promise<Branch[]> {
    return this.branchRepo.find({ where: { clinicId, isActive: true }, order: { name: 'ASC' } });
  }

  /** Doctor-role staff for a resolved branch (falls back to all clinic doctors when no branch given). */
  private async getBranchDoctors(clinicId: string, branchId?: string): Promise<User[]> {
    let users: User[] = [];
    if (branchId) {
      const branch = await this.branchRepo.findOne({
        where: { id: branchId, clinicId, isActive: true },
        relations: ['staff'],
      });
      users = branch?.staff ?? [];
    } else {
      users = await this.userRepo.find({ where: { clinicId, isActive: true } });
    }
    return users.filter(u => ['owner', 'doctor', 'dentist'].includes(u.role));
  }

  // ── NOTE: specific sub-routes MUST be declared before /:identifier ────────────
  // NestJS matches routes in declaration order; a leading /:param would swallow
  // all paths that follow it. We put all /:subdomain/<action> routes first.

  // ── GET /public/:subdomain/available-slots ────────────────────────────────────
  @Get(':subdomain/available-slots')
  getAvailableSlots(
    @Param('subdomain') subdomain: string,
    @Query('branchId')  branchId?: string,
    @Query('doctorId')  doctorId?: string,
  ) {
    return this.service.getAvailableSlots(subdomain, branchId, doctorId);
  }

  // ── GET /public/:subdomain/branches ──────────────────────────────────────────
  @Get(':subdomain/branches')
  async getBranches(@Param('subdomain') subdomain: string) {
    const site = await this.resolveSite(subdomain);
    const branches = await this.branchRepo.find({
      where: { clinicId: site.clinicId, isActive: true },
    });
    return branches.map(b => ({
      id:        b.id,
      name:      b.name,
      address:   b.address,
      phone:     b.phone,
      email:     b.email,
      city:      (b as any).city    || null,
      state:     (b as any).state   || null,
      country:   (b as any).country || null,
      // Branch entity columns are `latitude`/`longitude` (decimal) — not
      // `lat`/`lng`. The previous mapping always returned null here, which
      // silently broke the website builder's map section (it could never
      // plot real branch coordinates from this public endpoint).
      latitude:  b.latitude  != null ? Number(b.latitude)  : null,
      longitude: b.longitude != null ? Number(b.longitude) : null,
    }));
  }

  // ── GET /public/:subdomain/doctors?branchId=&date=YYYY-MM-DD ──────────────────
  // `date` is optional. When given AND the clinic actually uses the Shift
  // module, the list is narrowed to doctors who are resolved as "working"
  // that day (via ShiftResolver), and each doctor gets a `shift` block with
  // their start/end time. When the clinic has never configured any shifts
  // (hasAnyShiftConfig === false), or no `date` was passed, every doctor of
  // the branch/clinic is returned unfiltered — this is the explicit
  // "if not, show all doctors of the clinic" fallback.
  @Get(':subdomain/doctors')
  async getDoctors(
    @Param('subdomain') subdomain: string,
    @Query('branchId')  branchId?: string,
    @Query('date')      date?: string,
  ) {
    const site = await this.resolveSite(subdomain);
    const doctors = await this.getBranchDoctors(site.clinicId, branchId);

    const base = doctors.map(u => ({
      id:             u.id,
      name:           `${u.firstName} ${u.lastName}`.trim(),
      specialization: (u as any).specialization || '',
      avatar:         (u as any).avatar || null,
      bio:            (u as any).bio || '',
      experience:     (u as any).experience || null,
      education:      (u as any).education || null,
      shift:          null as { startTime: string; endTime: string; name: string } | null,
    }));

    if (!date) return base;

    const usesShiftModule = await this.shiftResolver.hasAnyShiftConfig(site.clinicId);
    if (!usesShiftModule) return base;

    const withShifts = await Promise.all(base.map(async d => {
      const resolved = await this.shiftResolver.resolveUserShift(d.id, site.clinicId, date);
      if (resolved.type !== 'working' || !resolved.shift) return null;
      return {
        ...d,
        shift: {
          name:      resolved.shift.name,
          startTime: resolved.shift.startTime,
          endTime:   resolved.shift.endTime,
        },
      };
    }));

    const working = withShifts.filter((d): d is NonNullable<typeof d> => d !== null);
    // If shift data exists for the clinic but genuinely nobody is scheduled
    // that day, don't show an empty/broken booking screen — fall back to
    // the unfiltered list rather than a dead end.
    return working.length > 0 ? working : base;
  }

  // ── GET /public/:subdomain/services ───────────────────────────────────────────
  @Get(':subdomain/services')
  async getServices(
    @Param('subdomain') subdomain: string,
    @Query('active')    activeOnly?: string,
  ) {
    const site = await this.resolveSite(subdomain);

    const where: any = { clinicId: site.clinicId };
    if (activeOnly !== 'false') where.isActive = true;

    const services = await this.serviceRepo.find({
      where,
      order: { name: 'ASC' },
    });

    return services.map(s => ({
      id:          s.id,
      name:        s.name,
      description: s.description || null,
      price:       Number(s.price),
      duration:    s.duration,
      isActive:    s.isActive,
      category:    (s as any).category || null,
      imageUrl:    (s as any).imageUrl || null,
    }));
  }

  // ── GET /public/:subdomain/opening-hours ──────────────────────────────────────
  @Get(':subdomain/opening-hours')
  async getOpeningHours(@Param('subdomain') subdomain: string) {
    const site = await this.resolveSite(subdomain);
    const clinic = site.clinic;

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const workingHours = (clinic as any).workingHours || {};

    // Normalize into consistent shape
    const hours = DAYS.map(day => {
      const entry = workingHours[day];
      if (!entry) {
        return { day, isOpen: false, start: null, end: null };
      }
      return {
        day,
        isOpen: entry !== null && entry !== false,
        start:  entry?.start || entry?.open  || null,
        end:    entry?.end   || entry?.close || null,
      };
    });

    return {
      clinicName:  clinic.name,
      timezone:    (clinic as any).timezone || 'UTC',
      hours,
      // Also expose raw for flexibility
      raw: workingHours,
    };
  }

  // ── GET /public/:subdomain/clinic-info ────────────────────────────────────────
  @Get(':subdomain/clinic-info')
  async getClinicInfo(@Param('subdomain') subdomain: string) {
    const site = await this.resolveSite(subdomain);
    const c = site.clinic;
    return {
      id:           c.id,
      name:         c.name,
      phone:        c.phone,
      email:        c.email,
      address:      c.address,
      city:         c.city,
      logo:         c.logo,
      workingHours: c.workingHours,
      timezone:     (c as any).timezone || null,
      website:      (c as any).website  || null,
    };
  }

  // ── GET /public/:subdomain/products ──────────────────────────────────────────
  @Get(':subdomain/products')
  async getPublicProducts(
    @Param('subdomain') subdomain: string,
    @Query('branchIds') branchIdsParam?: string,
    @Query('category')  category?: string,
  ) {
    const site = await this.resolveSite(subdomain);

    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId: site.clinicId })
      .andWhere('p.isActive = true')
      .orderBy('p.name', 'ASC');

    if (branchIdsParam) {
      const branchIds = branchIdsParam
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean);
      if (branchIds.length > 0) {
        qb.andWhere('(p.branchId IN (:...branchIds) OR p.branchId IS NULL)', { branchIds });
      }
    }

    if (category) {
      qb.andWhere('p.category = :category', { category });
    }

    const products = await qb.getMany();

    return products.map(p => ({
      id:            p.id,
      name:          p.name,
      description:   p.description,
      price:         p.price,
      stockQuantity: p.stockQuantity,
      unit:          p.unit,
      sku:           p.sku,
      branchId:      p.branchId || null,
      category:      (p as any).category || null,
      inStock:       p.stockQuantity > 0,
      imageUrl:      p.imageUrl || null,
    }));
  }

  // ── POST /public/:subdomain/contact ───────────────────────────────────────────
  @Post(':subdomain/contact')
  async submitContact(
    @Param('subdomain') subdomain: string,
    @Body() dto: {
      name:     string;
      email:    string;
      phone?:   string;
      subject?: string;
      message:  string;
    },
  ) {
    if (!dto.name?.trim())    throw new BadRequestException('Name is required');
    if (!dto.email?.trim())   throw new BadRequestException('Email is required');
    if (!dto.message?.trim()) throw new BadRequestException('Message is required');

    const site = await this.resolveSite(subdomain);

    const msg = this.contactRepo.create({
      clinicId:    site.clinicId,
      senderName:  dto.name.trim(),
      senderEmail: dto.email.trim(),
      senderPhone: dto.phone?.trim() || null,
      subject:     dto.subject?.trim() || null,
      body:        dto.message.trim(),
    });
    await this.contactRepo.save(msg);

    return { success: true, message: 'Your message has been sent successfully.' };
  }

  // ── POST /public/:subdomain/book ──────────────────────────────────────────────
  @Post(':subdomain/book')
  async book(
    @Param('subdomain') subdomain: string,
    @Body() dto: {
      patientName:  string;
      patientPhone: string;
      patientEmail: string;
      doctorId:     string;
      branchId:     string;
      scheduledAt:  string;
      serviceId?:   string;
      notes?:       string;
    },
  ) {
    const site = await this.resolveSite(subdomain);

    if (!dto.patientName?.trim())  throw new BadRequestException('Patient name is required');
    if (!dto.patientPhone?.trim()) throw new BadRequestException('Phone number is required');
    if (!dto.scheduledAt)          throw new BadRequestException('Appointment date/time is required');

    const scheduledAt = parseAsNepalTime(dto.scheduledAt);
    const endsAt      = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
    const dateKey     = dto.scheduledAt.split('T')[0];

    // ── Resolve branch ───────────────────────────────────────────────────────
    // Several booking widgets (quick-consult, sidebar-card, etc.) don't show
    // a branch picker at all — if the clinic only has one active branch we
    // route straight there; only when there genuinely is more than one do we
    // require the caller to have supplied one.
    let branchId = dto.branchId || undefined;
    if (!branchId) {
      const activeBranches = await this.getActiveBranches(site.clinicId);
      if (activeBranches.length === 1) {
        branchId = activeBranches[0].id;
      } else if (activeBranches.length > 1) {
        throw new BadRequestException('Please select a branch to continue booking.');
      }
      // 0 active branches → leave branchId undefined; Appointment.branchId is nullable.
    }

    // ── Resolve doctor ───────────────────────────────────────────────────────
    // Appointment.dentistId is NOT NULL at the DB level, so a booking widget
    // that never collected a doctor (or sent an empty string) must not be
    // allowed to fall straight through to a raw insert failure.
    let doctorId = dto.doctorId || undefined;
    if (!doctorId) {
      const candidates = await this.getBranchDoctors(site.clinicId, branchId);
      if (candidates.length === 0) {
        throw new BadRequestException('No doctors are available for booking at this time.');
      }
      if (candidates.length === 1) {
        doctorId = candidates[0].id;
      } else {
        // Prefer whoever is actually on shift for the requested date, if the
        // clinic uses the Shift module; otherwise fall back to the first
        // active doctor so the booking still succeeds.
        const usesShiftModule = await this.shiftResolver.hasAnyShiftConfig(site.clinicId);
        if (usesShiftModule) {
          for (const c of candidates) {
            const resolved = await this.shiftResolver.resolveUserShift(c.id, site.clinicId, dateKey);
            if (resolved.type === 'working') { doctorId = c.id; break; }
          }
        }
        if (!doctorId) doctorId = candidates[0].id;
      }
    }

    // ── Resolve service (optional — validated only if supplied) ────────────────
    let serviceId: string | undefined = undefined;
    if (dto.serviceId) {
      const svc = await this.serviceRepo.findOne({
        where: { id: dto.serviceId, clinicId: site.clinicId },
      });
      if (svc) serviceId = svc.id;
    }

    const nameParts = (dto.patientName || 'Guest').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Guest';
    const lastName  = nameParts.slice(1).join(' ') || '';

    // Same "same patient?" rule used everywhere else a patient can be
    // created (dashboard, walk-in queue): match on name + phone
    // case-insensitively before creating a new record, so a patient who
    // books through the website twice doesn't end up duplicated.
    const { patient } = await findOrCreatePatient(this.patientRepo, site.clinicId, {
      branchId:  branchId || undefined,
      firstName,
      lastName,
      phone:     dto.patientPhone || undefined,
      email:     dto.patientEmail || undefined,
    } as any);

    const apt = this.aptRepo.create({
      clinicId:    site.clinicId,
      branchId:    branchId   || undefined,
      dentistId:   doctorId,
      serviceId:   serviceId  || undefined,
      patientId:   patient.id,
      scheduledAt,
      endsAt,
      notes:       dto.notes || '',
      status:      AppointmentStatus.SCHEDULED,
    } as any);

    const saved = await this.aptRepo.save(apt) as unknown as Appointment;

    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (doctor) {
      const dateStr  = scheduledAt.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      await this.notifRepo.save(
        this.notifRepo.create({
          clinicId:  site.clinicId,
          userId:    doctorId,
          branchId:  branchId || undefined,
          type:      NotificationType.APPOINTMENT_CREATED,
          title:     'New Appointment Booked',
          body:      `${fullName} has booked an appointment on ${dateStr}.`,
          entityId:  (saved as any).id,
          link:      '/dashboard/appointments',
        }),
      );
    }

    return {
      success:     true,
      message:     'Appointment request received. We will confirm shortly.',
      appointment: {
        id:          (saved as any).id,
        doctorId,
        branchId,
        scheduledAt: dto.scheduledAt,
        patientName: dto.patientName,
      },
    };
  }

  // ── POST /public/:subdomain/orders ────────────────────────────────────────────
  @Post(':subdomain/orders')
  async placeOrder(
    @Param('subdomain') subdomain: string,
    @Body() dto: {
      customerName:    string;
      customerPhone:   string;
      customerAddress: string;
      orderNotes?:     string;
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    const site = await this.resolveSite(subdomain);

    if (!dto.customerName || !dto.customerPhone || !dto.customerAddress) {
      throw new BadRequestException('Customer name, phone, and address are required');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of dto.items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        throw new BadRequestException('Invalid item data');
      }
      const product = await this.productRepo.findOne({
        where: { id: item.productId, clinicId: site.clinicId, isActive: true },
      });
      if (!product) {
        throw new BadRequestException(`Product not found: ${item.productId}`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }
      const subtotal = Number(product.price) * item.quantity;
      orderItems.push({
        productId:   product.id,
        productName: product.name,
        price:       Number(product.price),
        quantity:    item.quantity,
        subtotal,
      });
      totalAmount += subtotal;
    }

    const order = this.orderRepo.create({
      clinicId:        site.clinicId,
      customerName:    dto.customerName,
      customerPhone:   dto.customerPhone,
      customerAddress: dto.customerAddress,
      orderNotes:      dto.orderNotes,
      items:           orderItems,
      totalAmount,
      paymentMethod:   'cod',
      status:          'pending',
    });

    const saved = await this.orderRepo.save(order);

    const itemSummary = orderItems
      .map((i: any) => `${i.productName} x${i.quantity}`)
      .join(', ');
    const notif = this.notifRepo.create({
      clinicId: site.clinicId,
      type:     NotificationType.SYSTEM,
      title:    `🛒 New Order — ${dto.customerName}`,
      body:     `${itemSummary} · NPR ${totalAmount.toLocaleString()}`,
      link:     `/website-orders`,
      entityId: saved.id,
    });
    const savedNotif = await this.notifRepo.save(notif);
    this.notifGateway.emitToClinic(site.clinicId, 'notification', savedNotif);

    return {
      success:  true,
      message:  'Order placed successfully! We will contact you to confirm.',
      orderId:  saved.id,
    };
  }

  // ── GET /public/:identifier ───────────────────────────────────────────────────
  // IMPORTANT: This catch-all MUST be the LAST route in this controller.
  // This is the endpoint real subdomain (site/[subdomain]) and custom-domain
  // (site/custom-domain) visitors hit — unlike resolveSite()'s other public
  // callers (branches/doctors/book/etc., which the authenticated builder
  // preview also relies on pre-publish), an unpublished draft must NOT be
  // servable here or a clinic's work-in-progress site would leak publicly
  // before they ever hit "Publish".
  @Get(':identifier')
  async getPublic(@Param('identifier') identifier: string) {
    const site = await this.resolveSite(identifier);
    if (!site.isPublished) throw new NotFoundException('Website not found or not published');
    const branches = await this.branchRepo.find({
      where: { clinicId: site.clinicId, isActive: true },
    });
    return {
      website: {
        id:             site.id,
        pages:          site.pages,
        globalSettings: site.globalSettings,
        theme:          site.theme,
        seo:            site.seo,
        subdomain:      site.subdomain,
        customDomain:   site.customDomain,
        isPublished:    site.isPublished,
      },
      clinic: {
        id:           site.clinic.id,
        name:         site.clinic.name,
        phone:        site.clinic.phone,
        email:        site.clinic.email,
        address:      site.clinic.address,
        city:         site.clinic.city,
        logo:         site.clinic.logo,
        workingHours: site.clinic.workingHours,
        timezone:     (site.clinic as any).timezone || null,
      },
      branches: branches.map(b => ({
        id:      b.id,
        name:    b.name,
        address: b.address,
        phone:   b.phone,
        email:   b.email,
      })),
    };
  }
}