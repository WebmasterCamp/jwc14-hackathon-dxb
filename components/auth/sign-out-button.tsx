"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

export function SignOutButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
      <Icons.close className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
