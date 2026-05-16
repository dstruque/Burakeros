-- Burakeros Supabase schema
-- Paste this whole file into Supabase SQL Editor and run it once.
-- Requires the pgcrypto extension for extensions.crypt(), extensions.gen_salt(),
-- and extensions.gen_random_uuid().
-- In Supabase this is usually already available. If crypt() is missing,
-- enable pgcrypto from Dashboard > Database > Extensions.

create table if not exists public.burakeros_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  creator_name text,
  access_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.burakeros_games (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.burakeros_groups(id) on delete cascade,
  client_game_id text not null,
  game_date timestamptz not null default now(),
  round_target integer not null default 3000,
  players text[] not null default '{}',
  ranking jsonb not null default '[]'::jsonb,
  rounds_summary jsonb not null default '[]'::jsonb,
  round_details jsonb not null default '[]'::jsonb,
  game_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, client_game_id)
);

create index if not exists burakeros_games_group_date_idx
  on public.burakeros_games (group_id, game_date desc);

create index if not exists burakeros_games_round_target_idx
  on public.burakeros_games (group_id, round_target);

alter table public.burakeros_groups enable row level security;
alter table public.burakeros_games enable row level security;

-- No direct table policies on purpose.
-- The frontend should use the RPC functions below, so access-code hashes never leave the DB.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists burakeros_groups_touch_updated_at on public.burakeros_groups;
create trigger burakeros_groups_touch_updated_at
before update on public.burakeros_groups
for each row execute function public.touch_updated_at();

drop trigger if exists burakeros_games_touch_updated_at on public.burakeros_games;
create trigger burakeros_games_touch_updated_at
before update on public.burakeros_games
for each row execute function public.touch_updated_at();

