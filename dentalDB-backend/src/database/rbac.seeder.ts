import { DataSource } from 'typeorm';
import { RbacService } from '../rbac/rbac.service';
import { Clinic }      from '../clinics/entities/clinic.entity';
import { UserRole }    from '../rbac/entities/user-role.entity';
import { User }        from '../users/entities/user.entity';
import { Role }        from '../rbac/entities/role.entity';
import { Permission }  from '../rbac/entities/permission.entity';

/**
 * One-time migration seeder.
 * Run ONCE after the 1712000000000-CreateRbacTables migration:
 *
 *   npx ts-node -r tsconfig-paths/register src/database/rbac.seeder.ts
 *
 * Safe to run again — all operations are idempotent.
 */
async function seed() {
  const ds = new DataSource({
    type:        'postgres',
    url:         process.env.DATABASE_URL,
    entities:    [User, Role, Permission, UserRole, Clinic],
    synchronize: false,
    logging:     true,
  });

  await ds.initialize();

  const rbac = new RbacService(
    ds.getRepository(Role),
    ds.getRepository(Permission),
    ds.getRepository(UserRole),
    ds.getRepository(User),
  );

  console.log('→ Seeding system permissions…');
  await rbac.seedSystemPermissions();
  console.log('✓ Done');

  const clinics = await ds.getRepository(Clinic).find();
  console.log(`→ Creating Owner roles for ${clinics.length} clinic(s)…`);

  for (const clinic of clinics) {
    const ownerRole = await rbac.seedOwnerRoleForClinic(clinic.id);
    console.log(`  ✓ Owner role for "${clinic.name}"`);

    const owners = await ds.getRepository(User).find({
      where: [
        { clinicId: clinic.id, role: 'owner' as any },
        { clinicId: clinic.id, role: 'super_admin' as any },
      ],
    });

    for (const user of owners) {
      const already = await ds.getRepository(UserRole).findOne({
        where: { userId: user.id, roleId: ownerRole.id },
      });
      if (!already) {
        await ds.getRepository(UserRole).save(
          ds.getRepository(UserRole).create({ userId: user.id, roleId: ownerRole.id }),
        );
        console.log(`    ✓ Assigned Owner role → ${user.email}`);
      }
    }
  }

  console.log('\n✅ RBAC seeding complete.');
  await ds.destroy();
}

seed().catch((err) => { console.error(err); process.exit(1); });
