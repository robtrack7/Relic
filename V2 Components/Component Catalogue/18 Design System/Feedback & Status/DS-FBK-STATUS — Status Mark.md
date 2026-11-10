---
id: DS-FBK-STATUS
status: active
kind: component
authority: current
system: SYS-18
family: ds-fbk
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
- DS-TRUST
platforms:
- web
---

# DS-FBK-STATUS — Status Mark

## Purpose

Restrained inline metadata treatment for a state the user genuinely needs to understand, such as Ready, LIVE, REC, Proposed or a usage warning. Domain systems define the meaning; this component defines consistent presentation.

## Rules

- do not create a mark for every database enum;
- do not rely on colour alone;
- keep text/icon treatment legible at small sizes;
- use quiet metadata typography before reaching for a filled pill;
- Pencil/Ink, Proposed/Pending/Settled and historical state are independent dimensions and must not collapse into one generic badge language.

## Storybook / manual test

Neutral, warning, live/recording, proposed/pending, icon+text and text-only treatments; adjacent metadata; long label; and high-density Stage examples.
