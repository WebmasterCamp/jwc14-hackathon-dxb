"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { FaceAnalyticsBar } from "./face-analytics-bar";
import {
  extractKeypoints,
  faceSignals,
  SEQ_LEN,
  type FaceSignals,
  type HolisticResults,
} from "@/lib/holistic/keypoints";
import { isModelAvailable, predictSequence, warmUp } from "@/lib/translation/tfjs-client";
import { useSpeak } from "@/lib/tts";
import { saveSession } from "@/app/app/actions";
import type { Candidate } from "@/lib/translation";
import { cn } from "@/lib/utils";

const HOLISTIC_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629";

// Real-time confirmation gate (tunable): a word is committed to the sentence
// only when the top prediction is the same across CONSISTENCY consecutive
// inferences AND above THRESHOLD confidence.
const CONSISTENCY = 4;
const THRESHOLD = 0.6;

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
];

type Phase = "permission" | "starting" | "denied" | "live";
type ModelStatus = "idle" | "loading" | "ready" | "error";

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
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  }, [say]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const holisticRef = useRef<any>(null);
  const runningRef = useRef(false);
  const seqRef = useRef<Float32Array[]>([]);
  const faceThrottle = useRef(0);
  const modelOkRef = useRef(false);
  const inferBusyRef = useRef(false);
  const predictionsRef = useRef<string[]>([]);
  const lastConfirmedRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("permission");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [handCount, setHandCount] = useState(0);
  const [face, setFace] = useState<FaceSignals>({ smile: 0, eyesOpen: 0, mouthOpen: 0 });
  const [liveTop, setLiveTop] = useState<Candidate | null>(null);
  const [liveSecond, setLiveSecond] = useState<Candidate | null>(null);
  const [sentence, setSentence] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [insecure, setInsecure] = useState(false);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const onResults = useCallback((results: HolisticResults) => {
    seqRef.current.push(extractKeypoints(results));
    if (seqRef.current.length > SEQ_LEN) seqRef.current.shift();

    const hands =
      (results.leftHandLandmarks ? 1 : 0) + (results.rightHandLandmarks ? 1 : 0);
    setHandCount((prev) => (prev === hands ? prev : hands));

    if (++faceThrottle.current % 5 === 0) {
      const fs = faceSignals(results);
      if (fs) setFace(fs);
    }

    drawOverlay(canvasRef.current, videoRef.current, results);

    // ---- Real-time inference (self-throttled: one in flight at a time) ----
    if (
      modelOkRef.current &&
      !inferBusyRef.current &&
      seqRef.current.length >= SEQ_LEN
    ) {
      inferBusyRef.current = true;
      const snapshot = seqRef.current.slice();
      predictSequence(snapshot)
        .then(([c0, c1]) => {
          setLiveTop(c0);
          setLiveSecond(c1);

          const preds = predictionsRef.current;
          preds.push(c0.text);
          if (preds.length > CONSISTENCY) preds.shift();
          const stable =
            preds.length >= CONSISTENCY && preds.every((p) => p === c0.text);

          if (
            stable &&
            c0.confidence >= THRESHOLD &&
            c0.text !== lastConfirmedRef.current
          ) {
            lastConfirmedRef.current = c0.text;
            setSentence((prev) => [...prev, c0.text].slice(-12));
            setSaved(false);
            sayRef.current?.(c0.text);
          }
        })
        .catch(() => {})
        .finally(() => {
          inferBusyRef.current = false;
        });
    }
  }, []);

  const pump = useCallback(async () => {
    const video = videoRef.current;
    const holistic = holisticRef.current;
    if (!runningRef.current || !video) return;
    if (holistic && video.readyState >= 2) {
      try {
        await holistic.send({ image: video });
      } catch {
        /* transient */
      }
    }
    if (runningRef.current) rafRef.current = requestAnimationFrame(pump);
  }, []);

  const start = useCallback(async () => {
    setInsecure(false);
    setPhase("starting");
    seqRef.current = [];
    predictionsRef.current = [];
    lastConfirmedRef.current = null;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setInsecure(typeof window !== "undefined" && !window.isSecureContext);
      setPhase("denied");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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

      setModelStatus("loading");
      try {
        if (!holisticRef.current) {
          const mod: any = await import("@mediapipe/holistic");
          const Holistic = mod.Holistic;
          const holistic = new Holistic({
            locateFile: (file: string) => `${HOLISTIC_CDN}/${file}`,
          });
          holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            refineFaceLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          holistic.onResults(onResults);
          holisticRef.current = holistic;
        }
        modelOkRef.current = await isModelAvailable();
        if (modelOkRef.current) await warmUp();
        setModelStatus(modelOkRef.current ? "ready" : "error");
      } catch {
        setModelStatus("error");
      }

      runningRef.current = true;
      void pump();
    } catch {
      stopCamera();
      setPhase("denied");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResults, pump, stopCamera]);

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
    lastConfirmedRef.current = null;
    setSaved(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
      holisticRef.current?.close?.();
    };
  }, [stopCamera]);

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
            {modelStatus === "ready" && (
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
            )}
            {handCount > 0 ? t("handsDetected", { count: handCount }) : t("noHands")}
          </div>
        </div>
      </Card>

      {/* Right: real-time recognition (40%) */}
      <Card className="flex flex-col gap-4 p-5">
        {modelStatus === "ready" && (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
            {t("live")}
          </p>
        )}
        {modelStatus === "loading" && (
          <p className="text-sm text-muted-foreground">{t("modelLoading")}</p>
        )}
        {modelStatus === "error" && (
          <p className="text-sm text-destructive">{t("modelError")}</p>
        )}

        {/* Live recognized word + alternative */}
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
                  onClick={() => sayRef.current?.(liveSecond.text)}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground">
                    {t("alternative")}: <span className="font-semibold text-foreground">{liveSecond.text}</span>
                  </span>
                  <Icons.playAudio className="size-4 text-muted-foreground" aria-hidden />
                </button>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t("raiseHand")}</p>
          )}
        </div>

        {/* Running sentence */}
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
            onClick={() => sayRef.current?.(sentence.join(" "))}
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
              stopCamera();
              onClose();
            }}
          >
            <Icons.close className="size-5" aria-hidden />
            {t("stop")}
          </Button>
        </div>

        {saved && (
          <p
            role="status"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            )}
          >
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

// ---- drawing ---------------------------------------------------------------

function drawOverlay(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  results: HolisticResults
) {
  if (!canvas || !video) return;
  if (canvas.width !== video.videoWidth && video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (results.poseLandmarks) {
    ctx.strokeStyle = "rgba(148,163,184,0.7)";
    ctx.lineWidth = Math.max(2, w / 400);
    for (const [a, b] of POSE_CONNECTIONS) {
      const pa = results.poseLandmarks[a];
      const pb = results.poseLandmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }
  }

  for (const hand of [results.leftHandLandmarks, results.rightHandLandmarks]) {
    if (!hand) continue;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(2, w / 320);
    for (const [a, b] of HAND_CONNECTIONS) {
      if (!hand[a] || !hand[b]) continue;
      ctx.beginPath();
      ctx.moveTo(hand[a].x * w, hand[a].y * h);
      ctx.lineTo(hand[b].x * w, hand[b].y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "#f97316";
    const r = Math.max(3, w / 220);
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
