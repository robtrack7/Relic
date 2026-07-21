"use client";

import { RelicIcon } from "@/components/RelicIcon";
import { sagaPath } from "@/lib/routes";
import type { HierarchyContext, HierarchyOption, IdParams } from "@/lib/types";

function targetPath(option: HierarchyOption, fallbackNewSaga: string) {
  return option.target ? sagaPath(option.target) : fallbackNewSaga;
}

export function HierarchySwitchers({ params, hierarchy }: { params: IdParams; hierarchy?: HierarchyContext }) {
  const fallback: HierarchyContext = {
    workspaces: [{ id: params.workspaceId, name: "Current Workspace", target: params }],
    worlds: [{ id: params.worldId, name: "Current World", target: params }],
    sagas: [{ id: params.sagaId, name: "Current Saga", target: params }]
  };
  const options = hierarchy ?? fallback;
  const switchingBlocked = options.switching_blocked === true;
  const newSagaPath = `/app/new-saga?workspaceId=${encodeURIComponent(params.workspaceId)}&worldId=${encodeURIComponent(params.worldId)}`;
  const currentPath = sagaPath(params);

  function switchTo(path: string) {
    if (path) window.location.assign(path);
  }

  return (
    <div className="switchers" aria-label="Workspace, World, and Saga context">
      <label className="switcher">
        <span className="switcher-label">Workspace</span>
        <span className="switcher-select-wrap">
          <span className="sw-ico"><RelicIcon name="crown" size={12} /></span>
          <select aria-label="Workspace" aria-describedby={switchingBlocked ? "hierarchy-switch-blocked" : undefined} disabled={switchingBlocked} value={currentPath} onChange={(event) => switchTo(event.target.value)}>
            {options.workspaces.map((option) => (
              <option key={option.id} value={targetPath(option, `/app/new-saga?workspaceId=${encodeURIComponent(option.id)}`)}>{option.name}</option>
            ))}
          </select>
          <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
        </span>
      </label>
      <span className="sw-sep">/</span>
      <label className="switcher">
        <span className="switcher-label">World</span>
        <span className="switcher-select-wrap">
          <span className="sw-ico wld"><RelicIcon name="flame" size={12} /></span>
          <select aria-label="World" aria-describedby={switchingBlocked ? "hierarchy-switch-blocked" : undefined} disabled={switchingBlocked} value={currentPath} onChange={(event) => switchTo(event.target.value)}>
            {options.worlds.map((option) => (
              <option key={option.id} value={targetPath(option, `/app/new-saga?workspaceId=${encodeURIComponent(params.workspaceId)}&worldId=${encodeURIComponent(option.id)}`)}>{option.name}</option>
            ))}
          </select>
          <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
        </span>
      </label>
      <span className="sw-sep">/</span>
      <label className="switcher">
        <span className="switcher-label">Saga</span>
        <span className="switcher-select-wrap">
          <span className="sw-ico"><RelicIcon name="sessions" size={12} /></span>
          <select aria-label="Saga" aria-describedby={switchingBlocked ? "hierarchy-switch-blocked" : undefined} disabled={switchingBlocked} value={currentPath} onChange={(event) => switchTo(event.target.value)}>
            {options.sagas.map((option) => (
              <option key={option.id} value={targetPath(option, newSagaPath)}>{option.name}</option>
            ))}
            <option value={newSagaPath}>+ New saga</option>
          </select>
          <span className="sw-chev"><RelicIcon name="chevronDown" size={11} /></span>
        </span>
      </label>
      {switchingBlocked ? <span id="hierarchy-switch-blocked" className="sr-only">End or resume the live Session before switching context.</span> : null}
    </div>
  );
}
