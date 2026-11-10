-- Relationship identity survives claim corrections. A relationship remains a
-- claim projection, not a new world-object/table, while each claim revision can
-- retain the same semantic identity.
alter table public.claims
  add column relationship_id uuid;

-- Existing relational claims begin with their current claim identity. Plain
-- narrative attributes remain null and therefore never become relationships by
-- migration side effect.
update public.claims
   set relationship_id = id
 where object_value is not null
   and relationship_id is null;

create index claims_by_relationship_id
  on public.claims (relationship_id, lifecycle)
  where relationship_id is not null;
