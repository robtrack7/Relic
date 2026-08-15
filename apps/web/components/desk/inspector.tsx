"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  cardTitle,
  type Claim,
  type ClaimDef,
  type DeskCard,
  type FieldValues,
  type Link,
  type ObjectRef,
  type WorldObjectId
} from "@/lib/world/model";
import { builtInTemplate, groupFields, REPRESENTATION_KINDS } from "@/lib/world/templates";

import { MaturityCue, ProvenanceLine, TruthMark } from "./truth";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

/**
 * The contextual surface for one focused object.
 *
 * Selection deepens; it does not depart. This emerges beside the canvas rather
 * than navigating anywhere, and the Board stays visible and interactive behind
 * it — expanding Mara, not opening Character Administration.
 *
 * It edits three different things and keeps the differences visible, because
 * the differences are the model:
 *
 *   the **sheet** is rules data — ability scores, armour class. Typing in it is
 *   an edit;
 *
 *   the **claims** are assertions about the world — occupation, allegiance.
 *   Typing in one records that Relic now believes something, with provenance
 *   attached, as Pencil;
 *
 *   **truth** is what Relic has decided. Nothing typed anywhere becomes Ink.
 *   Establishing is its own previewed act, and it lives behind `Establish…`.
 */
export function Inspector({
  card,
  store,
  onClose,
  onFollow
}: {
  card: DeskCard;
  store: DeskStore;
  onClose: () => void;
  /** Deepen into something this object is connected to. */
  onFollow: (link: Link) => void;
}) {
  const [settling, setSettling] = useState(false);

  // Moving to another object leaves the settlement behind. A preview belongs to
  // the thing it was previewing, and carrying it across would offer to
  // establish one object's claims while showing another's name.
  useEffect(() => setSettling(false), [card.objectId]);

  if (settling) {
    return <EstablishSheet card={card} store={store} onDone={() => setSettling(false)} />;
  }

  const representation = card.representation;

  if (!representation) {
    return (
      <Deepen
        card={card}
        store={store}
        onClose={onClose}
        onEstablish={() => setSettling(true)}
      />
    );
  }

  const template = builtInTemplate(representation.kind);

  return (
    <aside className={styles.inspector} aria-label={`${representation.kind} details`}>
      <header className={styles.inspectorHead}>
        <div className={styles.inspectorTop}>
          <span className={styles.kindMark}>{template.name}</span>
          <CloseFocus onClose={onClose} />
        </div>
        <NameField card={card} store={store} />
        <TruthBar card={card} store={store} onEstablish={() => setSettling(true)} />
      </header>

      {template.claims.length > 0 ? (
        <section className={styles.inspectorSection}>
          <h4 className={styles.inspectorHeading}>
            About
            {/* Naming the epistemics where they are edited, not in a tooltip. */}
            <span className={styles.inspectorNote}>asserted, sourced, ruled on</span>
          </h4>
          {template.claims.map((def) => (
            <ClaimField key={def.key} card={card} store={store} def={def} />
          ))}
        </section>
      ) : null}

      <Connections card={card} onFollow={onFollow} />

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

/** Claims that could still be established: everything not already Ink. */
function establishable(card: DeskCard): readonly Claim[] {
  return card.claims.filter((claim) => claim.truthState !== "ink");
}

/**
 * How settled this object is, and the way to change it.
 *
 * Maturity sits under the name because it is a property of the thing, not of
 * any assertion about it — and the control that changes it is a button that
 * opens a preview, never a toggle that establishes on click. Ink requires
 * seeing what is about to become Ink.
 */
function TruthBar({
  card,
  store,
  onEstablish
}: {
  card: DeskCard;
  store: DeskStore;
  onEstablish: () => void;
}) {
  const nothingLeft = card.maturity === "ink" && establishable(card).length === 0;

  return (
    <div className={styles.truthBar}>
      <MaturityCue state={card.maturity} />

      {card.maturity === "ink" ? (
        <button
          type="button"
          className={styles.truthAction}
          onClick={() => store.settle(card.objectId, { maturity: "pencil" })}
          title="Return this to Pencil. What it says is kept; it stops being settled."
        >
          Unsettle
        </button>
      ) : null}

      {nothingLeft ? (
        <span className={styles.inspectorNote}>everything here is established</span>
      ) : (
        <button type="button" className={styles.truthActionStrong} onClick={onEstablish}>
          Establish…
        </button>
      )}
    </div>
  );
}

/**
 * The previewed act that establishes Ink.
 *
 * Invariant, stated plainly: Ink is established only by an explicit, previewed
 * GM action. So this shows exactly what is about to become established, one
 * line per thing, and commits the lot as a single change set — establishing an
 * object and the four claims beside it is one intent, not five.
 *
 * It only ever promotes. Withdrawing is about one thing at a time and belongs
 * beside that thing, where the GM can see what they are pulling back.
 */
function EstablishSheet({
  card,
  store,
  onDone
}: {
  card: DeskCard;
  store: DeskStore;
  onDone: () => void;
}) {
  const pending = useMemo(() => establishable(card), [card]);
  const canSettleObject = card.maturity !== "ink";

  const [object, setObject] = useState(canSettleObject);
  // Contested claims start unticked. Establishing something Relic has been told
  // is disputed should take one more deliberate act than establishing something
  // merely unresolved.
  const [chosen, setChosen] = useState<ReadonlySet<string>>(
    () => new Set(pending.filter((c) => c.truthState === "pencil").map((c) => c.id as string))
  );

  const title = cardTitle(card) || "this";
  const kind = card.representation ? builtInTemplate(card.representation.kind).name : "Fragment";
  const count = (object ? 1 : 0) + chosen.size;

  const toggle = (id: string) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    store.settle(card.objectId, {
      maturity: object ? "ink" : null,
      claims: pending
        .filter((claim) => chosen.has(claim.id))
        .map((claim) => ({ claimId: claim.id, truth: "ink" as const }))
    });
    onDone();
  };

  return (
    <aside className={styles.inspector} aria-label={`Establish ${title}`}>
      <header className={styles.inspectorHead}>
        <div className={styles.inspectorTop}>
          <span className={styles.kindMark}>Establish</span>
          <CloseFocus onClose={onDone} />
        </div>
        <p className={styles.inspectorLead}>{title}</p>
        <p className={styles.establishNote}>
          Ink is what this world can be built on. Nothing below changes until you
          confirm, and everything you confirm is recorded as yours.
        </p>
      </header>

      <section className={styles.inspectorSection}>
        <h4 className={styles.inspectorHeading}>
          Becoming Ink
          <span className={styles.inspectorNote}>{count} selected</span>
        </h4>

        <ul className={styles.establishList}>
          {canSettleObject ? (
            <li>
              <label className={styles.establishRow}>
                <input
                  type="checkbox"
                  checked={object}
                  onChange={(event) => setObject(event.target.checked)}
                />
                <span className={styles.establishKind}>the {kind.toLowerCase()}</span>
                <span className={styles.establishValue}>
                  {title}
                  <span className={styles.establishMeaning}>
                    settled enough to build on
                  </span>
                </span>
              </label>
            </li>
          ) : null}

          {pending.map((claim) => (
            <li key={claim.id}>
              <label className={styles.establishRow}>
                <input
                  type="checkbox"
                  checked={chosen.has(claim.id)}
                  onChange={() => toggle(claim.id)}
                />
                <span className={styles.establishKind}>{claim.claimKind}</span>
                <span className={styles.establishValue}>
                  {claim.value}
                  {/* Contested material says so here, where the decision is
                      being made — establishing a disputed claim is resolving
                      the dispute, and the GM should know that is what they are
                      doing. */}
                  {claim.truthState === "disputed" ? (
                    <span className={styles.establishMeaning}>
                      contested — establishing settles it
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>

        {!canSettleObject && pending.length === 0 ? (
          <p className={styles.inspectorLead}>There is nothing left to establish here.</p>
        ) : null}
      </section>

      <div className={styles.establishActions}>
        <button type="button" className={styles.truthAction} onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.establishConfirm}
          disabled={count === 0}
          onClick={confirm}
        >
          Establish {count === 1 ? "1 thing" : `${count} things`}
        </button>
      </div>
    </aside>
  );
}

/**
 * Everything this object is connected to, and the way to follow it.
 *
 * Both directions, because they are different statements and both are true:
 * what Mara says about herself, and what the world says about Mara. Following
 * one deepens into the other end rather than navigating anywhere — and if that
 * end is not on this composition, it is brought here first.
 */
function Connections({
  card,
  onFollow
}: {
  card: DeskCard;
  onFollow: (link: Link) => void;
}) {
  if (card.links.length === 0) return null;

  return (
    <section className={styles.inspectorSection}>
      <h4 className={styles.inspectorHeading}>
        Connected
        <span className={styles.inspectorNote}>{card.links.length} in this world</span>
      </h4>
      <ul className={styles.linkList}>
        {card.links.map((link) => (
          <li key={`${link.claimId}-${link.direction}`}>
            <button
              type="button"
              className={styles.linkRow}
              onClick={() => onFollow(link)}
              title={
                link.direction === "out"
                  ? `This ${link.claimKind}: ${link.other.label}`
                  : `${link.other.label} — ${link.claimKind}: this`
              }
            >
              {/* Direction reads as a word and an arrow, never as position
                  alone: which way a relationship was asserted is meaning. */}
              <span className={styles.linkRelation}>
                {link.direction === "out" ? "→" : "←"} {link.claimKind}
              </span>
              <span className={styles.linkName}>{link.other.label}</span>
              {link.other.kind ? (
                <span className={styles.linkKind}>{link.other.kind}</span>
              ) : null}
              <TruthMark state={link.truthState} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The one gesture that turns captured thought into a kind of thing. */
function Deepen({
  card,
  store,
  onClose,
  onEstablish
}: {
  card: DeskCard;
  store: DeskStore;
  onClose: () => void;
  onEstablish: () => void;
}) {
  return (
    <aside className={styles.inspector} aria-label="Give this a kind">
      <header className={styles.inspectorHead}>
        <div className={styles.inspectorTop}>
          <span className={styles.kindMark}>Fragment</span>
          <CloseFocus onClose={onClose} />
        </div>
        <p className={styles.inspectorLead}>
          {cardTitle(card) || "An unwritten thought"}
        </p>
        {/* A Fragment can be settled without ever becoming a kind of thing. A
            note that is simply true is real world material, and demanding it be
            classified first would be structure blocking thought. */}
        <TruthBar card={card} store={store} onEstablish={onEstablish} />
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

/** Leaving Focus must not require knowing that Escape does it. */
function CloseFocus({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className={styles.inspectorClose}
      onClick={onClose}
      aria-label="Close"
      title="Close (Esc)"
    >
      ×
    </button>
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
  def: ClaimDef;
}) {
  const existing = card.claims.find((claim) => claim.claimKind === def.key);
  const [draft, setDraft] = useState(existing?.value ?? "");
  const settled = useRef(existing?.value ?? "");
  /**
   * Established truth is not edited by landing in a field.
   *
   * "Ink is never silently rewritten" is an invariant, and a blur handler that
   * quietly rewrote an established claim would break it every time a GM tabbed
   * through the panel. So an Ink claim is read-only until a deliberate act
   * unlocks it — and revising it returns it to Pencil, because the words have
   * changed and nobody has yet decided the new ones are so.
   */
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    const incoming = existing?.value ?? "";
    if (incoming !== settled.current) {
      settled.current = incoming;
      setDraft(incoming);
    }
  }, [existing?.value]);

  useEffect(() => setRevising(false), [card.objectId, existing?.id]);

  /**
   * Commits what was typed.
   *
   * `link` is what makes this a relationship instead of a phrase. Without one
   * the claim is still a claim — a template naming a field "Location" must not
   * refuse a place that has never been captured. That is law: thought before
   * structure.
   */
  const commit = (text: string, link?: ObjectRef) => {
    const next = text.trim();
    if (next === settled.current && !link) return;
    settled.current = next;
    // Emptying a claim retracts it. Relic stops believing something rather
    // than believing it to be blank.
    if (next === "") {
      if (existing) store.retract(card.objectId, existing.id);
      return;
    }
    store.assert(card.objectId, def.key, next, link ?? null);
    setRevising(false);
  };

  const bound = existing?.objectValue != null;
  const locked = existing?.truthState === "ink" && !revising;

  return (
    <div className={styles.claimBlock}>
      <div className={styles.inspectorField}>
        <span className={styles.inspectorLabel} id={`claim-${def.key}`}>
          {def.label}
        </span>

        <div className={styles.claimEntry}>
          <input
            className={styles.inspectorInput}
            value={draft}
            aria-labelledby={`claim-${def.key}`}
            data-linked={bound || undefined}
            data-locked={locked || undefined}
            readOnly={locked}
            title={locked ? "Established. Revise to change what it says." : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          {def.relational && !locked ? (
            <Suggestions
              query={draft}
              subject={card.objectId}
              store={store}
              bound={bound}
              onPick={(ref) => {
                setDraft(ref.label);
                commit(ref.label, ref);
              }}
            />
          ) : null}
        </div>

        {existing ? <TruthMark state={existing.truthState} /> : null}
      </div>

      {existing ? (
        <div className={styles.claimMeta}>
          <ProvenanceLine
            provenance={existing.provenance}
            settled={existing.settled}
            truth={existing.truthState}
          />
          <ClaimActions
            claim={existing}
            store={store}
            objectId={card.objectId}
            revising={revising}
            onRevise={() => setRevising(true)}
          />
        </div>
      ) : null}

      {revising ? (
        <p className={styles.claimHint}>
          Changing what this says returns it to Pencil. Establish it again when you
          mean it.
        </p>
      ) : null}
    </div>
  );
}

/**
 * What can be decided about one assertion.
 *
 * Contextual rather than resident: revealed on hover and whenever anything in
 * the row has keyboard focus, so the controls are reachable without a pointer
 * and absent while the GM is reading. Every state offers exactly two moves, and
 * none of them fires without being aimed at.
 */
function ClaimActions({
  claim,
  store,
  objectId,
  revising,
  onRevise
}: {
  claim: Claim;
  store: DeskStore;
  objectId: WorldObjectId;
  revising: boolean;
  onRevise: () => void;
}) {
  const rule = (truth: Claim["truthState"]) =>
    store.settle(objectId, { claims: [{ claimId: claim.id, truth }] });

  return (
    <div className={styles.claimActions}>
      {claim.truthState === "ink" ? (
        <>
          {!revising ? (
            <button type="button" className={styles.truthAction} onClick={onRevise}>
              Revise
            </button>
          ) : null}
          <button
            type="button"
            className={styles.truthAction}
            onClick={() => rule("pencil")}
            title="Stop treating this as established. What it says is kept."
          >
            Withdraw
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.truthActionStrong}
            onClick={() => rule("ink")}
            title="Establish this. Recorded as yours."
          >
            Establish
          </button>
          <button
            type="button"
            className={styles.truthAction}
            onClick={() => rule(claim.truthState === "disputed" ? "pencil" : "disputed")}
          >
            {claim.truthState === "disputed" ? "Undispute" : "Dispute"}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Objects that could be what was just typed.
 *
 * Deliberately not a required picker. Typing wins; this only offers to make the
 * text mean an identity, and says plainly when it already does — because the
 * difference between "she is at the Quay" and "she is at *the Quay*" is whether
 * Relic can follow it.
 */
function Suggestions({
  query,
  subject,
  store,
  bound,
  onPick
}: {
  query: string;
  subject: WorldObjectId;
  store: DeskStore;
  bound: boolean;
  onPick: (ref: ObjectRef) => void;
}) {
  const [matches, setMatches] = useState<readonly ObjectRef[]>([]);
  const [open, setOpen] = useState(false);
  const { findObjects } = store;

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setMatches([]);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      const found = await findObjects(text, subject);
      if (live) setMatches(found);
    }, 180);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [findObjects, query, subject]);

  if (bound) {
    return (
      <span className={styles.linkedMark} title="Points at a thing in this world">
        LINKED
      </span>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className={styles.suggestWrap}>
      <button
        type="button"
        className={styles.suggestToggle}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        title="Point this at something in the world"
      >
        link
      </button>
      {open ? (
        <div className={styles.suggestMenu} role="menu">
          {matches.map((ref) => (
            <button
              key={ref.objectId}
              type="button"
              role="menuitem"
              className={styles.suggestItem}
              // Pointer-down, not click: the input blurs first otherwise, and
              // the blur commits the plain text before the pick can land.
              onMouseDown={(event) => {
                event.preventDefault();
                setOpen(false);
                onPick(ref);
              }}
            >
              <span className={styles.suggestName}>{ref.label}</span>
              {ref.kind ? <span className={styles.linkKind}>{ref.kind}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
