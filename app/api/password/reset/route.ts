import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; otp?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const { otp, password } = body;

  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!otp || otp.trim().length !== 6)
    return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "weak_password" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const ok = await verifyOtp(email, otp);
  if (!ok) return NextResponse.json({ error: "otp_failed" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
