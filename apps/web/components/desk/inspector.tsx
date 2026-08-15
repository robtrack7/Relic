"use client";

import { useEffect, useRef, useState } from "react";

import { cardTitle, type DeskCard, type FieldValues } from "@/lib/world/model";
import { builtInTemplate, groupFields, REPRESENTATION_KINDS } from "@/lib/world/templates";

import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

/**
 * The contextual surface for one selected object.
 *
 * Selection deepens; it does not depart. This emerges beside the canvas rather
 * than navigating anywhere, and the Board stays visible and interactive behind
 * it — expanding Mara, not opening Character Administration.
 *
 * It edits two different things and keeps the difference visible, because the
 * difference is the model:
 *
 *   the **sheet** is rules data — ability scores, armour class. Typing in it is
 *   an edit;
 *
 *   the **claims** are assertions about the world — occupation, allegiance.
 *   Typing in one records that Relic now believes something, with provenance
 *   attached, as Pencil until somebody deliberately establishes it.
 */
export function Inspector({ card, store }: { card: DeskCard; store: DeskStore }) {
  const representation = card.representation;

  if (!representation) {
    return <Deepen card={card} store={store} />;
  }

  const template = builtInTemplate(representation.kind);

  return (
    <aside className={styles.inspector} aria-label={`${representation.kind} details`}>
      <header className={styles.inspectorHead}>
        <span className={styles.kindMark}>{template.name}</span>
        <NameField card={card} store={store} />
      </header>

      {template.claims.length > 0 ? (
        <section className={styles.inspectorSection}>
          <h4 className={styles.inspectorHeading}>
            About
            {/* Naming the epistemics where they are edited, not in a tooltip. */}
            <span className={styles.inspectorNote}>asserted, sourced, Pencil</span>
          </h4>
          {template.claims.map((def) => (
            <ClaimField key={def.key} card={card} store={store} def={def} />
          ))}
        </section>
      ) : null}

      {template.fields.length > 0 ? (
        <section className={styles.inspectorSection}>
          <h4 className={styles.inspectorHeading}>
            Sheet
            <span className={styles.inspectorNote}>rules data</span>
          </h4>
          <SheetFields card={card} store={store} />
        </section>
      ) : null}
    </aside>
  );
}

/** The one gesture that turns captured thought into a kind of thing. */
function Deepen({ card, store }: { card: DeskCard; store: DeskStore }) {
  return (
    <aside className={styles.inspector} aria-label="Give this a kind">
      <header className={styles.inspectorHead}>
        <span className={styles.kindMark}>Fragment</span>
        <p className={styles.inspectorLead}>
          {cardTitle(card) || "An unwritten thought"}
        </p>
      </header>

      <section className={styles.inspectorSection}>
        <h4 className={styles.inspectorHeading}>
          Make this a…
          {/* The invariant, said plainly where the gesture happens. */}
          <span className={styles.inspectorNote}>keeps its identity</span>
        </h4>
        <div className={styles.kindGrid}>
          {REPRESENTATION_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={styles.kindButton}
              onClick={() =>
                store.represent(card.objectId, kind, cardTitle(card).slice(0, 200))
              }
            >
              {builtInTemplate(kind).name}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function NameField({ card, store }: { card: DeskCard; store: DeskStore }) {
  const representation = card.representation!;
  const [draft, setDraft] = useState(representation.label ?? "");
  const settled = useRef(representation.label ?? "");

  useEffect(() => {
    const incoming = representation.label ?? "";
    if (incoming !== settled.current) {
      settled.current = incoming;
      setDraft(incoming);
    }
  }, [representation.label]);

  const commit = () => {
    if (draft === settled.current) return;
    settled.current = draft;
    store.editSheet(card.objectId, draft, representation.fields);
  };

  return (
    <input
      className={styles.inspectorName}
      value={draft}
      placeholder={builtInTemplate(representation.kind).labelPrompt}
      aria-label="Name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function ClaimField({
  card,
  store,
  def
}: {
  card: DeskCard;
  store: DeskStore;
  def: { key: string; label: string };
}) {
  const existing = card.claims.find((claim) => claim.claimKind === def.key);
  const [draft, setDraft] = useState(existing?.value ?? "");
  const settled = useRef(existing?.value ?? "");

  useEffect(() => {
    const incoming = existing?.value ?? "";
    if (incoming !== settled.current) {
      settled.current = incoming;
      setDraft(incoming);
    }
  }, [existing?.value]);

  const commit = () => {
    const next = draft.trim();
    if (next === settled.current) return;
    settled.current = next;
    // Emptying a claim retracts it. Relic stops believing something rather
    // than believing it to be blank.
    if (next === "") {
      if (existing) store.retract(card.objectId, existing.id);
      return;
    }
    store.assert(card.objectId, def.key, next);
  };

  return (
    <label className={styles.inspectorField}>
      <span className={styles.inspectorLabel}>{def.label}</span>
      <input
        className={styles.inspectorInput}
        value={draft}
        aria-label={def.label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      {existing ? <TruthMark state={existing.truthState} /> : null}
    </label>
  );
}

function TruthMark({ state }: { state: DeskCard["truthState"] }) {
  return (
    <span className={styles.claimTruth} data-truth={state}>
      {state === "ink" ? "INK" : state === "disputed" ? "DISPUTED" : "PENCIL"}
    </span>
  );
}

function SheetFields({ card, store }: { card: DeskCard; store: DeskStore }) {
  const representation = card.representation!;
  const template = builtInTemplate(representation.kind);
  const [draft, setDraft] = useState<FieldValues>(representation.fields);

  /*
   * Re-seeded when the subject changes, never when the saved fields change.
   *
   * The sheet is one draft across every cell, so following the server would
   * mean that committing STR — which returns a fresh fields object — wipes the
   * DEX the GM had already typed but not yet blurred. While this sheet is on
   * screen the draft is what the GM believes; the server is downstream of it.
   */
  useEffect(() => {
    setDraft(representation.fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [representation.id]);

  const commit = (next: FieldValues) => {
    store.editSheet(card.objectId, representation.label ?? "", next);
  };

  return (
    <>
      {groupFields(template.fields).map(({ group, fields }) => (
        <div key={group} className={styles.sheetGroup}>
          {group ? <span className={styles.sheetGroupName}>{group}</span> : null}
          <div className={styles.sheetGrid}>
            {fields.map((field) => (
              <label key={field.key} className={styles.sheetField}>
                <span className={styles.sheetLabel}>{field.label}</span>
                <input
                  className={styles.sheetInput}
                  value={draft[field.key] ?? ""}
                  inputMode={field.kind === "number" ? "numeric" : "text"}
                  aria-label={field.label}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const next = { ...draft };
                    if (raw.trim() === "") {
                      delete next[field.key];
                    } else {
                      // An unparseable number stays text rather than becoming
                      // NaN — the GM is mid-keystroke, not wrong.
                      const asNumber = Number(raw);
                      next[field.key] =
                        field.kind === "number" && raw.trim() !== "" && !Number.isNaN(asNumber)
                          ? asNumber
                          : raw;
                    }
                    setDraft(next);
                  }}
                  onBlur={() => commit(draft)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
