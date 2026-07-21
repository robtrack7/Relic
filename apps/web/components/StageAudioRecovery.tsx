"use client";

import { useEffect } from "react";
import { hasSupabaseEnv } from "@/lib/env";
import { getStageAudioUploadQueue } from "@/lib/stage-audio-queue";
import { getStageWriteQueue } from "@/lib/stage-write-queue";

export function StageAudioRecovery() {
  useEffect(() => {
    if (!hasSupabaseEnv() || typeof indexedDB === "undefined") return;
    const audioQueue = getStageAudioUploadQueue();
    const writeQueue = getStageWriteQueue();
    const recover = () => {
      void audioQueue.recoverAll();
      void writeQueue.recoverAll();
    };
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
