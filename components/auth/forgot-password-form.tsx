"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "./otp-input";
import { Icons } from "@/components/icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;
const KNOWN_ERRORS = new Set([
  "user_not_found",
  "invalid_email",
  "weak_password",
  "invalid_otp",
  "otp_failed",
]);

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function errMsg(code?: string) {
    return t(`errors.${code && KNOWN_ERRORS.has(code) ? code : "generic"}`);
  }

  async function sendCode() {
    setError(null);
    if (!EMAIL_RE.test(email)) return setError(errMsg("invalid_email"));
    setLoading(true);
    try {
      const res = await fetch("/api/password/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(errMsg(data.error));
      setDevCode(data.devCode ?? null);
      setResendIn(RESEND_SECONDS);
      setStep(2);
    } catch {
      setError(errMsg());
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setError(null);
    if (otp.length !== 6) return setError(errMsg("invalid_otp"));
    if (password.length < 8) return setError(errMsg("weak_password"));
    setLoading(true);
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(errMsg(data.error));
      setStep(3);
    } catch {
      setError(errMsg());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-[420px] p-8">
      <h1 className="text-center text-2xl font-extrabold">{t("title")}</h1>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">{t("step1Heading")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button className="w-full" onClick={sendCode} disabled={loading}>
            {loading ? "…" : t("send")}
            <Icons.next className="size-5" aria-hidden />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-5">
          <p className="text-sm">
            {t("sentTo")} <span className="font-semibold">{email}</span>
          </p>

          <div className="space-y-2">
            <Label>{t("otpLabel")}</Label>
            <OtpInput value={otp} onChange={setOtp} ariaLabel={t("otpLabel")} />
          </div>

          {devCode && (
            <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm">
              {t("devCode")} <span className="font-mono font-bold">{devCode}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>

          {error && <FieldError>{error}</FieldError>}

          <div className="text-center text-sm">
            {resendIn > 0 ? (
              <span className="text-muted-foreground">
                {t("resendIn", { seconds: resendIn })}
              </span>
            ) : (
              <button
                type="button"
                onClick={sendCode}
                className="font-semibold text-primary hover:underline"
              >
                {t("resend")}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              <Icons.back className="size-5" aria-hidden />
              {t("back")}
            </Button>
            <Button
              className="flex-1"
              onClick={reset}
              disabled={loading || otp.length !== 6}
            >
              <Icons.confirm className="size-5" aria-hidden />
              {loading ? "…" : t("submit")}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Icons.confirm className="size-7" aria-hidden />
          </span>
          <p className="font-semibold">{t("success")}</p>
          <Button className="w-full" onClick={() => router.push("/login")}>
            {t("backToLogin")}
          </Button>
        </div>
      )}

      {step !== 3 && (
        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <Icons.back className="size-4" aria-hidden />
            {t("backToLogin")}
          </Link>
        </div>
      )}
    </Card>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {children}
    </p>
  );
}
