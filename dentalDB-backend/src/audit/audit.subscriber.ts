import {
  EntitySubscriberInterface, EventSubscriber,
  InsertEvent, UpdateEvent, RemoveEvent, DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditAction, AuditEntityType } from './entities/audit-log.entity';
import { Invoice }        from '../billing/entities/invoice.entity';
import { Patient }        from '../patients/entities/patient.entity';
import { Appointment }    from '../appointments/entities/appointment.entity';
import { User }           from '../users/entities/user.entity';
import { Product }        from '../inventory/entities/product.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { LabWork } from '../lab-work/entities/lab-work.entity';

const ENTITY_MAP = new Map<Function, AuditEntityType>([
  [Invoice,        AuditEntityType.INVOICE],
  [Patient,        AuditEntityType.PATIENT],
  [Appointment,    AuditEntityType.APPOINTMENT],
  [User,           AuditEntityType.USER],
  [Product,        AuditEntityType.PRODUCT],
  [ClinicalRecord, AuditEntityType.CLINICAL_RECORD],
  [LabWork,        AuditEntityType.CLINICAL_RECORD],
]);

/** Extract clinicId from any entity that has it */
function getClinicId(entity: any): string | undefined {
  return entity?.clinicId;
}

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private auditService: AuditService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    // Return undefined to listen to ALL entities — we filter in the hooks
    return undefined as any;
  }

  afterInsert(event: InsertEvent<any>): void {
    const entityType = ENTITY_MAP.get(event.metadata.target as Function);
    if (!entityType) return;
    const entity    = event.entity;
    const clinicId  = getClinicId(entity);
    if (!clinicId) return;

    setImmediate(() =>
      this.auditService.log({
        clinicId,
        action:     AuditAction.CREATED,
        entityType,
        entityId:   entity.id,
        changes:    { after: this.auditService.sanitize(entity) },
      })
    );
  }

  afterUpdate(event: UpdateEvent<any>): void {
    const entityType = ENTITY_MAP.get(event.metadata.target as Function);
    if (!entityType) return;
    const entity   = event.entity as any;
    const databaseEntity = event.databaseEntity as any;
    const clinicId = getClinicId(entity) ?? getClinicId(databaseEntity);
    if (!clinicId) return;

    const before = databaseEntity ? this.auditService.sanitize(databaseEntity) : {};
    const after  = entity         ? this.auditService.sanitize(entity)         : {};
    const changes = this.auditService.diff(before, after);

    setImmediate(() =>
      this.auditService.log({
        clinicId,
        action:    AuditAction.UPDATED,
        entityType,
        entityId:  entity?.id ?? databaseEntity?.id,
        changes,
      })
    );
  }

  afterRemove(event: RemoveEvent<any>): void {
    const entityType = ENTITY_MAP.get(event.metadata.target as Function);
    if (!entityType) return;
    const entity   = event.entity as any;
    const clinicId = getClinicId(entity);
    if (!clinicId) return;

    setImmediate(() =>
      this.auditService.log({
        clinicId,
        action:    AuditAction.DELETED,
        entityType,
        entityId:  entity?.id,
        changes:   { before: this.auditService.sanitize(entity) },
      })
    );
  }
}
