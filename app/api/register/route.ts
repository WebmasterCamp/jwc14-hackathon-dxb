import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  disabilityCardNo?: string;
  otp?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { password, firstName, lastName, otp } = body;
  const nationalId = body.nationalId?.replace(/\D/g, "");
  const disabilityCardNo = body.disabilityCardNo?.trim() || null;

  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  if (!firstName?.trim() || !lastName?.trim())
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!nationalId || nationalId.length !== 13)
    return NextResponse.json({ error: "invalid_national_id" }, { status: 400 });
  if (!otp || otp.trim().length !== 6)
    return NextResponse.json({ error: "invalid_otp" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const ok = await verifyOtp(email, otp);
  if (!ok)
    return NextResponse.json({ error: "otp_failed" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nationalId, // NOTE: encrypt at rest in production
      disabilityCardNo,
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
