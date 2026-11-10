-- Board composition only: no new world identity and no relationship claims.
alter table public.compositions
  add column spatial_collections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(spatial_collections) = 'array'),
  add column spatial_version integer not null default 1 check (spatial_version > 0);
