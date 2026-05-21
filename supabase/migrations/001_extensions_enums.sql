set check_function_bodies = off;

create schema if not exists internal;
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;

create or replace function public.uuid7()
returns uuid
language sql
volatile
as $$
  select extensions.gen_random_uuid();
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'entity_type') then
    create type public.entity_type as enum ('character', 'place', 'faction', 'artifact', 'thread', 'session');
  end if;
  if not exists (select 1 from pg_type where typname = 'entity_canon_state') then
    create type public.entity_canon_state as enum ('canon', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'draft_canon_state') then
    create type public.draft_canon_state as enum ('raw_input', 'ai_draft');
  end if;
  if not exists (select 1 from pg_type where typname = 'draft_state') then
    create type public.draft_state as enum ('pending', 'approved', 'rejected', 'merged', 'superseded');
  end if;
  if not exists (select 1 from pg_type where typname = 'change_kind') then
    create type public.change_kind as enum ('create', 'update', 'merge', 'archive_request');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_action') then
    create type public.approval_action as enum ('approve', 'edit_and_approve', 'reject', 'merge');
  end if;
  if not exists (select 1 from pg_type where typname = 'confidence_band') then
    create type public.confidence_band as enum ('high', 'medium', 'low');
  end if;
  if not exists (select 1 from pg_type where typname = 'confidence_reason') then
    create type public.confidence_reason as enum (
      'direct_gm_input',
      'multiple_strong_sources',
      'single_clear_segment',
      'cross_session_consistency',
      'inferred_from_context',
      'ambiguous_source',
      'tonal_or_genre_match'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'relationship_kind') then
    create type public.relationship_kind as enum ('member-of', 'located-at', 'owns', 'allied-with', 'opposed-to', 'related-to');
  end if;
  if not exists (select 1 from pg_type where typname = 'note_type') then
    create type public.note_type as enum ('lore', 'gm_note', 'quick_capture', 'summary');
  end if;
  if not exists (select 1 from pg_type where typname = 'mention_state') then
    create type public.mention_state as enum ('suggested', 'accepted', 'dismissed', 'snoozed');
  end if;
  if not exists (select 1 from pg_type where typname = 'source_kind') then
    create type public.source_kind as enum ('transcript_segment', 'note', 'pasted_text', 'gm_manual_summary', 'existing_entity', 'workshop_input', 'gm_instruction');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_scope') then
    create type public.content_scope as enum ('world', 'saga');
  end if;
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type public.session_status as enum ('planned', 'ready', 'started', 'in_progress', 'ended_pending_undo', 'ended');
  end if;
  if not exists (select 1 from pg_type where typname = 'workshop_path') then
    create type public.workshop_path as enum ('build_with_ai', 'bring_your_notes', 'start_blank');
  end if;
  if not exists (select 1 from pg_type where typname = 'workshop_state') then
    create type public.workshop_state as enum ('in_progress', 'committed', 'abandoned');
  end if;
  if not exists (select 1 from pg_type where typname = 'pipeline_state') then
    create type public.pipeline_state as enum ('queued', 'transcribing', 'synthesizing', 'ready_for_review', 'closed', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'transcript_state') then
    create type public.transcript_state as enum ('pending', 'transcribing', 'complete', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'actor_kind') then
    create type public.actor_kind as enum ('gm', 'gm_via_ai_approval', 'gm_via_ai_suggestion_accept');
  end if;
  if not exists (select 1 from pg_type where typname = 'rejection_reason_tag') then
    create type public.rejection_reason_tag as enum (
      'hallucinated',
      'wrong_tone',
      'redundant',
      'ambiguous_source',
      'gm_already_changed',
      'stale_bulk_archive'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type public.notification_kind as enum (
      'pipeline_ready',
      'pipeline_failed',
      'pipeline_stale_30d',
      'pipeline_stale_90d',
      'transcription_complete',
      'synthesis_in_progress'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('email', 'push');
  end if;
  if not exists (select 1 from pg_type where typname = 'push_platform') then
    create type public.push_platform as enum ('ios', 'android', 'web');
  end if;
end $$;
