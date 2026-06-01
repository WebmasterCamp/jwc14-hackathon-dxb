"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons, type LucideIcon } from "@/components/icons";
import { PresetPhrases } from "./preset-phrases";
import { CameraTranslate } from "./camera-translate";
import { cn } from "@/lib/utils";

type View =
  | "context"
  | "emergencyMenu"
  | "emergencyPreset"
  | "everydayCategories"
  | "camera";

type CategoryKey =
  | "hospital"
  | "grocery"
  | "restaurant"
  | "transport"
  | "school"
  | "other";

const CATEGORIES: { key: CategoryKey; Icon: LucideIcon }[] = [
  { key: "hospital", Icon: Icons.hospital },
  { key: "grocery", Icon: Icons.grocery },
  { key: "restaurant", Icon: Icons.restaurant },
  { key: "transport", Icon: Icons.transport },
  { key: "school", Icon: Icons.school },
  { key: "other", Icon: Icons.other },
];

function BackBar({ onBack }: { onBack: () => void }) {
  const t = useTranslations("app");
  return (
    <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}>
      <Icons.back className="size-5" aria-hidden />
      {t("back")}
    </Button>
  );
}

export function HomeFlow() {
  const t = useTranslations("app");
  const [view, setView] = useState<View>("context");
  const [mode, setMode] = useState<"emergency" | "everyday">("emergency");
  const [contextTag, setContextTag] = useState<string | null>(null);

  // ---- Camera ----
  if (view === "camera") {
    return (
      <div>
        <BackBar
          onBack={() =>
            setView(mode === "emergency" ? "emergencyMenu" : "everydayCategories")
          }
        />
        <CameraTranslate
          mode={mode}
          contextTag={contextTag}
          onClose={() =>
            setView(mode === "emergency" ? "emergencyMenu" : "everydayCategories")
          }
        />
      </div>
    );
  }

  // ---- Emergency: preset phrases ----
  if (view === "emergencyPreset") {
    return (
      <div className="mx-auto max-w-2xl">
        <BackBar onBack={() => setView("emergencyMenu")} />
        <h2 className="mb-4 text-xl font-extrabold">{t("preset.title")}</h2>
        <PresetPhrases />
      </div>
    );
  }

  // ---- Emergency submenu ----
  if (view === "emergencyMenu") {
    return (
      <div className="mx-auto max-w-2xl">
        <BackBar onBack={() => setView("context")} />
        <h2 className="mb-4 text-xl font-extrabold">{t("emergency.submenuTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            Icon={Icons.presetPhrases}
            title={t("emergency.preset")}
            desc={t("emergency.presetDesc")}
            accent="red"
            onClick={() => setView("emergencyPreset")}
          />
          <ActionCard
            Icon={Icons.camera}
            title={t("emergency.camera")}
            desc={t("emergency.cameraDesc")}
            accent="red"
            onClick={() => {
              setMode("emergency");
              setContextTag("emergency");
              setView("camera");
            }}
          />
        </div>
      </div>
    );
  }

  // ---- Everyday: category picker ----
  if (view === "everydayCategories") {
    return (
      <div className="mx-auto max-w-3xl">
        <BackBar onBack={() => setView("context")} />
        <h2 className="mb-4 text-xl font-extrabold">{t("everyday.title")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map(({ key, Icon }) => (
            <ActionCard
              key={key}
              Icon={Icon}
              title={t(`everyday.categories.${key}`)}
              accent="blue"
              onClick={() => {
                setMode("everyday");
                setContextTag(key);
                setView("camera");
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---- Context selection (Step A) ----
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">{t("context.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("context.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ContextCard
          Icon={Icons.emergency}
          title={t("context.emergencyTitle")}
          desc={t("context.emergencyDesc")}
          accent="red"
          onClick={() => setView("emergencyMenu")}
        />
        <ContextCard
          Icon={Icons.featureCamera}
          title={t("context.everydayTitle")}
          desc={t("context.everydayDesc")}
          accent="blue"
          onClick={() => setView("everydayCategories")}
        />
      </div>
    </div>
  );
}

function ContextCard({
  Icon,
  title,
  desc,
  accent,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  desc: string;
  accent: "red" | "blue";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={cn(
          "flex h-full flex-col items-center gap-3 border-2 p-8 text-center transition-all hover:shadow-md",
          accent === "red"
            ? "border-destructive/30 hover:border-destructive"
            : "border-primary/30 hover:border-primary"
        )}
      >
        <span
          className={cn(
            "grid size-16 place-items-center rounded-2xl",
            accent === "red"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-8" aria-hidden />
        </span>
        <span className="text-xl font-extrabold">{title}</span>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </Card>
    </button>
  );
}

function ActionCard({
  Icon,
  title,
  desc,
  accent,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  desc?: string;
  accent: "red" | "blue";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card
        className={cn(
          "flex h-full flex-col items-center gap-2 border-2 p-6 text-center transition-all hover:shadow-md",
          accent === "red"
            ? "border-destructive/30 hover:border-destructive"
            : "border-primary/30 hover:border-primary"
        )}
      >
        <span
          className={cn(
            "grid size-12 place-items-center rounded-xl",
            accent === "red"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <span className="text-base font-bold">{title}</span>
        {desc && <span className="text-sm text-muted-foreground">{desc}</span>}
      </Card>
    </button>
  );
}
