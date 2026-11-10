---
id: SET-002
status: active
kind: component
authority: current
system: SYS-17
family: personal-shell
storybook: component
depends_on:
- SET-010
- SET-011
platforms:
- web
---

# SET-002 — Account & Identity

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Owns personal account identity and authentication/account-management entry points.

## Content

Where supported:
- display name;
- account email;
- authentication/password management entry;
- sign out;
- account export entry;
- delete-account entry.

Authentication-specific UX can defer to the chosen auth provider where appropriate.

## Boundary

Do not place:
- Saga preferences;
- mechanics;
- Librarian authority;
- recording retention;
- campaign metadata

in personal Account settings.

## Security

Sensitive authentication changes require the normal identity/re-authentication safeguards
of the auth system.

Do not expose provider secrets or internal identifiers.

## Relationships

- [[SET-010 — Data Export & Ownership]]
- [[SET-011 — Archive Delete & Protected Actions]]

## Handoff

Build **SET-002 — Account & Identity** as intentionally conventional account management.
