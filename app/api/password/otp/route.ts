import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { issueOtp } from "@/lib/otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // NOTE: this dev build reveals whether an account exists so testers can
  // proceed. In production, return { ok: true } regardless to avoid leaking.
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const { devCode } = await issueOtp(email);
  return NextResponse.json({ ok: true, devCode });
}
