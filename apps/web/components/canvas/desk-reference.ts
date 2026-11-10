import type { ProxyPlacement } from "./canvas-foundation";

/** A small, composition-only scene. These proxies do not create world identities. */
export const BLACKWATER_DESK: readonly ProxyPlacement[] = [
  {
    id: "p-004", kind: "place", title: "The Drowned Bell",
    note: "At low tide its bronze crown breaks the black water.",
    image: { src: "/desk/blackwater-harbour.webp", alt: "A stone bell tower in a misty harbour, with fishing boats along the quay." },
    x: -190, y: -270, width: 388, height: 348, tone: "paper"
  },
  {
    id: "c-017", kind: "character", title: "Mara Vey",
    note: "Keeps a ledger of promises the harbour has not yet collected.",
    provenance: "Harbour records · 017",
    x: -510, y: -150, width: 268, height: 216, tone: "paper"
  },
  {
    id: "t-011", kind: "thread", title: "Three knocks beneath the quay",
    note: "The same rhythm was heard before every missing boat. Last heard at the western steps.",
    x: 266, y: -150, width: 280, height: 228, tone: "sage"
  },
  {
    id: "s-002", kind: "source", title: "Tide ledger, folio 9",
    note: "“The bell rang at the turning tide.\nNo one was in the tower.”",
    provenance: "Blackwater archive · folio 9",
    presentation: "record",
    x: -410, y: 142, width: 314, height: 244, tone: "archive"
  },
  {
    id: "f-031", kind: "fragment", title: "Who still remembers the lighthouse?",
    note: "Ask Mara before the next low tide.",
    presentation: "note",
    x: 34, y: 172, width: 314, height: 182, tone: "paper"
  }
];
