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
    const recover = async () => {
      if (!navigator.onLine) return;
      await writeQueue.recoverAll(true);
      await audioQueue.recoverAll(true);
    };
    void recover();
    const onOnline = () => { void recover(); };
    window.addEventListener("online", onOnline);
    const interval = window.setInterval(() => { void recover(); }, 15_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
