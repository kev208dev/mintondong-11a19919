-- Record bounded source pagination without changing tournament data.
begin;

alter table public.tournament_sync_runs
  add column if not exists page_count integer not null default 0
  check (page_count >= 0);
alter table public.tournament_sync_runs
  add column if not exists failed_count integer not null default 0
  check (failed_count >= 0);

comment on column public.tournament_sync_runs.page_count is
  'Number of bounded source pages fetched for this sync run.';
comment on column public.tournament_sync_runs.failed_count is
  'Number of source rows rejected during normalization, or one when the source run failed.';

commit;
