import { getTranslations } from "next-intl/server";
import { SponsorLogo } from "./sponsor-logo";
import { Marquee } from "./marquee";
import { Icons } from "@/components/icons";

const VIP = ["ThaiCom Foundation", "DreamAble"];
const PLATINUM = "9arm";
const GOLD = ["Dek-D", "Seed Webs", "Moonshot", "Binance TH"];
const SILVER = [
  "Creators Garten",
  "Rainmaker",
  "Spaceth.co",
  ".th",
  "Aona",
  "Pranakorn",
  "Maytapriya",
];
const ORGANIZED_BY = ["TWA", "COT", "ABAC CommArts", "Thai Media Fund"];
const PARTNERS = [
  "Partner A",
  "Partner B",
  "Partner C",
  "Partner D",
  "Partner E",
  "Partner F",
];

function TierLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-5 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </h3>
  );
}

export async function Sponsors() {
  const t = await getTranslations("landing.sponsors");

  return (
    <section className="border-t bg-secondary/30 py-16 sm:py-20">
      <div className="container">
        <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("heading")}
        </h2>

        {/* VIP */}
        <div className="mt-12">
          <TierLabel>{t("vip")}</TierLabel>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {VIP.map((name) => (
              <SponsorLogo key={name} name={name} size="lg" />
            ))}
          </div>
        </div>

        {/* Platinum */}
        <div className="mt-12">
          <TierLabel>{t("platinum")}</TierLabel>
          <div className="flex justify-center">
            <div className="logo-multiply flex items-center gap-4 rounded-2xl border bg-card px-8 py-6">
              <span className="grid size-16 place-items-center rounded-full bg-secondary">
                <Icons.profile className="size-8 text-muted-foreground" aria-hidden />
              </span>
              <span className="text-2xl font-semibold">{PLATINUM}</span>
            </div>
          </div>
        </div>

        {/* Gold (carousel) */}
        <div className="mt-12">
          <TierLabel>{t("gold")}</TierLabel>
          <Marquee items={GOLD} durationSeconds={26} />
        </div>

        {/* Silver (carousel) */}
        <div className="mt-10">
          <TierLabel>{t("silver")}</TierLabel>
          <Marquee items={SILVER} durationSeconds={34} />
        </div>

        {/* Organized by */}
        <div className="mt-14">
          <TierLabel>{t("organizedBy")}</TierLabel>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {ORGANIZED_BY.map((name) => (
              <SponsorLogo key={name} name={name} size="md" />
            ))}
          </div>
        </div>

        {/* Partners & supporters */}
        <div className="mt-12">
          <TierLabel>{t("partners")}</TierLabel>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PARTNERS.map((name) => (
              <SponsorLogo key={name} name={name} size="sm" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
