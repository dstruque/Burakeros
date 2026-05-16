import {
  ACTIVE_GAME_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  LAST_PLAYERS_STORAGE_KEY,
  ONLINE_ACCESS_CODE_STORAGE_KEY,
  ONLINE_GROUP_NAME_STORAGE_KEY,
  ONLINE_USER_STORAGE_KEY,
} from "./constants";

export function createGameId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error(e);
  }
}

export function loadOnlineAccessCode() {
  try {
    return localStorage.getItem(ONLINE_ACCESS_CODE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveOnlineAccessCode(accessCode) {
  try {
    if (accessCode) {
      localStorage.setItem(ONLINE_ACCESS_CODE_STORAGE_KEY, accessCode);
    } else {
      localStorage.removeItem(ONLINE_ACCESS_CODE_STORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadOnlineGroupName() {
  try {
    return localStorage.getItem(ONLINE_GROUP_NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveOnlineGroupName(groupName) {
  try {
    if (groupName) {
      localStorage.setItem(ONLINE_GROUP_NAME_STORAGE_KEY, groupName);
    } else {
      localStorage.removeItem(ONLINE_GROUP_NAME_STORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

export function loadOnlineUser() {
  try {
    return localStorage.getItem(ONLINE_USER_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveOnlineUser(userName) {
  try {
    if (userName) {
      localStorage.setItem(ONLINE_USER_STORAGE_KEY, userName);
    } else {
      localStorage.removeItem(ONLINE_USER_STORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

export function mapOnlineGameToHistoryEntry(game) {
  const gameData = game.game_data || {};

  return {
    ...gameData,
    gameId: game.client_game_id || gameData.gameId,
    date: game.game_date || gameData.date,
    updatedAt: game.updated_at || gameData.updatedAt,
    players: game.players || gameData.players || [],
    roundTarget: game.round_target || gameData.roundTarget || 3000,
    ranking: game.ranking || gameData.ranking || [],
    rounds: game.rounds_summary || gameData.rounds || [],
    roundDetails: game.round_details || gameData.roundDetails || [],
  };
}

export function mergeHistoryEntries(localHistory, onlineHistory) {
  const entries = new Map();

  [...onlineHistory, ...localHistory].forEach((entry) => {
    const key = entry.gameId || entry.date;
    const existing = entries.get(key);

    if (!existing) {
      entries.set(key, entry);
      return;
    }

    const existingTime = new Date(existing.updatedAt || existing.date).getTime();
    const entryTime = new Date(entry.updatedAt || entry.date).getTime();

    if (
      (Number.isFinite(entryTime) ? entryTime : 0) >=
      (Number.isFinite(existingTime) ? existingTime : 0)
    ) {
      entries.set(key, entry);
    }
  });

  return Array.from(entries.values())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);
}

export function loadActiveGame() {
  try {
    const saved = localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveActiveGame(game) {
  try {
    localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(game));
  } catch (e) {
    console.error(e);
  }
}

export function clearActiveGame() {
  try {
    localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

export function loadLastPlayers() {
  try {
    const saved = localStorage.getItem(LAST_PLAYERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveLastPlayers(players) {
  try {
    localStorage.setItem(LAST_PLAYERS_STORAGE_KEY, JSON.stringify(players));
  } catch (e) {
    console.error(e);
  }
}
