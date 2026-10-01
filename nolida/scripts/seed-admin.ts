import bcrypt from "bcryptjs";
import { query } from "@/lib/db/client";
import * as usersRepo from "@/lib/server/repositories/users.repo";
import * as profilesRepo from "@/lib/server/repositories/profiles.repo";

async function main() {
  const email = process.env.NOLIDA_ADMIN_EMAIL ?? "admin@nolida.local";
  const password = process.env.NOLIDA_ADMIN_PASSWORD ?? "AdminPass123!";

  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    await query(
      `UPDATE users
       SET role = 'ADMIN', status = 'ACTIVE', email_verified_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [existing.id]
    );
    console.log(`Admin user ready: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await usersRepo.create({ email, passwordHash });
  await profilesRepo.create({
    userId: user.id,
    username: "nolida-admin",
    fullName: "noLIDA Admin",
  });

  await query(
    `UPDATE users
     SET role = 'ADMIN', status = 'ACTIVE', email_verified_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  console.log(`Created admin user: ${email}`);
}

main().catch((error: unknown) => {
  console.error("Failed to seed admin user.", error);
  process.exitCode = 1;
});
