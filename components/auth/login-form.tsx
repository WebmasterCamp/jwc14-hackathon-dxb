"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { Icons } from "@/components/icons";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("invalid"));
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-[420px] p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-2xl font-extrabold text-primary-foreground">
          R
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "…" : t("submit")}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton label={t("google")} />
        </>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          {t("forgot")}
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          {t("noAccount")}
          <Icons.next className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
