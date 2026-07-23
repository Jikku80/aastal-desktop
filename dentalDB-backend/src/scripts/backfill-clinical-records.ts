/**
 * One-off backfill: walks every existing invoice and runs it through the
 * exact same ClinicalRecordsService.upsertFromBilling() logic the live
 * Billing modal uses, so historical invoices (created before that sync
 * existed, or during the period the route was 404ing) get their clinical
 * record created/updated retroactively.
 *
 * Safe to re-run: upsertFromBilling() is idempotent per invoiceId — an
 * invoice that already has a matching visit entry is skipped, so running
 * this twice (or after new invoices land) never creates duplicate visits.
 *
 * Usage (from dentalDB-backend/):
 *   npx ts-node -r tsconfig-paths/register src/scripts/backfill-clinical-records.ts
 *
 * Flags:
 *   --dry-run        Don't write anything, just report what would happen.
 *   --clinic=<id>     Only process invoices for this clinicId.
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { ClinicalRecordsService } from '../clinical-records/clinical-records.service';

// Invoices in these statuses never represented a real visit — skip them.
const EXCLUDED_STATUSES = new Set([InvoiceStatus.CANCELLED]);

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const clinicArg = args.find(a => a.startsWith('--clinic='));
  const onlyClinicId = clinicArg ? clinicArg.split('=')[1] : undefined;

  console.log(`Starting clinical-records backfill${dryRun ? ' (DRY RUN — no writes)' : ''}${onlyClinicId ? ` for clinic ${onlyClinicId}` : ''}...`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const invoiceRepo = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    const clinicalRecordsService = app.get(ClinicalRecordsService);

    const qb = invoiceRepo.createQueryBuilder('inv').orderBy('inv.createdAt', 'ASC');
    if (onlyClinicId) qb.where('inv.clinicId = :clinicId', { clinicId: onlyClinicId });
    const invoices = await qb.getMany();

    console.log(`Found ${invoices.length} invoice(s) to scan.`);

    let created = 0, updated = 0, skippedNoService = 0, skippedExcludedStatus = 0, skippedNoClinic = 0, errors = 0;

    for (const inv of invoices) {
      if (EXCLUDED_STATUSES.has(inv.status)) { skippedExcludedStatus++; continue; }
      if (!inv.clinicId) { skippedNoClinic++; continue; } // independent-doctor invoices aren't clinic-scoped

      // A line is a "service" if it isn't a product / blood test / lab work line —
      // mirrors how InvoiceModal.tsx separates serviceLines from the rest.
      const serviceItems = (inv.items || []).filter(
        it => !it.productId && !it.bloodTestId && !it.labWorkId,
      );
      const services = serviceItems.map(it => (it.description || '').trim()).filter(Boolean);
      if (services.length === 0) { skippedNoService++; continue; }

      const doctorId = serviceItems.find(it => it.doctorId)?.doctorId || undefined;

      try {
        if (dryRun) {
          console.log(`[dry-run] would sync invoice ${inv.invoiceNumber} (${inv.id}) — patient ${inv.patientId}, ${services.length} service(s)`);
          continue;
        }

        const before = await clinicalRecordsService.findLatestForPatient(inv.clinicId, inv.patientId);
        const alreadySynced = !!before?.visits?.some((v: any) => v.invoiceId === inv.id);

        await clinicalRecordsService.upsertFromBilling(inv.clinicId, {
          patientId: inv.patientId,
          branchId: inv.branchId || undefined,
          appointmentId: inv.appointmentId || undefined,
          doctorId,
          invoiceId: inv.id,
          services,
          visitDate: inv.createdAt.toISOString(),
        });

        if (alreadySynced) {
          // upsertFromBilling no-oped due to the idempotency guard.
        } else if (!before) {
          created++;
        } else {
          updated++;
        }
      } catch (e: any) {
        errors++;
        console.error(`Failed on invoice ${inv.id}: ${e?.message ?? e}`);
      }
    }

    console.log('\nBackfill complete.');
    console.log(`  Records created:              ${created}`);
    console.log(`  Records updated (new visit):  ${updated}`);
    console.log(`  Skipped (no service lines):   ${skippedNoService}`);
    console.log(`  Skipped (cancelled invoice):  ${skippedExcludedStatus}`);
    console.log(`  Skipped (no clinicId):        ${skippedNoClinic}`);
    console.log(`  Errors:                       ${errors}`);
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });