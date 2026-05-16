# Burakeros Supabase setup

1. Create a Supabase project.
2. Make sure you are in the main project database, not a read replica/readonly connection.
3. Optional check in **SQL Editor**:

```sql
select extensions.crypt('test', extensions.gen_salt('bf'));
```

If that fails because `crypt` or `gen_salt` does not exist, enable `pgcrypto` from **Database > Extensions** in the Supabase dashboard.

4. Open **SQL Editor**.
5. Paste and run `schema.sql`.
6. Create your first group from the app, or with SQL if you want a starter group:

```sql
select public.create_burakeros_group('Familia Burakeros', 'cambia-esta-clave');
```

Keep access codes private when you use them. A group can also be created without a code; in that case the app reconnects by group name + user name.

Useful RPC calls for the frontend later:

```js
await supabase.rpc("create_burakeros_group_v2", {
  p_name: groupName,
  p_user_name: userName,
  p_access_code: accessCode || null,
});

await supabase.rpc("get_burakeros_group_v2", {
  p_name: groupName || null,
  p_user_name: userName,
  p_access_code: accessCode || null,
});

await supabase.rpc("list_burakeros_games_v2", {
  p_name: groupName || null,
  p_user_name: userName,
  p_access_code: accessCode || null,
});

await supabase.rpc("upsert_burakeros_game_v2", {
  p_name: groupName || null,
  p_user_name: userName,
  p_access_code: accessCode || null,
  p_game: gameHistoryEntry,
});

await supabase.rpc("delete_burakeros_game_v2", {
  p_name: groupName || null,
  p_user_name: userName,
  p_access_code: accessCode || null,
  p_client_game_id: gameId,
});
```

The `upsert_burakeros_game_v2` function preserves the original `date` for an existing `gameId`, so editing a historical game does not change its date.
