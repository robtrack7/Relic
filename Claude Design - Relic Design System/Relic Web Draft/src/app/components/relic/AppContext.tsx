import React, { createContext, useContext, useState, useCallback } from 'react';

export interface RelicState {
  view: string;
  sessionState: "empty" | "none" | "prepping" | "ready" | "active" | "review";
  libraryFilter: string;
  libraryView: "grid" | "detail" | "new" | "newFromPrompt";
  libraryEntityEdit: boolean;
  selectedThreadId: number;
  sessionsView: "index" | "detail" | "pipeline";
  pipelineState: "processing" | "complete" | "failed";
  prepReady: boolean;
  prepLocked: boolean;
  stageVariant: "ready" | "active";
  stageEndConfirm: boolean;
  stageShowUndo: boolean;
  selectedReviewIdx: number;
  exportState: "form" | "processing" | "ready" | "expired" | "failed";
  settingsSection: string;
}

export const DEFAULT_STATE: RelicState = {
  view: "home",
  sessionState: "none",
  libraryFilter: "all",
  libraryView: "grid",
  libraryEntityEdit: false,
  selectedThreadId: 1,
  sessionsView: "index",
  pipelineState: "processing",
  prepReady: false,
  prepLocked: false,
  stageVariant: "active",
  stageEndConfirm: false,
  stageShowUndo: false,
  selectedReviewIdx: 0,
  exportState: "form",
  settingsSection: "Saga settings",
};

interface AppContextValue {
  state: RelicState;
  navigate: (view: string, params?: Partial<RelicState>) => void;
  update: (params: Partial<RelicState>) => void;
  applyAdminState: (patch: Partial<RelicState>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RelicState>(DEFAULT_STATE);

  const navigate = useCallback((view: string, params?: Partial<RelicState>) => {
    setState(s => ({ ...s, view, ...(params || {}) }));
  }, []);

  const update = useCallback((params: Partial<RelicState>) => {
    setState(s => ({ ...s, ...params }));
  }, []);

  const applyAdminState = useCallback((patch: Partial<RelicState>) => {
    setState({ ...DEFAULT_STATE, ...patch });
  }, []);

  return (
    <AppContext.Provider value={{ state, navigate, update, applyAdminState }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
