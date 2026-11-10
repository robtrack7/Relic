-- Board-only visual presentation. This is deliberately separate from World
-- Object representation fields and cannot carry semantic truth.
alter table public.composition_items
  add column if not exists presentation jsonb not null default '{}'::jsonb;

alter table public.composition_items
  drop constraint if exists composition_items_presentation_shape;

alter table public.composition_items
  add constraint composition_items_presentation_shape check (
    jsonb_typeof(presentation) = 'object'
    and (not (presentation ? 'tint') or presentation->>'tint' in ('paper', 'sand', 'sage', 'slate', 'rose'))
  );
