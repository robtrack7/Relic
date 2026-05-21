insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio', 'audio', false, 52428800, null),
  ('attachments', 'attachments', false, 52428800, null),
  ('exports', 'exports', false, 52428800, null)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_path_segment(path text, segment_index int)
returns text
language sql
immutable
as $$
  select nullif((string_to_array(path, '/'))[segment_index], '');
$$;
