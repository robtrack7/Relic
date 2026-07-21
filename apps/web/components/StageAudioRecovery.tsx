"use client";

import { useEffect } from "react";
import { hasSupabaseEnv } from "@/lib/env";
import { getStageAudioUploadQueue } from "@/lib/stage-audio-queue";

export function StageAudioRecovery() {
  useEffect(() => {
    if (!hasSupabaseEnv() || typeof indexedDB === "undefined") return;
    const queue = getStageAudioUploadQueue();
    const recover = () => { void queue.recoverAll(); };
    recover();
    window.addEventListener("online", recover);
    const interval = window.setInterval(recover, 15_000);
    return () => {
      window.removeEventListener("online", recover);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
