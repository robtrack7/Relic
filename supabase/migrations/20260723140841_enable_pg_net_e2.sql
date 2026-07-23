-- Required by the E2 pg_cron dispatch jobs. Supabase installs the callable
-- routines in schema net even when the extension object is owned by extensions.
create extension if not exists pg_net with schema extensions;
