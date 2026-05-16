-- Run this in Supabase SQL Editor if you already created the first schema.
-- It lets the app create a new group with group name + user name,
-- with an optional access code. If no code is provided, the group is created
-- without a code.

alter table public.burakeros_groups
add column if not exists creator_name text;

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

grant execute on function public.create_burakeros_group_v2(text, text, text) to anon, authenticated;
revoke all on function public.resolve_burakeros_group_id_v2(text, text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_burakeros_group_v2(text, text, text) to anon, authenticated;
grant execute on function public.list_burakeros_games_v2(text, text, text) to anon, authenticated;
grant execute on function public.upsert_burakeros_game_v2(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.delete_burakeros_game_v2(text, text, text, text) to anon, authenticated;
