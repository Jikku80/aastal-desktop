import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, normalBalanceForType } from './entities/account.entity';
import { JournalLine } from './entities/journal-line.entity';
import { DEFAULT_COA } from './finance-seed.data';
import { CreateAccountDto, UpdateAccountDto } from './dto/finance.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class CoaService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(JournalLine) private lineRepo: Repository<JournalLine>,
    private auditService: AuditService,
  ) {}

  /**
   * Idempotent — safe to call on every clinic creation AND retroactively
   * for clinics that existed before Phase 9 shipped (see finance.controller
   * POST /finance/accounts/seed). Only inserts codes that don't exist yet,
   * so an admin's own custom accounts are never touched.
   */
  async seedDefaultCoa(clinicId: string): Promise<Account[]> {
    const existing = await this.accountRepo.find({ where: { clinicId } });
    const existingCodes = new Set(existing.map(a => a.code));
    const toInsert = DEFAULT_COA
      .filter(seed => !existingCodes.has(seed.code))
      .map(seed => this.accountRepo.create({
        clinicId,
        code: seed.code,
        name: seed.name,
        type: seed.type,
        normalBalance: normalBalanceForType(seed.type),
        description: seed.description,
        isSystem: true,
      }));
    if (!toInsert.length) return existing;
    const saved = await this.accountRepo.save(toInsert);
    return [...existing, ...saved];
  }

  async list(clinicId: string, params?: { type?: string; isActive?: string }): Promise<Account[]> {
    const where: any = { clinicId };
    if (params?.type) where.type = params.type;
    if (params?.isActive !== undefined) where.isActive = params.isActive !== 'false';
    return this.accountRepo.find({ where, order: { code: 'ASC' } });
  }

  async findOne(clinicId: string, id: string): Promise<Account> {
    const account = await this.accountRepo.findOne({ where: { id, clinicId } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async findByCode(clinicId: string, code: string): Promise<Account> {
    const account = await this.accountRepo.findOne({ where: { clinicId, code } });
    if (!account) throw new NotFoundException(`Account ${code} not found — has this clinic's default chart of accounts been seeded?`);
    return account;
  }

  async create(clinicId: string, dto: CreateAccountDto, userId: string): Promise<Account> {
    const clash = await this.accountRepo.findOne({ where: { clinicId, code: dto.code } });
    if (clash) throw new ConflictException(`Account code ${dto.code} is already in use`);
    const account = this.accountRepo.create({
      ...dto,
      clinicId,
      normalBalance: normalBalanceForType(dto.type),
      isSystem: false,
    });
    const saved = await this.accountRepo.save(account);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.CREATED,
      entityType: 'account' as AuditEntityType, entityId: saved.id,
      changes: { after: dto },
    });
    return saved;
  }

  async update(clinicId: string, id: string, dto: UpdateAccountDto, userId: string): Promise<Account> {
    const account = await this.findOne(clinicId, id);
    const before = { ...account };
    Object.assign(account, dto);
    const saved = await this.accountRepo.save(account);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.UPDATED,
      entityType: 'account' as AuditEntityType, entityId: id,
      changes: { before, after: dto },
    });
    return saved;
  }

  async remove(clinicId: string, id: string, userId: string): Promise<void> {
    const account = await this.findOne(clinicId, id);
    if (account.isSystem) {
      throw new BadRequestException('This is a default system account — deactivate it instead of deleting, so historical journal entries stay attributable.');
    }
    const used = await this.lineRepo.count({ where: { accountId: id } });
    if (used > 0) {
      throw new BadRequestException('This account has posted journal lines and cannot be deleted — deactivate it instead.');
    }
    await this.accountRepo.remove(account);
    await this.auditService.log({
      clinicId, userId, action: AuditAction.DELETED,
      entityType: 'account' as AuditEntityType, entityId: id,
      changes: { before: account },
    });
  }
}