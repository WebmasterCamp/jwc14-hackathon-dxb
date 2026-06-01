"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { FaceAnalyticsBar } from "./face-analytics-bar";
import { useSignRecognition } from "@/lib/call/use-sign-recognition";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";
import type { Candidate } from "@/lib/translation";

type Phase = "permission" | "starting" | "denied" | "live";

export function CameraTranslate({
  mode,
  contextTag,
  onClose,
}: {
  mode: "emergency" | "everyday";
  contextTag: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("app.camera");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("permission");
  const [insecure, setInsecure] = useState(false);
  const [liveTop, setLiveTop] = useState<Candidate | null>(null);
  const [liveSecond, setLiveSecond] = useState<Candidate | null>(null);
  const [sentence, setSentence] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setInsecure(false);
    setPhase("starting");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setInsecure(typeof window !== "undefined" && !window.isSecureContext);
      setPhase("denied");
      return;
    }

    try {
      // 640x480 is plenty for landmark detection and far lighter than 720p.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      let tries = 0;
      while (!videoRef.current && tries++ < 20) {
        await new Promise((r) => setTimeout(r, 25));
      }
      const video = videoRef.current;
      if (!video) throw new Error("video element unavailable");
      video.srcObject = stream;
      await video.play().catch(() => {});
      setPhase("live");
    } catch {
      stopStream();
      setPhase("denied");
    }
  }, [stopStream]);

  // Single shared recognition pipeline (Holistic + TFJS), enabled while live.
  const { status, handCount, face } = useSignRecognition({
    videoRef,
    canvasRef,
    enabled: phase === "live",
    onLive: (top, second) => {
      setLiveTop(top);
      setLiveSecond(second);
    },
    onCommit: (word) => {
      setSentence((prev) => [...prev, word].slice(-12));
      setSaved(false);
      say(word);
    },
  });

  useEffect(() => () => stopStream(), [stopStream]);

  async function saveSentence() {
    const text = sentence.join(" ");
    if (!text) return;
    await saveSession({
      mode,
      contextTag,
      sentence: text,
      candidates: liveTop && liveSecond ? [liveTop, liveSecond] : undefined,
      source: "camera",
    });
    setSaved(true);
  }

  function clearSentence() {
    setSentence([]);
    setSaved(false);
  }

  const gateOpen = phase === "permission" || phase === "denied";

  return (
    <div className="relative grid gap-4 lg:grid-cols-[6fr_4fr]">
      {/* Left: camera + skeleton overlay (60%) */}
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full -scale-x-100 object-cover"
          />
          {phase === "starting" && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white">
              {t("starting")}
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {status === "ready" && (
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            )}
            {handCount > 0 ? t("handsDetected", { count: handCount }) : t("noHands")}
          </div>
        </div>
      </Card>

      {/* Right: real-time recognition (40%) */}
      <Card className="flex flex-col gap-4 p-5">
        {status === "ready" && (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
            {t("live")}
          </p>
        )}
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">{t("modelLoading")}</p>
        )}
        {status === "error" && (
          <p className="text-sm text-destructive">{t("modelError")}</p>
        )}

        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("recognized")}</p>
          {liveTop ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-3xl font-extrabold">{liveTop.text}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {Math.round(liveTop.confidence * 100)}%
                </span>
              </div>
              {liveSecond && (
                <button
                  type="button"
                  onClick={() => say(liveSecond.text)}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground">
                    {t("alternative")}:{" "}
                    <span className="font-semibold text-foreground">{liveSecond.text}</span>
                  </span>
                  <Icons.playAudio className="size-4 text-muted-foreground" aria-hidden />
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("raiseHand")}</p>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("sentence")}</p>
          <div className="min-h-12 rounded-lg bg-secondary/60 p-3">
            {sentence.length > 0 ? (
              <p className="text-lg font-semibold leading-relaxed">{sentence.join(" ")}</p>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <FaceAnalyticsBar signals={face} />

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => say(sentence.join(" "))}
            disabled={sentence.length === 0}
          >
            <Icons.playAudio className="size-5" aria-hidden />
            {t("play")}
          </Button>
          <Button onClick={saveSentence} disabled={sentence.length === 0}>
            <Icons.confirm className="size-5" aria-hidden />
            {t("save")}
          </Button>
          <Button variant="ghost" onClick={clearSentence} disabled={sentence.length === 0}>
            {t("clear")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              stopStream();
              onClose();
            }}
          >
            <Icons.close className="size-5" aria-hidden />
            {t("stop")}
          </Button>
        </div>

        {saved && (
          <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Icons.confirm className="size-4" aria-hidden />
            {t("saved")}
          </p>
        )}
      </Card>

      {/* Permission gate overlay: camera never opens without explicit confirm */}
      {gateOpen && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-xl bg-black/55 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-3 flex items-center gap-2">
              <Icons.camera className="size-6 text-primary" aria-hidden />
              <h2 className="text-lg font-bold">{t("permissionTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t("permissionBody")}</p>
            {phase === "denied" && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {insecure ? t("insecure") : t("denied")}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button className="flex-1" onClick={start}>
                <Icons.confirm className="size-5" aria-hidden />
                {phase === "denied" ? t("retry") : t("allow")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
