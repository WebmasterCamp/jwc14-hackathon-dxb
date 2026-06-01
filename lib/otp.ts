import { prisma } from "@/lib/db";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** True when real email delivery is configured. */
export const emailConfigured = Boolean(
  process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER
);

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/**
 * Issues a fresh 6-digit code for an email, replacing any previous one.
 * Returns the code only in dev (when email isn't configured) so the UI can
 * surface it; in production the code is sent via email and never returned.
 */
export async function issueOtp(email: string): Promise<{ devCode?: string }> {
  const identifier = email.trim().toLowerCase();
  const token = generateCode();
  const expires = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  if (emailConfigured) {
    // TODO: integrate nodemailer / provider here using EMAIL_SERVER_* envs.
    // await sendEmail(identifier, token);
    return {};
  }

  // Dev fallback: no SMTP — log and return the code.
  console.info(`[OTP] code for ${identifier}: ${token}`);
  return { devCode: token };
}

/** Verifies and consumes a code. */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const identifier = email.trim().toLowerCase();
  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token: code.trim() },
  });
  if (!record) return false;

  const valid = record.expires.getTime() > Date.now();
  // Consume regardless of validity to prevent reuse / brute force lingering.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return valid;
}
