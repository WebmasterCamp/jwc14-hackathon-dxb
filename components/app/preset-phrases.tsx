"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons, type LucideIcon } from "@/components/icons";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";

type PhraseKey = "help" | "police" | "lost" | "pain" | "ambulance";

const PHRASES: { key: PhraseKey; Icon: LucideIcon }[] = [
  { key: "help", Icon: Icons.emergency },
  { key: "police", Icon: Icons.police },
  { key: "lost", Icon: Icons.lost },
  { key: "pain", Icon: Icons.pain2 },
  { key: "ambulance", Icon: Icons.ambulance },
];

export function PresetPhrases() {
  const t = useTranslations("app.preset");
  const tr = useTranslations("app.result");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);
  const [active, setActive] = useState<string | null>(null);

  async function trigger(text: string) {
    setActive(text);
    say(text);
    await saveSession({
      mode: "emergency",
      contextTag: "emergency",
      sentence: text,
      source: "preset",
    });
  }

  return (
    <div className="space-y-4">
      {active && (
        <Card className="border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-3xl font-extrabold leading-snug">{active}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => say(active)}
            aria-label={tr("play")}
          >
            <Icons.playAudio className="size-5" aria-hidden />
            {tr("play")}
          </Button>
        </Card>
      )}

      <ul className="space-y-2">
        {PHRASES.map(({ key, Icon }) => {
          const text = t(`phrases.${key}`);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => trigger(text)}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-destructive/50"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-lg font-semibold">{text}</span>
                <Icons.playAudio
                  className="ml-auto size-5 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