create or replace function public.create_burakeros_group(
  p_name text,
  p_access_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'Group name is required';
  end if;

  if length(trim(coalesce(p_access_code, ''))) < 6 then
    raise exception 'Access code must have at least 6 characters';
  end if;

  insert into public.burakeros_groups (name, access_code_hash)
  values (
    trim(p_name),
    extensions.crypt(trim(p_access_code), extensions.gen_salt('bf'))
  )
  returning id into v_group_id;

  return v_group_id;
end;
$$;

create or replace function public.create_burakeros_group_v2(
  p_name text,
  p_user_name text,
  p_access_code text default null
)
returns table (
  group_id uuid,
  group_name text,
  access_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_access_code text;
  v_access_code_hash text;
begin
  if length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'Group name is required';
  end if;

  if length(trim(coalesce(p_user_name, ''))) < 1 then
    raise exception 'User name is required';
  end if;

  v_access_code := nullif(trim(coalesce(p_access_code, '')), '');
  v_access_code_hash := case
    when v_access_code is null then ''
    else extensions.crypt(v_access_code, extensions.gen_salt('bf'))
  end;

  insert into public.burakeros_groups (
    name,
    creator_name,
    access_code_hash
  )
  values (
    trim(p_name),
    trim(p_user_name),
    v_access_code_hash
  )
  returning id into v_group_id;

  return query select v_group_id, trim(p_name), v_access_code;
end;
$$;

create or replace function public.resolve_burakeros_group_id_v2(
  p_name text,
  p_user_name text,
  p_access_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access_code text;
  v_group_name text;
  v_user_name text;
  v_group_id uuid;
begin
  v_access_code := nullif(trim(coalesce(p_access_code, '')), '');
  v_group_name := trim(coalesce(p_name, ''));
  v_user_name := trim(coalesce(p_user_name, ''));

  if v_access_code is not null then
    select g.id
    into v_group_id
    from public.burakeros_groups g
    where g.access_code_hash <> ''
      and g.access_code_hash = extensions.crypt(v_access_code, g.access_code_hash)
    limit 1;
  else
    select g.id
    into v_group_id
    from public.burakeros_groups g
    where g.access_code_hash = ''
      and lower(g.name) = lower(v_group_name)
      and lower(coalesce(g.creator_name, '')) = lower(v_user_name)
    order by g.created_at desc
    limit 1;
  end if;

  return v_group_id;
end;
$$;

create or replace function public.get_burakeros_group_v2(
  p_name text,
  p_user_name text,
  p_access_code text default null
)
returns table (
  group_id uuid,
  group_name text
)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name
  from public.burakeros_groups g
  where g.id = public.resolve_burakeros_group_id_v2(p_name, p_user_name, p_access_code)
  limit 1;
$$;

create or replace function public.list_burakeros_games_v2(
  p_name text,
  p_user_name text,
  p_access_code text default null
)
returns table (
  id uuid,
  client_game_id text,
  game_date timestamptz,
  round_target integer,
  players text[],
  ranking jsonb,
  rounds_summary jsonb,
  round_details jsonb,
  game_data jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  v_group_id := public.resolve_burakeros_group_id_v2(
    p_name,
    p_user_name,
    p_access_code
  );

  if v_group_id is null then
    raise exception 'Invalid group';
  end if;

  return query
    select
      game.id,
      game.client_game_id,
      game.game_date,
      game.round_target,
      game.players,
      game.ranking,
      game.rounds_summary,
      game.round_details,
      game.game_data,
      game.updated_at
    from public.burakeros_games game
    where game.group_id = v_group_id
    order by game.game_date desc, game.created_at desc;
end;
$$;

create or replace function public.upsert_burakeros_game_v2(
  p_name text,
  p_user_name text,
  p_access_code text,
  p_game jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_game_id uuid;
  v_client_game_id text;
  v_existing_date timestamptz;
  v_players text[];
begin
  v_group_id := public.resolve_burakeros_group_id_v2(
    p_name,
    p_user_name,
    p_access_code
  );

  if v_group_id is null then
    raise exception 'Invalid group';
  end if;

  v_client_game_id := coalesce(
    nullif(p_game->>'gameId', ''),
    extensions.gen_random_uuid()::text
  );

  select game_date
  into v_existing_date
  from public.burakeros_games
  where group_id = v_group_id and client_game_id = v_client_game_id;

  select coalesce(array_agg(value), '{}')
  into v_players
  from jsonb_array_elements_text(coalesce(p_game->'players', '[]'::jsonb)) as value;

  insert into public.burakeros_games (
    group_id,
    client_game_id,
    game_date,
    round_target,
    players,
    ranking,
    rounds_summary,
    round_details,
    game_data
  )
  values (
    v_group_id,
    v_client_game_id,
    coalesce(v_existing_date, nullif(p_game->>'date', '')::timestamptz, now()),
    coalesce(nullif(p_game->>'roundTarget', '')::integer, 3000),
    v_players,
    coalesce(p_game->'ranking', '[]'::jsonb),
    coalesce(p_game->'rounds', '[]'::jsonb),
    coalesce(p_game->'roundDetails', '[]'::jsonb),
    p_game
  )
  on conflict (group_id, client_game_id)
  do update set
    round_target = excluded.round_target,
    players = excluded.players,
    ranking = excluded.ranking,
    rounds_summary = excluded.rounds_summary,
    round_details = excluded.round_details,
    game_data = excluded.game_data
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create or replace function public.delete_burakeros_game_v2(
  p_name text,
  p_user_name text,
  p_access_code text,
  p_client_game_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  v_group_id := public.resolve_burakeros_group_id_v2(
    p_name,
    p_user_name,
    p_access_code
  );

  if v_group_id is null then
    raise exception 'Invalid group';
  end if;

  delete from public.burakeros_games
  where group_id = v_group_id
    and client_game_id = p_client_game_id;
end;
$$;

create or replace function public.get_burakeros_group(
  p_access_code text
)
returns table (
  group_id uuid,
  group_name text
)
language sql
security definer
set search_path = public
as $$
  select id, name
  from public.burakeros_groups
  where access_code_hash = extensions.crypt(trim(p_access_code), access_code_hash)
  limit 1;
$$;

create or replace function public.list_burakeros_games(
  p_access_code text
)
returns table (
  id uuid,
  client_game_id text,
  game_date timestamptz,
  round_target integer,
  players text[],
  ranking jsonb,
  rounds_summary jsonb,
  round_details jsonb,
  game_data jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select g.id
  into v_group_id
  from public.burakeros_groups g
  where g.access_code_hash = extensions.crypt(trim(p_access_code), g.access_code_hash)
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid access code';
  end if;

  return query
    select
      game.id,
      game.client_game_id,
      game.game_date,
      game.round_target,
      game.players,
      game.ranking,
      game.rounds_summary,
      game.round_details,
      game.game_data,
      game.updated_at
    from public.burakeros_games game
    where game.group_id = v_group_id
    order by game.game_date desc, game.created_at desc;
end;
$$;

create or replace function public.upsert_burakeros_game(
  p_access_code text,
  p_game jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_game_id uuid;
  v_client_game_id text;
  v_existing_date timestamptz;
  v_players text[];
begin
  select g.id
  into v_group_id
  from public.burakeros_groups g
  where g.access_code_hash = extensions.crypt(trim(p_access_code), g.access_code_hash)
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid access code';
  end if;

  v_client_game_id := coalesce(
    nullif(p_game->>'gameId', ''),
    extensions.gen_random_uuid()::text
  );

  select game_date
  into v_existing_date
  from public.burakeros_games
  where group_id = v_group_id and client_game_id = v_client_game_id;

  select coalesce(array_agg(value), '{}')
  into v_players
  from jsonb_array_elements_text(coalesce(p_game->'players', '[]'::jsonb)) as value;

  insert into public.burakeros_games (
    group_id,
    client_game_id,
    game_date,
    round_target,
    players,
    ranking,
    rounds_summary,
    round_details,
    game_data
  )
  values (
    v_group_id,
    v_client_game_id,
    coalesce(v_existing_date, nullif(p_game->>'date', '')::timestamptz, now()),
    coalesce(nullif(p_game->>'roundTarget', '')::integer, 3000),
    v_players,
    coalesce(p_game->'ranking', '[]'::jsonb),
    coalesce(p_game->'rounds', '[]'::jsonb),
    coalesce(p_game->'roundDetails', '[]'::jsonb),
    p_game
  )
  on conflict (group_id, client_game_id)
  do update set
    round_target = excluded.round_target,
    players = excluded.players,
    ranking = excluded.ranking,
    rounds_summary = excluded.rounds_summary,
    round_details = excluded.round_details,
    game_data = excluded.game_data
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create or replace function public.delete_burakeros_game(
  p_access_code text,
  p_client_game_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select g.id
  into v_group_id
  from public.burakeros_groups g
  where g.access_code_hash = extensions.crypt(trim(p_access_code), g.access_code_hash)
  limit 1;

  if v_group_id is null then
    raise exception 'Invalid access code';
  end if;

  delete from public.burakeros_games
  where group_id = v_group_id
    and client_game_id = p_client_game_id;
end;
$$;

revoke all on public.burakeros_groups from anon, authenticated;
revoke all on public.burakeros_games from anon, authenticated;

grant execute on function public.create_burakeros_group(text, text) to anon, authenticated;
grant execute on function public.create_burakeros_group_v2(text, text, text) to anon, authenticated;
revoke all on function public.resolve_burakeros_group_id_v2(text, text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_burakeros_group(text) to anon, authenticated;
grant execute on function public.get_burakeros_group_v2(text, text, text) to anon, authenticated;
grant execute on function public.list_burakeros_games(text) to anon, authenticated;
grant execute on function public.list_burakeros_games_v2(text, text, text) to anon, authenticated;
grant execute on function public.upsert_burakeros_game(text, jsonb) to anon, authenticated;
grant execute on function public.upsert_burakeros_game_v2(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.delete_burakeros_game(text, text) to anon, authenticated;
grant execute on function public.delete_burakeros_game_v2(text, text, text, text) to anon, authenticated;
