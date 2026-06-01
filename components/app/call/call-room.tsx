"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useCall, type CaptionMessage, type CallState } from "@/lib/call/use-webrtc";
import { useSignRecognition } from "@/lib/call/use-sign-recognition";
import { useSpeechRecognition } from "@/lib/call/use-speech-recognition";
import { useSpeak } from "@/lib/tts";
import type { Candidate } from "@/lib/translation";

export type CallRole = "signer" | "speaker";

export function CallRoom({
  room,
  peerId,
  role,
  stream,
  onEnd,
}: {
  room: string;
  peerId: string;
  role: CallRole;
  stream: MediaStream;
  onEnd: () => void;
}) {
  const t = useTranslations("app.call");
  const locale = useLocale() as "th" | "en";
  const { say } = useSpeak(locale);

  const audioStream = useMemo(
    () => new MediaStream(stream.getAudioTracks()),
    [stream]
  );

  const [incoming, setIncoming] = useState<{ text: string; interim: boolean } | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [micOn, setMicOn] = useState(true);

  const onCaption = useCallback(
    (msg: CaptionMessage) => {
      setIncoming({ text: msg.text, interim: msg.final === false });
      // The hearing speaker hears the deaf signer's words read aloud.
      if (role === "speaker" && msg.kind === "sign" && msg.final !== false) {
        say(msg.text);
      }
    },
    [role, say]
  );

  const { state, remoteStream, sendCaption } = useCall({
    room,
    peerId,
    localStream: audioStream,
    enabled: true,
    onCaption,
  });

  // Remote audio playback.
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    stream.getAudioTracks().forEach((tr) => (tr.enabled = next));
  }

  function endCall() {
    stream.getTracks().forEach((tr) => tr.stop());
    onEnd();
  }

  return (
    <div className="space-y-4">
      <ConnectionBanner state={state} />
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {role === "signer" ? (
        <SignerView
          stream={stream}
          onCommit={(word) => {
            setSent((prev) => [...prev, word].slice(-12));
            sendCaption({ kind: "sign", text: word, final: true });
          }}
          incoming={incoming}
          sent={sent}
        />
      ) : (
        <SpeakerView
          locale={locale}
          onSpeech={(text, isFinal) => {
            sendCaption({ kind: "speech", text, final: isFinal });
            if (isFinal) setSent((prev) => [...prev, text].slice(-8));
          }}
          incoming={incoming}
          onPlayIncoming={() => incoming && say(incoming.text)}
        />
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={toggleMic}>
          {micOn ? (
            <Icons.micOn className="size-5" aria-hidden />
          ) : (
            <Icons.micOff className="size-5" aria-hidden />
          )}
          {micOn ? t("muteMic") : t("unmuteMic")}
        </Button>
        <Button variant="destructive" onClick={endCall}>
          <Icons.endCall className="size-5" aria-hidden />
          {t("endCall")}
        </Button>
      </div>
    </div>
  );
}

function ConnectionBanner({ state }: { state: CallState }) {
  const t = useTranslations("app.call");
  const map: Record<CallState, { label: string; tone: string; pulse?: boolean }> = {
    idle: { label: t("waiting"), tone: "text-muted-foreground", pulse: true },
    connecting: { label: t("connecting"), tone: "text-amber-600", pulse: true },
    connected: { label: t("connected"), tone: "text-primary" },
    failed: { label: t("failed"), tone: "text-destructive" },
    closed: { label: t("ended"), tone: "text-muted-foreground" },
  };
  const s = map[state];
  return (
    <p className={`inline-flex items-center gap-2 text-sm font-semibold ${s.tone}`}>
      {(s.pulse || state === "connected") && (
        <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {s.label}
    </p>
  );
}

// ---- Signer (deaf) view ----------------------------------------------------

function SignerView({
  stream,
  onCommit,
  incoming,
  sent,
}: {
  stream: MediaStream;
  onCommit: (word: string) => void;
  incoming: { text: string; interim: boolean } | null;
  sent: string[];
}) {
  const t = useTranslations("app.call");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState<Candidate | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const { handCount } = useSignRecognition({
    videoRef,
    canvasRef,
    enabled: true,
    onLive: (top) => setLive(top),
    onCommit,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
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
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {handCount > 0 && live ? live.text : t("raiseHand")}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        {/* Father's speech, large, for the child to read */}
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium text-muted-foreground">{t("theirSpeech")}</p>
          <p
            className={`mt-1 text-2xl font-extrabold leading-snug ${incoming?.interim ? "opacity-60" : ""}`}
          >
            {incoming?.text || "—"}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("yourSigns")}</p>
          <div className="min-h-12 rounded-lg bg-secondary/60 p-3 text-lg font-semibold">
            {sent.length ? sent.join(" ") : "—"}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- Speaker (hearing) view ------------------------------------------------

function SpeakerView({
  locale,
  onSpeech,
  incoming,
  onPlayIncoming,
}: {
  locale: "th" | "en";
  onSpeech: (text: string, isFinal: boolean) => void;
  incoming: { text: string; interim: boolean } | null;
  onPlayIncoming: () => void;
}) {
  const t = useTranslations("app.call");
  const { supported } = useSpeechRecognition({
    enabled: true,
    lang: locale === "th" ? "th-TH" : "en-US",
    onResult: onSpeech,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Child's signs, large, read aloud automatically */}
      <Card className="border-2 border-primary/30 bg-primary/5 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{t("theirSigns")}</p>
          {incoming && (
            <Button variant="ghost" size="sm" onClick={onPlayIncoming} aria-label={t("play")}>
              <Icons.playAudio className="size-5" aria-hidden />
            </Button>
          )}
        </div>
        <p className="mt-2 text-3xl font-extrabold leading-snug">
          {incoming?.text || t("raiseHand")}
        </p>
      </Card>

      <Card className="p-5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <Icons.micOn className="size-4" aria-hidden />
          {t("listening")}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t("speakNow")}</p>
        {!supported && (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {t("sttUnsupported")}
          </p>
        )}
      </Card>
    </div>
  );
}
