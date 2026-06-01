import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import type { LucideIcon } from "@/components/icons";

type Feature = {
  key: "capture" | "ai" | "meanings" | "tts" | "emergency" | "history";
  Icon: LucideIcon;
};

const FEATURES: Feature[] = [
  { key: "capture", Icon: Icons.featureCamera },
  { key: "ai", Icon: Icons.featureAi },
  { key: "meanings", Icon: Icons.featureMeanings },
  { key: "tts", Icon: Icons.featureTts },
  { key: "emergency", Icon: Icons.featureEmergency },
  { key: "history", Icon: Icons.featureHistory },
];

export async function FeatureGrid() {
  const t = await getTranslations("landing.features");

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {FEATURES.map(({ key, Icon }) => (
        <li key={key}>
          <Card className="h-full p-5 transition-shadow hover:shadow-md">
            <Icon className="size-6 text-primary" aria-hidden />
            <h3 className="mt-3 text-base font-bold leading-tight">
              {t(`${key}.title`)}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`${key}.subtitle`)}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
