"use client";

import * as tf from "@tensorflow/tfjs";
import { FEATURE_DIM, SEQ_LEN } from "@/lib/holistic/keypoints";
import type { Candidate } from "./types";

const BASE = "/models/thsl";

let modelPromise: Promise<tf.LayersModel> | null = null;
let labelsPromise: Promise<string[]> | null = null;
let available: boolean | null = null;

/** True once we've confirmed the converted model is actually hosted. */
export async function isModelAvailable(): Promise<boolean> {
  if (available !== null) return available;
  try {
    const res = await fetch(`${BASE}/model.json`, { method: "HEAD" });
    available = res.ok;
  } catch {
    available = false;
  }
  return available;
}

function getModel() {
  if (!modelPromise) modelPromise = tf.loadLayersModel(`${BASE}/model.json`);
  return modelPromise;
}

function getLabels() {
  if (!labelsPromise) {
    labelsPromise = fetch(`${BASE}/labels.json`).then((r) => r.json());
  }
  return labelsPromise;
}

/** Warm up the model + backend so the first real translate isn't slow. */
export async function warmUp(): Promise<void> {
  const model = await getModel();
  await getLabels();
  const zeros = tf.zeros([1, SEQ_LEN, FEATURE_DIM]);
  const out = model.predict(zeros) as tf.Tensor;
  await out.data();
  zeros.dispose();
  out.dispose();
}

/**
 * Runs the LSTM on a sequence of per-frame 258-dim vectors. Pads the front
 * with zero frames if fewer than 30 were captured (mirrors `sequence[-30:]`).
 */
export async function predictSequence(
  frames: Float32Array[]
): Promise<[Candidate, Candidate]> {
  const model = await getModel();
  const labels = await getLabels();

  const flat = new Float32Array(SEQ_LEN * FEATURE_DIM);
  const recent = frames.slice(-SEQ_LEN);
  const offset = SEQ_LEN - recent.length; // pad at the front
  for (let f = 0; f < recent.length; f++) {
    flat.set(recent[f], (offset + f) * FEATURE_DIM);
  }

  const input = tf.tensor(flat, [1, SEQ_LEN, FEATURE_DIM]);
  const logits = model.predict(input) as tf.Tensor;
  const scores = Array.from(await logits.data());
  input.dispose();
  logits.dispose();

  const ranked = scores
    .map((confidence, index) => ({ confidence, index }))
    .sort((a, b) => b.confidence - a.confidence);

  const toCandidate = (r: { confidence: number; index: number }): Candidate => ({
    text: labels[r.index] ?? `#${r.index}`,
    confidence: r.confidence,
  });

  return [toCandidate(ranked[0]), toCandidate(ranked[1])];
}
