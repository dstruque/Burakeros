import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { toBlob } from "html-to-image";
import { hasSupabaseConfig, supabase } from "./supabaseClient";

import {
  ALL_TARGETS_VALUE,
  FACE_SETS,
  HISTORICAL_RANGE_DAYS_OPTIONS,
  ROTATIONS,
} from "./utils/constants";
import {
  bg,
  btn,
  faceWrapStyle,
  gameFaceReverseStyle,
  gameFaceStyle,
  gold,
  setupFaceReverseStyle,
  setupFaceStyle,
} from "./utils/styles";
import {
  calcSubScore,
  getCumulativeScores,
  getEndTypeInfo,
  getFilteredHistoricalGames,
  getHistoricalRangeLabel,
  getHistoricalRanking,
  getHistoricalTargetLabel,
  getHistoricalTargetOptions,
  getProgressiveRankings,
  getRoundTotals,
  getRoundWinner,
  hasRoundDetails,
} from "./utils/scoring";
import {
  clearActiveGame,
  createGameId,
  loadActiveGame,
  loadHistory,
  loadLastPlayers,
  loadOnlineAccessCode,
  loadOnlineGroupName,
  loadOnlineUser,
  mapOnlineGameToHistoryEntry,
  mergeHistoryEntries,
  saveActiveGame,
  saveHistory,
  saveLastPlayers,
  saveOnlineAccessCode,
  saveOnlineGroupName,
  saveOnlineUser,
} from "./utils/storage";
import { shareOrDownloadBlob, waitForImages } from "./utils/image";

import AppStyles from "./components/AppStyles";
import EndTypeSelector from "./components/EndTypeSelector";
import {
  HistoricalRankingImageCard,
  HistoricalRankingRows,
} from "./components/HistoricalRanking";
import MarioPartyChart from "./components/MarioPartyChart";
import PlayerAvatar from "./components/PlayerAvatar";
import SuitEasterEggs from "./components/SuitEasterEggs";
import TeamEntryPanel from "./components/TeamEntryPanel";
import WinningBanner from "./components/WinningBanner";

export default function BurakerosApp() {
  const [screen, setScreen] = useState("setup");
  const [historyReturnScreen, setHistoryReturnScreen] = useState("setup");

  const [players, setPlayers] = useState(["", "", "", ""]);
  const [showRules, setShowRules] = useState(false);
  const [roundTarget, setRoundTarget] = useState(3000);

  const [rounds, setRounds] = useState([[], [], []]);

  const [editingRound, setEditingRound] = useState(null);
  const [editingSubIdx, setEditingSubIdx] = useState(null);

  const [t1Pts, setT1Pts] = useState("");
  const [t2Pts, setT2Pts] = useState("");
  const [t1Buracos, setT1Buracos] = useState([]);
  const [t2Buracos, setT2Buracos] = useState([]);
  const [t1NoMuerto, setT1NoMuerto] = useState(false);
  const [t2NoMuerto, setT2NoMuerto] = useState(false);
  const [subEndType, setSubEndType] = useState(null);

  const [history, setHistory] = useState(() => loadHistory());
  const historyLoaded = true;
  const [historicalTarget, setHistoricalTarget] = useState(ALL_TARGETS_VALUE);
  const [historicalMetric, setHistoricalMetric] = useState("average");
  const [historicalRangeMode, setHistoricalRangeMode] = useState("overall");
  const [historicalRangeDays, setHistoricalRangeDays] = useState(30);
  const [onlineAccessCode, setOnlineAccessCode] = useState(() =>
    loadOnlineAccessCode()
  );
  const [onlineUserName, setOnlineUserName] = useState(() => loadOnlineUser());
  const [createdGroupCode, setCreatedGroupCode] = useState("");
  const [onlineGroupName, setOnlineGroupName] = useState(() =>
    loadOnlineGroupName()
  );
  const [onlineStatus, setOnlineStatus] = useState(
    hasSupabaseConfig ? "Desconectado" : "Supabase no configurado"
  );
  const [syncingOnline, setSyncingOnline] = useState(false);
  const [onlinePanelOpen, setOnlinePanelOpen] = useState(false);

  const [gameSaved, setGameSaved] = useState(false);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [savedGamePreview, setSavedGamePreview] = useState(() =>
    loadActiveGame()
  );
  const [forceRoundView, setForceRoundView] = useState(false);

  const [lastPlayers, setLastPlayers] = useState(() => loadLastPlayers());
  const [gameId, setGameId] = useState(null);

  const [faceSetIndex, setFaceSetIndex] = useState(0);
  const [heartFaces, setHeartFaces] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);

  const shareResultRef = useRef(null);
  const historicalRankingImageRef = useRef(null);

  const currentFaceSet = FACE_SETS[faceSetIndex];
  const headerFaces = heartFaces ? currentFaceSet.hearts : currentFaceSet.normal;

  const roundTotals = useMemo(() => getRoundTotals(rounds), [rounds]);

  const isRoundFinished = (rIdx) =>
    roundTotals[rIdx].t1 >= roundTarget ||
    roundTotals[rIdx].t2 >= roundTarget;

  const cumulativeScores = useMemo(
    () => getCumulativeScores(rounds, roundTotals, players),
    [rounds, roundTotals, players]
  );

  const ranking = useMemo(
    () =>
      players
        .map((name, i) => ({
          name,
          score: cumulativeScores[i],
          index: i,
        }))
        .sort((a, b) => b.score - a.score),
    [cumulativeScores, players]
  );

  const historicalTargetOptions = useMemo(
    () => getHistoricalTargetOptions(history),
    [history]
  );

  const historicalRanking = useMemo(
    () =>
      getHistoricalRanking(
        history,
        historicalTarget,
        historicalMetric,
        historicalRangeMode,
        historicalRangeDays
      ),
    [
      history,
      historicalTarget,
      historicalMetric,
      historicalRangeMode,
      historicalRangeDays,
    ]
  );

  const filteredHistoricalGamesCount = useMemo(
    () =>
      getFilteredHistoricalGames(
        history,
        historicalTarget,
        historicalRangeMode,
        historicalRangeDays
      ).length,
    [history, historicalTarget, historicalRangeMode, historicalRangeDays]
  );

  const historicalRangeLabel = useMemo(
    () => getHistoricalRangeLabel(historicalRangeMode, historicalRangeDays),
    [historicalRangeMode, historicalRangeDays]
  );

  const historicalTargetLabel = useMemo(
    () => getHistoricalTargetLabel(historicalTarget),
    [historicalTarget]
  );

  const allFinished = [0, 1, 2].every(isRoundFinished);

  const getActiveRound = () => {
    for (let i = 0; i < 3; i++) {
      if (!isRoundFinished(i)) return i;
    }

    return -1;
  };

  const resetInputs = () => {
    setT1Pts("");
    setT2Pts("");
    setT1Buracos([]);
    setT2Buracos([]);
    setT1NoMuerto(false);
    setT2NoMuerto(false);
    setSubEndType(null);
  };

  const resetFullSetup = () => {
    setPlayers(["", "", "", ""]);
    setRoundTarget(3000);
    setRounds([[], [], []]);
    setShowRules(false);
    setGameSaved(false);
    setHasActiveGame(false);
    setForceRoundView(false);
    setEditingRound(null);
    setEditingSubIdx(null);
    setGameId(null);
    resetInputs();
  };

  const cycleFaces = () => {
    setFaceSetIndex((prev) => (prev + 1) % FACE_SETS.length);
  };

  const toggleHeartFaces = () => {
    setHeartFaces((prev) => !prev);
  };

  const connectOnlineHistory = useCallback(async () => {
    const accessCode = onlineAccessCode.trim();
    const groupName = onlineGroupName.trim();
    const userName = onlineUserName.trim();

    if (!hasSupabaseConfig || !supabase) {
      setOnlineStatus("Supabase no configurado");
      return;
    }

    if (!userName) {
      setOnlineStatus("Ingresa tu usuario");
      return;
    }

    if (!groupName && !accessCode) {
      setOnlineStatus("Ingresa nombre o clave");
      return;
    }

    setSyncingOnline(true);
    setOnlineStatus("Conectando...");

    try {
      const { data: groupData, error: groupError } = await supabase.rpc(
        "get_burakeros_group_v2",
        {
          p_name: groupName || null,
          p_user_name: userName,
          p_access_code: accessCode || null,
        }
      );

      if (groupError) throw groupError;

      const group = groupData?.[0];

      if (!group) {
        setOnlineStatus("No encontré ese grupo");
        setOnlineGroupName("");
        saveOnlineGroupName("");
        return;
      }

      const { data: gamesData, error: gamesError } = await supabase.rpc(
        "list_burakeros_games_v2",
        {
          p_name: group.group_name,
          p_user_name: userName,
          p_access_code: accessCode || null,
        }
      );

      if (gamesError) throw gamesError;

      const onlineHistory = (gamesData || []).map(mapOnlineGameToHistoryEntry);
      const mergedHistory = mergeHistoryEntries(history, onlineHistory);

      setHistory(mergedHistory);
      saveHistory(mergedHistory);
      saveOnlineAccessCode(accessCode);
      saveOnlineGroupName(group.group_name);
      saveOnlineUser(userName);
      setOnlineGroupName(group.group_name);
      setOnlineStatus(
        `Conectado a ${group.group_name} · ${onlineHistory.length} online`
      );
    } catch (e) {
      console.error(e);
      setOnlineStatus("No se pudo conectar");
      setOnlineGroupName("");
      saveOnlineGroupName("");
    } finally {
      setSyncingOnline(false);
    }
  }, [history, onlineAccessCode, onlineGroupName, onlineUserName]);

  const createOnlineGroup = useCallback(async () => {
    const groupName = onlineGroupName.trim();
    const userName = onlineUserName.trim();
    const accessCode = onlineAccessCode.trim();

    if (!hasSupabaseConfig || !supabase) {
      setOnlineStatus("Supabase no configurado");
      return;
    }

    if (!userName) {
      setOnlineStatus("Ingresa tu usuario");
      return;
    }

    if (!groupName) {
      setOnlineStatus("Ponle nombre al grupo");
      return;
    }

    setSyncingOnline(true);
    setOnlineStatus("Creando grupo...");

    try {
      const { data, error } = await supabase.rpc("create_burakeros_group_v2", {
        p_name: groupName,
        p_user_name: userName,
        p_access_code: accessCode || null,
      });

      if (error) throw error;

      const created = data?.[0];

      setOnlineAccessCode(created.access_code || "");
      setCreatedGroupCode(created.access_code || "");
      setOnlineGroupName(created.group_name || groupName);
      saveOnlineAccessCode(created.access_code || "");
      saveOnlineGroupName(created.group_name || groupName);
      saveOnlineUser(userName);
      setOnlineStatus(
        created.access_code
          ? `Grupo creado · clave ${created.access_code}`
          : "Grupo creado sin clave"
      );
    } catch (e) {
      console.error(e);
      setOnlineStatus("No se pudo crear el grupo");
    } finally {
      setSyncingOnline(false);
    }
  }, [onlineAccessCode, onlineGroupName, onlineUserName]);

  const uploadOnlineGame = useCallback(
    async (entry) => {
      const accessCode = onlineAccessCode.trim();
      const groupName = onlineGroupName.trim();
      const userName = onlineUserName.trim();

      if (!hasSupabaseConfig || !supabase || (!accessCode && !groupName)) {
        return;
      }

      try {
        const { error } = await supabase.rpc("upsert_burakeros_game_v2", {
          p_name: groupName || null,
          p_user_name: userName || null,
          p_access_code: accessCode || null,
          p_game: {
            ...entry,
            updatedBy: userName || entry.updatedBy || null,
          },
        });

        if (error) throw error;

        setOnlineStatus(
          onlineGroupName
            ? `Guardado online en ${onlineGroupName}`
            : "Guardado online"
        );
      } catch (e) {
        console.error(e);
        setOnlineStatus("No se pudo guardar online");
      }
    },
    [onlineAccessCode, onlineGroupName, onlineUserName]
  );

  const deleteHistoricalGame = useCallback(
    async (game) => {
      if (!confirm("¿Borrar esta partida del historial?")) return;

      const nextHistory = history.filter((entry) => entry !== game);
      setHistory(nextHistory);
      saveHistory(nextHistory);

      const accessCode = onlineAccessCode.trim();
      const groupName = onlineGroupName.trim();
      const userName = onlineUserName.trim();

      if (
        !hasSupabaseConfig ||
        !supabase ||
        (!accessCode && !groupName) ||
        !game.gameId
      ) {
        return;
      }

      try {
        const { error } = await supabase.rpc("delete_burakeros_game_v2", {
          p_name: groupName || null,
          p_user_name: userName || null,
          p_access_code: accessCode || null,
          p_client_game_id: game.gameId,
        });

        if (error) throw error;

        setOnlineStatus("Partida borrada online");
      } catch (e) {
        console.error(e);
        setOnlineStatus("Borrada localmente, falló online");
      }
    },
    [history, onlineAccessCode, onlineGroupName, onlineUserName]
  );

  const toggleTeam1NoMuerto = () => {
    const next = !t1NoMuerto;
    setT1NoMuerto(next);

    if (next && subEndType === "team1_closed") {
      setSubEndType(null);
    }
  };

  const toggleTeam2NoMuerto = () => {
    const next = !t2NoMuerto;
    setT2NoMuerto(next);

    if (next && subEndType === "team2_closed") {
      setSubEndType(null);
    }
  };

  const checkpoints = useMemo(
    () => getProgressiveRankings(rounds, roundTotals, players),
    [rounds, roundTotals, players]
  );

  const handleShareImage = useCallback(async () => {
    if (sharingImage || !shareResultRef.current) return;

    setSharingImage(true);

    try {
      await document.fonts.ready;
      await waitForImages(shareResultRef.current);

      const blob = await toBlob(shareResultRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0d1b0e",
        skipFonts: true,
      });

      if (!blob) return;

      await shareOrDownloadBlob(blob, "burakeros.png", "Burakeros - Resultado");
    } catch (e) {
      console.error(e);
    } finally {
      setSharingImage(false);
    }
  }, [sharingImage]);

  const handleDownloadHistoricalRanking = useCallback(async () => {
    if (!historicalRankingImageRef.current) return;

    try {
      await document.fonts.ready;
      await waitForImages(historicalRankingImageRef.current);

      const blob = await toBlob(historicalRankingImageRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0d1b0e",
        skipFonts: true,
      });

      if (!blob) return;

      await shareOrDownloadBlob(
        blob,
        `ranking-historico-burakeros-${historicalTarget}.png`,
        "Burakeros - Ranking"
      );
    } catch (e) {
      console.error(e);
    }
  }, [historicalTarget]);

  const openHistoryFromSetup = () => {
    setHistoryReturnScreen("setup");
    setScreen("history");
  };

  const openHistoryFromGame = () => {
    setHistoryReturnScreen("game");
    setScreen("history");
  };

  const closeHistory = () => {
    setScreen(historyReturnScreen);
  };

  const openHistoricalGame = (game) => {
    if (!hasRoundDetails(game)) return;

    setPlayers(game.players || ["", "", "", ""]);
    setRoundTarget(game.roundTarget || 3000);
    setRounds(game.roundDetails.map((subs) => subs.map((sub) => ({ ...sub }))));
    setShowRules(false);
    setEditingRound(null);
    setEditingSubIdx(null);
    resetInputs();
    setGameId(game.gameId || createGameId());
    setGameSaved(false);
    setHasActiveGame(true);
    setSavedGamePreview(null);
    setForceRoundView(true);
    setScreen("game");
  };

  const editFinishedRounds = () => {
    setGameSaved(false);
    setHasActiveGame(true);
    setForceRoundView(true);
  };

  const startNewGame = () => {
    const newGameId = createGameId();

    clearActiveGame();
    setSavedGamePreview(null);

    saveLastPlayers(players);
    setLastPlayers(players);

    setGameId(newGameId);
    setScreen("game");
    setRounds([[], [], []]);
    setShowRules(false);
    setGameSaved(false);
    setHasActiveGame(true);
    setForceRoundView(false);
    setEditingRound(null);
    setEditingSubIdx(null);
    resetInputs();
  };

  const discardSavedGame = () => {
    clearActiveGame();
    setSavedGamePreview(null);
    resetFullSetup();
  };

  const resumeSavedGame = () => {
    if (!savedGamePreview) return;

    setPlayers(savedGamePreview.players || ["", "", "", ""]);
    setRoundTarget(savedGamePreview.roundTarget || 3000);
    setRounds(savedGamePreview.rounds || [[], [], []]);
    setShowRules(savedGamePreview.showRules || false);

    setEditingRound(savedGamePreview.editingRound ?? null);
    setEditingSubIdx(savedGamePreview.editingSubIdx ?? null);

    setT1Pts(savedGamePreview.t1Pts || "");
    setT2Pts(savedGamePreview.t2Pts || "");
    setT1Buracos(savedGamePreview.t1Buracos || []);
    setT2Buracos(savedGamePreview.t2Buracos || []);
    setT1NoMuerto(savedGamePreview.t1NoMuerto || false);
    setT2NoMuerto(savedGamePreview.t2NoMuerto || false);
    setSubEndType(savedGamePreview.subEndType || null);

    setFaceSetIndex(savedGamePreview.faceSetIndex || 0);
    setHeartFaces(savedGamePreview.heartFaces || false);

    setGameId(savedGamePreview.gameId || createGameId());
    setGameSaved(false);
    setHasActiveGame(true);
    setForceRoundView(false);
    setScreen("game");
  };

  const returnToSetup = () => {
    const hasProgress = rounds.some((round) => round.length > 0);

    if (
      hasProgress &&
      !confirm("¿Empezar un juego nuevo? Se perderá la partida actual.")
    ) {
      return;
    }

    clearActiveGame();
    setSavedGamePreview(null);
    resetFullSetup();
    setScreen("setup");
  };

  const openSubRoundEntry = (rIdx, subIdx = null) => {
    setEditingRound(rIdx);
    setEditingSubIdx(subIdx);
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 0);

    if (subIdx !== null) {
      const s = rounds[rIdx][subIdx];

      setT1Pts(String(s.team1Score || 0));
      setT2Pts(String(s.team2Score || 0));
      setT1Buracos([...(s.team1Buracos || [])]);
      setT2Buracos([...(s.team2Buracos || [])]);
      setT1NoMuerto(s.team1NoMuerto || false);
      setT2NoMuerto(s.team2NoMuerto || false);
      setSubEndType(s.endType || null);
    } else {
      resetInputs();
    }
  };

  const invalidClosingSelection =
    (subEndType === "team1_closed" && t1NoMuerto) ||
    (subEndType === "team2_closed" && t2NoMuerto);

  const persistCompletedGame = useCallback((completedRounds) => {
    if (
      gameSaved ||
      !players.every((p) => p.trim()) ||
      !historyLoaded
    ) {
      return;
    }

    const existingGame = history.find((h) => h.gameId && h.gameId === gameId);

    const rt = getRoundTotals(completedRounds);
    const cs = getCumulativeScores(completedRounds, rt, players);

    const ranked = players
      .map((name, i) => ({
        name,
        score: cs[i],
      }))
      .sort((a, b) => b.score - a.score);

    const entry = {
      gameId,
      date: existingGame?.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: onlineUserName.trim() || existingGame?.updatedBy || null,
      players: [...players],
      roundTarget,
      ranking: ranked,
      roundDetails: completedRounds.map((subs) =>
        subs.map((sub) => ({
          ...sub,
          team1Buracos: [...(sub.team1Buracos || [])],
          team2Buracos: [...(sub.team2Buracos || [])],
        }))
      ),
      rounds: completedRounds.map((subs, rIdx) => ({
        t1: rt[rIdx].t1,
        t2: rt[rIdx].t2,
        subRounds: subs.length,
      })),
    };

    const newHistory = existingGame
      ? history.map((game) =>
          game.gameId && game.gameId === gameId ? entry : game
        )
      : [entry, ...history].slice(0, 50);

    setHistory(newHistory);
    saveHistory(newHistory);
    setGameSaved(true);
    setHasActiveGame(false);
    setSavedGamePreview(null);
    clearActiveGame();
    uploadOnlineGame(entry);
  }, [
    gameId,
    gameSaved,
    history,
    historyLoaded,
    players,
    roundTarget,
    onlineUserName,
    uploadOnlineGame,
  ]);

  useEffect(() => {
    if (!allFinished || gameSaved || forceRoundView) return undefined;

    const timerId = setTimeout(() => {
      persistCompletedGame(rounds);
    }, 0);

    return () => clearTimeout(timerId);
  }, [allFinished, forceRoundView, gameSaved, persistCompletedGame, rounds]);

  const saveSubRound = () => {
    if (!subEndType || invalidClosingSelection) return;

    const newSub = {
      team1Score: parseInt(t1Pts, 10) || 0,
      team2Score: parseInt(t2Pts, 10) || 0,
      team1Buracos: [...t1Buracos],
      team2Buracos: [...t2Buracos],
      team1NoMuerto: t1NoMuerto,
      team2NoMuerto: t2NoMuerto,
      endType: subEndType,
    };

    const updated = rounds.map((r) => [...r]);

    if (editingSubIdx !== null) {
      updated[editingRound][editingSubIdx] = newSub;
    } else {
      updated[editingRound] = [...updated[editingRound], newSub];
    }

    const totals = getRoundTotals(updated);

    for (let i = editingRound; i < updated.length - 1; i++) {
      const rFinished =
        totals[i].t1 >= roundTarget || totals[i].t2 >= roundTarget;

      if (!rFinished && updated[i + 1].length > 0) {
        updated[i + 1] = [];
      }
    }

    setRounds(updated);

    setEditingRound(null);
    setEditingSubIdx(null);

    const updatedTotals = getRoundTotals(updated);
    const updatedAllFinished = [0, 1, 2].every(
      (rIdx) =>
        updatedTotals[rIdx].t1 >= roundTarget ||
        updatedTotals[rIdx].t2 >= roundTarget
    );

    if (updatedAllFinished) {
      persistCompletedGame(updated);
      setForceRoundView(false);
    }
  };

  const deleteSubRound = (rIdx, sIdx) => {
    if (!confirm("¿Eliminar esta sub-ronda?")) return false;

    const updated = rounds.map((r) => [...r]);
    updated[rIdx] = updated[rIdx].filter((_, i) => i !== sIdx);

    const totals = getRoundTotals(updated);

    for (let i = rIdx; i < updated.length - 1; i++) {
      const rFinished =
        totals[i].t1 >= roundTarget || totals[i].t2 >= roundTarget;

      if (!rFinished && updated[i + 1].length > 0) {
        updated[i + 1] = [];
      }
    }

    setRounds(updated);

    const updatedTotals = getRoundTotals(updated);
    const updatedAllFinished = [0, 1, 2].every(
      (roundIdx) =>
        updatedTotals[roundIdx].t1 >= roundTarget ||
        updatedTotals[roundIdx].t2 >= roundTarget
    );

    if (updatedAllFinished) {
      persistCompletedGame(updated);
      setForceRoundView(false);
    }

    return true;
  };

  useEffect(() => {
    if (hasActiveGame && !allFinished) {
      const timerId = setTimeout(() => {
        const activeGame = {
          gameId,
          players,
          roundTarget,
          rounds,
          showRules,
          editingRound,
          editingSubIdx,
          t1Pts,
          t2Pts,
          t1Buracos,
          t2Buracos,
          t1NoMuerto,
          t2NoMuerto,
          subEndType,
          faceSetIndex,
          heartFaces,
          savedAt: new Date().toISOString(),
        };

        saveActiveGame(activeGame);
      }, 800);

      return () => clearTimeout(timerId);
    }
  }, [
    hasActiveGame,
    allFinished,
    gameId,
    players,
    roundTarget,
    rounds,
    showRules,
    editingRound,
    editingSubIdx,
    t1Pts,
    t2Pts,
    t1Buracos,
    t2Buracos,
    t1NoMuerto,
    t2NoMuerto,
    subEndType,
    faceSetIndex,
    heartFaces,
  ]);

  if (screen === "history") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          padding: 16,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <AppStyles />

        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <button
            type="button"
            onClick={closeHistory}
            style={{
              ...btn,
              background: "none",
              color: "#c4b89a",
              fontSize: 14,
              padding: "8px 0",
              marginBottom: 8,
            }}
          >
            ← Volver
          </button>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#e8dcc8",
              fontSize: 24,
              margin: "0 0 20px",
            }}
          >
            Historial de Burakeros
          </h2>

          <div
            style={{
              background: "rgba(232,220,200,0.06)",
              borderRadius: 16,
              padding: 16,
              border: "1px solid rgba(232,220,200,0.12)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "#e8dcc8",
                    fontSize: 19,
                    margin: "0 0 4px",
                  }}
                >
                  Ranking Histórico
                </h3>
                <div style={{ color: "#8a9a8c", fontSize: 12 }}>
                  {historicalMetric === "sum"
                    ? "Suma de puntos"
                    : "Puntos promedio"}{" "}
                  · {historicalRangeLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadHistoricalRanking}
                disabled={historicalRanking.length === 0}
                style={{
                  ...btn,
                  padding: "9px 11px",
                  fontSize: 12,
                  background:
                    historicalRanking.length === 0
                      ? "rgba(232,220,200,0.04)"
                      : "rgba(212,184,94,0.12)",
                  color:
                    historicalRanking.length === 0 ? "#666" : "#d4b85e",
                  border: `1px solid ${
                    historicalRanking.length === 0
                      ? "rgba(232,220,200,0.08)"
                      : "rgba(212,184,94,0.28)"
                  }`,
                  cursor:
                    historicalRanking.length === 0
                      ? "not-allowed"
                      : "pointer",
                  flexShrink: 0,
                }}
              >
                📸 Descargar ranking
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(250,249,246,0.05)",
                border: "1px solid rgba(232,220,200,0.08)",
                marginBottom: 12,
              }}
            >
              <label
                htmlFor="historicalTarget"
                style={{
                  color: "#c4b89a",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Partidas a
              </label>

              <select
                id="historicalTarget"
                value={historicalTarget}
                onChange={(e) =>
                  setHistoricalTarget(
                    e.target.value === ALL_TARGETS_VALUE
                      ? ALL_TARGETS_VALUE
                      : Number(e.target.value)
                  )
                }
                style={{
                  minWidth: 130,
                  background: "rgba(13,27,14,0.9)",
                  color: "#e8dcc8",
                  border: "1px solid rgba(232,220,200,0.2)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                  outline: "none",
                }}
              >
                <option value={ALL_TARGETS_VALUE}>Todos los puntajes</option>
                {historicalTargetOptions.map((target) => (
                  <option key={target} value={target}>
                    {target} puntos
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {[
                { key: "average", label: "Promedio" },
                { key: "sum", label: "Suma" },
              ].map((option) => {
                const selected = historicalMetric === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setHistoricalMetric(option.key)}
                    style={{
                      ...btn,
                      padding: "10px 12px",
                      fontSize: 13,
                      background: selected
                        ? "rgba(212,184,94,0.14)"
                        : "rgba(232,220,200,0.05)",
                      color: selected ? "#d4b85e" : "#c4b89a",
                      border: `1px solid ${
                        selected
                          ? "rgba(212,184,94,0.32)"
                          : "rgba(232,220,200,0.1)"
                      }`,
                      borderRadius: 10,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: historicalRangeMode === "recent" ? 10 : 12,
              }}
            >
              {[
                { key: "overall", label: "Overall" },
                { key: "recent", label: "Últimos días" },
              ].map((option) => {
                const selected = historicalRangeMode === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setHistoricalRangeMode(option.key)}
                    style={{
                      ...btn,
                      padding: "10px 12px",
                      fontSize: 13,
                      background: selected
                        ? "rgba(74,222,128,0.12)"
                        : "rgba(232,220,200,0.05)",
                      color: selected ? "#4ade80" : "#c4b89a",
                      border: `1px solid ${
                        selected
                          ? "rgba(74,222,128,0.28)"
                          : "rgba(232,220,200,0.1)"
                      }`,
                      borderRadius: 10,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {historicalRangeMode === "recent" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {HISTORICAL_RANGE_DAYS_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setHistoricalRangeDays(days)}
                    style={{
                      ...btn,
                      flex: 1,
                      padding: "9px 8px",
                      fontSize: 12,
                      background:
                        historicalRangeDays === days
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(232,220,200,0.05)",
                      color:
                        historicalRangeDays === days ? "#4ade80" : "#8a9a8c",
                      border: `1px solid ${
                        historicalRangeDays === days
                          ? "rgba(74,222,128,0.28)"
                          : "rgba(232,220,200,0.1)"
                      }`,
                      borderRadius: 10,
                    }}
                  >
                    {days}
                  </button>
                ))}

                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={historicalRangeDays}
                  onChange={(e) =>
                    setHistoricalRangeDays(
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  aria-label="Dias del ranking historico"
                  style={{
                    width: 72,
                    boxSizing: "border-box",
                    background: "rgba(13,27,14,0.9)",
                    color: "#e8dcc8",
                    border: "1px solid rgba(232,220,200,0.2)",
                    borderRadius: 10,
                    padding: "9px 8px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <div
              style={{
                color: "#8a9a8c",
                fontSize: 12,
                marginBottom: historicalRanking.length > 0 ? 10 : 0,
              }}
            >
              {filteredHistoricalGamesCount} partida
              {filteredHistoricalGamesCount !== 1 ? "s" : ""} considerada
              {filteredHistoricalGamesCount !== 1 ? "s" : ""} ·{" "}
              {historicalTargetLabel}
            </div>

            {historicalRanking.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#8a9a8c",
                  fontSize: 13,
                  padding: "18px 10px",
                  background: "rgba(232,220,200,0.04)",
                  borderRadius: 12,
                  border: "1px solid rgba(232,220,200,0.08)",
                }}
              >
                No hay partidas guardadas con estos filtros.
              </div>
            ) : (
              <HistoricalRankingRows
                ranking={historicalRanking}
                metric={historicalMetric}
                heartFaces={heartFaces}
              />
            )}
          </div>

          <div
            style={{
              position: "fixed",
              left: -9999,
              top: 0,
              width: 460,
              pointerEvents: "none",
            }}
          >
            <div ref={historicalRankingImageRef}>
              <HistoricalRankingImageCard
                ranking={historicalRanking}
                target={historicalTarget}
                metric={historicalMetric}
                rangeLabel={historicalRangeLabel}
                heartFaces={heartFaces}
              />
            </div>
          </div>

          {history.length === 0 ? (
            <div
              style={{
                color: "#8a9a8c",
                fontSize: 14,
                textAlign: "center",
                padding: 40,
                background: "rgba(232,220,200,0.05)",
                borderRadius: 14,
                border: "1px solid rgba(232,220,200,0.1)",
              }}
            >
              No hay partidas guardadas todavía.
            </div>
          ) : (
            history.map((game, gIdx) => {
              const d = new Date(game.date);
              const canEditHistoricalGame = hasRoundDetails(game);

              const dateStr = d.toLocaleDateString("es", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              const timeStr = d.toLocaleTimeString("es", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={`${game.date}-${gIdx}`}
                  onClick={() => openHistoricalGame(game)}
                  role={canEditHistoricalGame ? "button" : undefined}
                  tabIndex={canEditHistoricalGame ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (
                      canEditHistoricalGame &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      openHistoricalGame(game);
                    }
                  }}
                  style={{
                    background: "rgba(232,220,200,0.06)",
                    borderRadius: 14,
                    padding: 16,
                    border: "1px solid rgba(232,220,200,0.1)",
                    marginBottom: 12,
                    cursor: canEditHistoricalGame ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ color: "#8a9a8c", fontSize: 12 }}>
                        {dateStr} · {timeStr}
                      </div>
                      <div
                        style={{
                          color: "#666",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Rondas a {game.roundTarget || 3000} pts
                      </div>
                      <div
                        style={{
                          color: canEditHistoricalGame ? "#d4b85e" : "#555",
                          fontSize: 11,
                          marginTop: 2,
                          fontWeight: 700,
                        }}
                      >
                        {canEditHistoricalGame
                          ? "Click para ver/modificar"
                          : "Sin detalle de rondas"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoricalGame(game);
                      }}
                      style={{
                        ...btn,
                        padding: "7px 10px",
                        fontSize: 11,
                        background: "rgba(248,113,113,0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(248,113,113,0.2)",
                        flexShrink: 0,
                      }}
                    >
                      Borrar
                    </button>
                  </div>

                  {game.ranking.map((p, pIdx) => (
                    <div
                      key={`${p.name}-${pIdx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 0",
                        borderBottom:
                          pIdx < 3
                            ? "1px solid rgba(232,220,200,0.06)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 16,
                            fontWeight: 900,
                            color:
                              pIdx === 0
                                ? "#d4b85e"
                                : pIdx === 1
                                ? "#94a3b8"
                                : pIdx === 2
                                ? "#b45309"
                                : "#555",
                            width: 22,
                          }}
                        >
                          {pIdx + 1}
                        </span>

                        <PlayerAvatar
                          name={p.name}
                          heartFaces={heartFaces}
                          size={28}
                        />

                        <span style={{ color: "#e8dcc8", fontSize: 14 }}>
                          {p.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: p.score >= 0 ? "#4ade80" : "#f87171",
                        }}
                      >
                        {p.score}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("¿Borrar todo el historial?")) {
                  setHistory([]);
                  saveHistory([]);
                }
              }}
              style={{
                ...btn,
                width: "100%",
                padding: "12px 0",
                fontSize: 14,
                background: "rgba(248,113,113,0.1)",
                color: "#f87171",
                border: "1px solid rgba(248,113,113,0.2)",
                marginTop: 8,
              }}
            >
              Borrar historial
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === "setup") {
    const allFilled = players.every((p) => p.trim());
    const canUseLastPlayers =
      lastPlayers.length === 4 && lastPlayers.every((p) => p.trim());

    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <AppStyles />

        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <SuitEasterEggs
              onDiamondClick={cycleFaces}
              onHeartClick={toggleHeartFaces}
              heartFaces={heartFaces}
            />

            <div style={faceWrapStyle}>
              <img
                src={headerFaces.woman}
                alt="Burakera"
                style={setupFaceStyle}
              />

              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 39,
                  fontWeight: 900,
                  color: "#e8dcc8",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                BURAKEROS
              </h1>

              <img
                src={headerFaces.man}
                alt="Burakero"
                style={setupFaceReverseStyle}
              />
            </div>

            <p
              style={{
                color: "#8a9a8c",
                fontSize: 13,
                marginTop: 6,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Planilla de Puntuación
            </p>
          </div>

          {savedGamePreview && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(196,162,78,0.14), rgba(212,184,94,0.08))",
                borderRadius: 16,
                padding: 18,
                border: "1px solid rgba(212,184,94,0.32)",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  color: "#d4b85e",
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  fontWeight: 900,
                  marginBottom: 6,
                }}
              >
                Partida en progreso
              </div>

              <div
                style={{
                  color: "#c4b89a",
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                {savedGamePreview.players?.filter(Boolean).join(" · ")}
                <br />
                Rondas a {savedGamePreview.roundTarget || 3000} puntos
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={resumeSavedGame}
                  style={{
                    ...btn,
                    flex: 1,
                    padding: "12px 10px",
                    fontSize: 14,
                    background: gold,
                    color: "#1a1a2e",
                  }}
                >
                  Reanudar
                </button>

                <button
                  type="button"
                  onClick={discardSavedGame}
                  style={{
                    ...btn,
                    flex: 1,
                    padding: "12px 10px",
                    fontSize: 14,
                    background: "rgba(248,113,113,0.1)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                  }}
                >
                  Nueva partida
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              background: "rgba(232,220,200,0.06)",
              borderRadius: 16,
              padding: 16,
              border: "1px solid rgba(232,220,200,0.1)",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ textAlign: "left", minWidth: 0 }}>
                <div
                  style={{
                    color: "#e8dcc8",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  Historial online
                </div>
                <div
                  style={{
                    color: onlineGroupName ? "#4ade80" : "#8a9a8c",
                    fontSize: 11,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {onlineStatus}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {onlineGroupName && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnlineAccessCode("");
                      setOnlineGroupName("");
                      setOnlineUserName("");
                      setCreatedGroupCode("");
                      setOnlineStatus("Desconectado");
                      saveOnlineAccessCode("");
                      saveOnlineGroupName("");
                      saveOnlineUser("");
                    }}
                    style={{
                      ...btn,
                      padding: "7px 10px",
                      fontSize: 11,
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    Salir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOnlinePanelOpen((value) => !value)}
                  style={{
                    ...btn,
                    padding: "7px 10px",
                    fontSize: 11,
                    background: "rgba(232,220,200,0.06)",
                    color: "#c4b89a",
                    border: "1px solid rgba(232,220,200,0.14)",
                  }}
                >
                  {onlinePanelOpen ? "Ocultar" : "Abrir"}
                </button>
              </div>
            </div>

            {onlinePanelOpen && (
              <>
                <input
              value={onlineUserName || onlineGroupName}
              onChange={(e) => {
                setOnlineUserName(e.target.value);
                setOnlineGroupName(e.target.value);
              }}
              placeholder="Usuario / grupo"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 10,
                border: "1px solid rgba(232,220,200,0.2)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                background: "rgba(250,249,246,0.08)",
                color: "#e8dcc8",
                outline: "none",
              }}
            />

                <input
              type="password"
              value={onlineAccessCode}
              onChange={(e) => setOnlineAccessCode(e.target.value)}
              placeholder="Contraseña (opcional)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 10,
                border: "1px solid rgba(232,220,200,0.2)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                background: "rgba(250,249,246,0.08)",
                color: "#e8dcc8",
                outline: "none",
              }}
            />

                {createdGroupCode && (
              <div
                style={{
                  color: "#d4b85e",
                  fontSize: 12,
                  marginBottom: 10,
                  background: "rgba(212,184,94,0.1)",
                  border: "1px solid rgba(212,184,94,0.22)",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                Clave nueva: {createdGroupCode}
              </div>
            )}

                <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={connectOnlineHistory}
                disabled={syncingOnline || !hasSupabaseConfig}
                style={{
                  ...btn,
                  flex: 1,
                  padding: "10px 8px",
                  fontSize: 13,
                  background: "rgba(212,184,94,0.12)",
                  color: "#d4b85e",
                  border: "1px solid rgba(212,184,94,0.28)",
                  opacity: syncingOnline || !hasSupabaseConfig ? 0.55 : 1,
                }}
              >
                {syncingOnline ? "Sincronizando..." : "Conectar"}
              </button>

              <button
                type="button"
                onClick={createOnlineGroup}
                disabled={
                  syncingOnline ||
                  !hasSupabaseConfig ||
                  !onlineUserName.trim() ||
                  !onlineGroupName.trim()
                }
                style={{
                  ...btn,
                  flex: 1,
                  padding: "10px 8px",
                  fontSize: 13,
                  background: "rgba(96,165,250,0.12)",
                  color: "#60a5fa",
                  border: "1px solid rgba(96,165,250,0.25)",
                  opacity:
                    syncingOnline ||
                    !hasSupabaseConfig ||
                    !onlineUserName.trim() ||
                    !onlineGroupName.trim()
                      ? 0.55
                      : 1,
                }}
              >
                Crear grupo
              </button>
            </div>
              </>
            )}
          </div>

          <div
            style={{
              background: "rgba(232,220,200,0.06)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid rgba(232,220,200,0.1)",
            }}
          >
            <p
              style={{
                color: "#c4b89a",
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              Ingresá los 4 jugadores:
            </p>

            {canUseLastPlayers && (
              <button
                type="button"
                onClick={() => setPlayers(lastPlayers)}
                style={{
                  ...btn,
                  width: "100%",
                  marginBottom: 14,
                  padding: "10px 12px",
                  fontSize: 13,
                  background: "rgba(212,184,94,0.1)",
                  color: "#d4b85e",
                  border: "1px solid rgba(212,184,94,0.28)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700,
                }}
              >
                Usar últimos jugadores: {lastPlayers.join(" · ")}
              </button>
            )}

            {players.map((p, i) => (
              <input
                key={i}
                value={p}
                onChange={(e) => {
                  const updated = [...players];
                  updated[i] = e.target.value;
                  setPlayers(updated);
                }}
                placeholder={`Jugador ${i + 1}`}
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  marginBottom: 10,
                  border: "1px solid rgba(232,220,200,0.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  background: "rgba(250,249,246,0.08)",
                  color: "#e8dcc8",
                  outline: "none",
                }}
              />
            ))}

            <button
              type="button"
              onClick={() => {
                if (allFilled) startNewGame();
              }}
              style={{
                ...btn,
                width: "100%",
                marginTop: 12,
                padding: "14px 0",
                fontSize: 17,
                background: allFilled ? gold : "#3a3a3a",
                color: allFilled ? "#1a1a2e" : "#777",
                letterSpacing: 1,
              }}
            >
              COMENZAR CON {roundTarget}
            </button>

            <div style={{ marginTop: 16 }}>
              <p
                style={{
                  color: "#8a9a8c",
                  fontSize: 12,
                  textAlign: "center",
                  margin: "0 0 10px",
                }}
              >
                Cambiar puntaje de cierre
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setRoundTarget((prev) => Math.max(500, prev - 500))
                  }
                  style={{
                    ...btn,
                    width: 46,
                    height: 46,
                    fontSize: 26,
                    lineHeight: 1,
                    background: "rgba(232,220,200,0.06)",
                    color: "#c4b89a",
                    border: "1px solid rgba(232,220,200,0.18)",
                    borderRadius: 14,
                  }}
                >
                  −
                </button>

                <div
                  style={{
                    minWidth: 120,
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    background: "rgba(212,184,94,0.12)",
                    border: "1px solid rgba(212,184,94,0.4)",
                    color: "#d4b85e",
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    fontSize: 22,
                  }}
                >
                  {roundTarget}
                </div>

                <button
                  type="button"
                  onClick={() => setRoundTarget((prev) => prev + 500)}
                  style={{
                    ...btn,
                    width: 46,
                    height: 46,
                    fontSize: 26,
                    lineHeight: 1,
                    background: "rgba(232,220,200,0.06)",
                    color: "#c4b89a",
                    border: "1px solid rgba(232,220,200,0.18)",
                    borderRadius: 14,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {historyLoaded && (
            <button
              type="button"
              onClick={openHistoryFromSetup}
              style={{
                ...btn,
                width: "100%",
                marginTop: 14,
                padding: "12px 0",
                fontSize: 15,
                background: "rgba(232,220,200,0.06)",
                color: "#c4b89a",
                border: "1px solid rgba(232,220,200,0.15)",
              }}
            >
              📋 Historial ({history.length} partida
              {history.length !== 1 ? "s" : ""})
            </button>
          )}
        </div>
      </div>
    );
  }

  if (editingRound !== null) {
    const rot = ROTATIONS[editingRound];
    const pair1Name = rot.pair1.map((i) => players[i]).join(" & ");
    const pair2Name = rot.pair2.map((i) => players[i]).join(" & ");
    const subNum =
      editingSubIdx !== null
        ? editingSubIdx + 1
        : rounds[editingRound].length + 1;
    const isEditing = editingSubIdx !== null;
    const canSaveSubRound = Boolean(subEndType) && !invalidClosingSelection;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          padding: 16,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <AppStyles />

        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => {
              setEditingRound(null);
              setEditingSubIdx(null);
            }}
            style={{
              ...btn,
              background: "none",
              color: "#c4b89a",
              fontSize: 14,
              padding: "8px 0",
              marginBottom: 8,
            }}
          >
            ← Volver
          </button>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#e8dcc8",
              fontSize: 22,
              margin: "0 0 4px",
            }}
          >
            Ronda {editingRound + 1}
          </h2>

          <p
            style={{
              color: "#8a9a8c",
              fontSize: 13,
              margin: "0 0 20px",
            }}
          >
            {isEditing
              ? `Editando sub-ronda #${subNum}`
              : `Sub-ronda #${subNum}`}
          </p>

          <TeamEntryPanel
            teamName={pair1Name}
            points={t1Pts}
            onPointsChange={setT1Pts}
            buracos={t1Buracos}
            onAddBuraco={(k) => setT1Buracos((p) => [...p, k])}
            onRemoveBuraco={(idx) =>
              setT1Buracos((p) => p.filter((_, i) => i !== idx))
            }
            noMuerto={t1NoMuerto}
            onToggleNoMuerto={toggleTeam1NoMuerto}
          />

          <TeamEntryPanel
            teamName={pair2Name}
            points={t2Pts}
            onPointsChange={setT2Pts}
            buracos={t2Buracos}
            onAddBuraco={(k) => setT2Buracos((p) => [...p, k])}
            onRemoveBuraco={(idx) =>
              setT2Buracos((p) => p.filter((_, i) => i !== idx))
            }
            noMuerto={t2NoMuerto}
            onToggleNoMuerto={toggleTeam2NoMuerto}
          />

          <EndTypeSelector
            pair1Name={pair1Name}
            pair2Name={pair2Name}
            endType={subEndType}
            onChange={setSubEndType}
            team1NoMuerto={t1NoMuerto}
            team2NoMuerto={t2NoMuerto}
          />

          <button
            type="button"
            onClick={saveSubRound}
            style={{
              ...btn,
              width: "100%",
              padding: "14px 0",
              fontSize: 17,
              background: canSaveSubRound ? gold : "#3a3a3a",
              color: canSaveSubRound ? "#1a1a2e" : "#777",
              letterSpacing: 1,
              marginTop: 4,
              cursor: canSaveSubRound ? "pointer" : "not-allowed",
            }}
          >
            {isEditing ? "GUARDAR CAMBIOS" : "GUARDAR SUB-RONDA"}
          </button>

          {!subEndType && (
            <div
              style={{
                color: "#f87171",
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Elige cómo terminó la sub-ronda para poder guardarla.
            </div>
          )}

          {invalidClosingSelection && (
            <div
              style={{
                color: "#f87171",
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Un equipo que no robó el muerto no puede haber cerrado.
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={() => {
                if (deleteSubRound(editingRound, editingSubIdx)) {
                  setEditingRound(null);
                  setEditingSubIdx(null);
                }
              }}
              style={{
                ...btn,
                width: "100%",
                padding: "12px 0",
                fontSize: 14,
                background: "rgba(248,113,113,0.1)",
                color: "#f87171",
                border: "1px solid rgba(248,113,113,0.2)",
                marginTop: 10,
                borderRadius: 12,
              }}
            >
              Eliminar esta sub-ronda
            </button>
          )}
        </div>
      </div>
    );
  }

  if (allFinished && !forceRoundView) {
    const winner = ranking[0];
    const lastPlace = ranking[ranking.length - 1];

    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          padding: 16,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <AppStyles />

        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div ref={shareResultRef}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <SuitEasterEggs
                onDiamondClick={cycleFaces}
                onHeartClick={toggleHeartFaces}
                heartFaces={heartFaces}
                compact
              />

              <div style={faceWrapStyle}>
                <img
                  src={headerFaces.woman}
                  alt="Burakera"
                  style={gameFaceStyle}
                />

                <h1
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 30,
                    fontWeight: 900,
                    color: "#e8dcc8",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  BURAKEROS
                </h1>

                <img
                  src={headerFaces.man}
                  alt="Burakero"
                  style={gameFaceReverseStyle}
                />
              </div>
            </div>

            <div
              style={{
                animation: "winnerPop 0.45s ease-out",
                background:
                  "linear-gradient(135deg, rgba(196,162,78,0.16), rgba(212,184,94,0.08))",
                borderRadius: 18,
                padding: 22,
                border: "1px solid rgba(212,184,94,0.35)",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 46, marginBottom: 8 }}>🎉</div>

              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#d4b85e",
                  fontSize: 28,
                  margin: "0 0 6px",
                }}
              >
                ¡{winner.name} gana!
              </h2>

              <p
                style={{
                  color: "#c4b89a",
                  fontSize: 16,
                  margin: 0,
                }}
              >
                {winner.score} puntos
              </p>
            </div>

            <div
              style={{
                background: "rgba(232,220,200,0.06)",
                borderRadius: 16,
                padding: 16,
                border: "1px solid rgba(232,220,200,0.1)",
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "#e8dcc8",
                  fontSize: 19,
                  margin: "0 0 12px",
                }}
              >
                Ranking Final
              </h3>

              {ranking.map((p, i) => (
                <div
                  key={p.index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom:
                      i < ranking.length - 1
                        ? "1px solid rgba(232,220,200,0.08)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 22,
                        fontWeight: 900,
                        color:
                          i === 0
                            ? "#d4b85e"
                            : i === 1
                            ? "#94a3b8"
                            : i === 2
                            ? "#b45309"
                            : "#777",
                        width: 28,
                      }}
                    >
                      {i + 1}
                    </span>

                    <PlayerAvatar
                      name={p.name}
                      heartFaces={heartFaces}
                      size={40}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <span
                        style={{
                          color: "#e8dcc8",
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {p.name}
                      </span>

                      {i === 0 && (
                        <span style={{ fontSize: 20 }} title="Campeón">
                          🏆
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 19,
                      fontWeight: 900,
                      color: p.score >= 0 ? "#4ade80" : "#f87171",
                    }}
                  >
                    {p.score}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.22)",
                borderRadius: 16,
                padding: 16,
                textAlign: "center",
                color: "#fda4af",
                fontFamily: "'Playfair Display', serif",
                fontWeight: 900,
                fontSize: 19,
                marginBottom: 16,
              }}
            >
              {lastPlace.name}, quedaste en el sótano!
            </div>
          </div>

          <MarioPartyChart
            players={players}
            checkpoints={checkpoints}
            heartFaces={heartFaces}
          />

          <button
            type="button"
            onClick={handleShareImage}
            disabled={sharingImage}
            style={{
              ...btn,
              width: "100%",
              padding: "13px 0",
              fontSize: 15,
              background: "rgba(232,220,200,0.08)",
              color: "#c4b89a",
              border: "1px solid rgba(232,220,200,0.18)",
              marginBottom: 12,
              opacity: sharingImage ? 0.5 : 1,
            }}
          >
            {sharingImage ? "Generando..." : "📤 Compartir resultado"}
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={editFinishedRounds}
              style={{
                ...btn,
                flex: 1,
                padding: "13px 0",
                fontSize: 15,
                background: "rgba(212,184,94,0.12)",
                color: "#d4b85e",
                border: "1px solid rgba(212,184,94,0.28)",
              }}
            >
              Editar rondas
            </button>

            <button
              type="button"
              onClick={returnToSetup}
              style={{
                ...btn,
                flex: 1,
                padding: "13px 0",
                fontSize: 15,
                background: gold,
                color: "#1a1a2e",
              }}
            >
              Nuevo juego
            </button>

            <button
              type="button"
              onClick={openHistoryFromGame}
              style={{
                ...btn,
                flex: 1,
                padding: "13px 0",
                fontSize: 15,
                background: "rgba(232,220,200,0.06)",
                color: "#c4b89a",
                border: "1px solid rgba(232,220,200,0.15)",
              }}
            >
              Historial
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeRound = getActiveRound();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        padding: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AppStyles />

      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <SuitEasterEggs
            onDiamondClick={cycleFaces}
            onHeartClick={toggleHeartFaces}
            heartFaces={heartFaces}
            compact
          />

          <div style={faceWrapStyle}>
            <img
              src={headerFaces.woman}
              alt="Burakera"
              style={gameFaceStyle}
            />

            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 30,
                fontWeight: 900,
                color: "#e8dcc8",
                margin: 0,
                lineHeight: 1,
              }}
            >
              BURAKEROS
            </h1>

            <img
              src={headerFaces.man}
              alt="Burakero"
              style={gameFaceReverseStyle}
            />
          </div>

          <div
            style={{
              color: "#8a9a8c",
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            Rondas a {roundTarget} puntos
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              style={{
                ...btn,
                background: "none",
                color: "#8a9a8c",
                fontSize: 12,
                padding: "4px 12px",
                border: "1px solid rgba(232,220,200,0.15)",
              }}
            >
              {showRules ? "Ocultar reglas" : "Ver reglas"}
            </button>

            <button
              type="button"
              onClick={returnToSetup}
              style={{
                ...btn,
                background: "none",
                color: "#8a9a8c",
                fontSize: 12,
                padding: "4px 12px",
                border: "1px solid rgba(232,220,200,0.15)",
              }}
            >
              Nuevo juego
            </button>

            <button
              type="button"
              onClick={openHistoryFromGame}
              style={{
                ...btn,
                background: "none",
                color: "#8a9a8c",
                fontSize: 12,
                padding: "4px 12px",
                border: "1px solid rgba(232,220,200,0.15)",
              }}
            >
              Historial
            </button>
          </div>
        </div>

        {showRules && (
          <div
            style={{
              background: "rgba(232,220,200,0.06)",
              borderRadius: 14,
              padding: 16,
              border: "1px solid rgba(232,220,200,0.1)",
              marginBottom: 16,
              color: "#a8b0a8",
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            Joker: 50 · Dos: 20 · As: 15 · 8-K: 10 · 3-7: 5
            <br />
            Buraco Limpio: 500 · Sucio: 300
            <br />
            Buraco As Limpio: 800 · As Sucio: 500
            <br />
            Cerrar: +200 · No robó muerto: −300
            <br />
            Si el rival cierra y no tienes buraco: todo negativo
            <br />
            Si botas comodín: tu equipo va negativo
            <br />
            Si el rival bota comodín: tu equipo queda en 0
            <br />
            Si se acaban las cartas: nadie cierra, sin buraco va negativo
          </div>
        )}

        <WinningBanner ranking={ranking} heartFaces={heartFaces} />

        <div
          style={{
            background: "rgba(232,220,200,0.06)",
            borderRadius: 14,
            padding: 16,
            border: "1px solid rgba(232,220,200,0.1)",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#e8dcc8",
              fontSize: 17,
              margin: "0 0 12px",
            }}
          >
            Ranking General
          </h3>

          {ranking.map((p, i) => (
            <div
              key={p.index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 0",
                borderBottom:
                  i < 3 ? "1px solid rgba(232,220,200,0.07)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20,
                    fontWeight: 900,
                    color:
                      i === 0
                        ? "#d4b85e"
                        : i === 1
                        ? "#94a3b8"
                        : i === 2
                        ? "#b45309"
                        : "#555",
                    width: 26,
                  }}
                >
                  {i + 1}
                </span>

                <PlayerAvatar name={p.name} heartFaces={heartFaces} />

                <span style={{ color: "#e8dcc8", fontSize: 15 }}>
                  {p.name}
                </span>
              </div>

              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 18,
                  fontWeight: 900,
                  color: p.score >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>

        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#e8dcc8",
            fontSize: 17,
            margin: "0 0 12px",
          }}
        >
          Rondas
        </h3>

        {ROTATIONS.map((rot, rIdx) => {
          const pair1Name = rot.pair1.map((pi) => players[pi]).join(" & ");
          const pair2Name = rot.pair2.map((pi) => players[pi]).join(" & ");
          const subs = rounds[rIdx];
          const totals = roundTotals[rIdx];
          const finished = isRoundFinished(rIdx);
          const isActive = rIdx === activeRound;
          const unlocked = rIdx === 0 || isRoundFinished(rIdx - 1);
          const roundWinner = getRoundWinner(totals, roundTarget);

          return (
            <div
              key={rIdx}
              style={{
                background: finished
                  ? "rgba(74,222,128,0.06)"
                  : "rgba(232,220,200,0.04)",
                borderRadius: 14,
                padding: 16,
                border: `1px solid ${
                  finished
                    ? "rgba(74,222,128,0.15)"
                    : "rgba(232,220,200,0.08)"
                }`,
                marginBottom: 12,
                opacity: unlocked ? 1 : 0.3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "#e8dcc8",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Ronda {rIdx + 1}
                </span>

                {finished && (
                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(74,222,128,0.1)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    ✓ Finalizada
                  </span>
                )}

                {isActive && !finished && subs.length > 0 && (
                  <span
                    style={{
                      color: "#d4b85e",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(212,184,94,0.1)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    En juego
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: subs.length > 0 ? 10 : 0,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    background: "rgba(232,220,200,0.05)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      color: "#a8b0a8",
                      fontSize: 12,
                      marginBottom: 3,
                    }}
                  >
                    {pair1Name}
                  </div>

                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 22,
                      fontWeight: 900,
                      color:
                        totals.t1 >= roundTarget
                          ? "#d4b85e"
                          : totals.t1 >= 0
                          ? "#4ade80"
                          : "#f87171",
                    }}
                  >
                    {totals.t1}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    background: "rgba(232,220,200,0.05)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      color: "#a8b0a8",
                      fontSize: 12,
                      marginBottom: 3,
                    }}
                  >
                    {pair2Name}
                  </div>

                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 22,
                      fontWeight: 900,
                      color:
                        totals.t2 >= roundTarget
                          ? "#d4b85e"
                          : totals.t2 >= 0
                          ? "#4ade80"
                          : "#f87171",
                    }}
                  >
                    {totals.t2}
                  </div>
                </div>
              </div>

              {subs.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {subs.map((s, sIdx) => {
                    const s1 = calcSubScore(s, "team1");
                    const s2 = calcSubScore(s, "team2");
                    const b1 = (s.team1Buracos || []).length;
                    const b2 = (s.team2Buracos || []).length;
                    const endInfo = getEndTypeInfo(s.endType);

                    let endText = "";

                    if (endInfo.type === "closed") {
                      endText =
                        endInfo.team === "team1"
                          ? `Cerró ${pair1Name}`
                          : `Cerró ${pair2Name}`;
                    }

                    if (endInfo.type === "joker") {
                      endText =
                        endInfo.team === "team1"
                          ? `${pair1Name} botó comodín`
                          : `${pair2Name} botó comodín`;
                    }

                    if (endInfo.type === "cards_out") {
                      endText = "Se acabaron las cartas · Nadie cerró";
                    }

                    return (
                      <div
                        key={sIdx}
                        onClick={() => openSubRoundEntry(rIdx, sIdx)}
                        style={{
                          padding: "8px 4px",
                          borderBottom:
                            sIdx < subs.length - 1
                              ? "1px solid rgba(232,220,200,0.06)"
                              : "none",
                          cursor: "pointer",
                          borderRadius: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "#8a9a8c",
                              fontSize: 12,
                              width: 28,
                            }}
                          >
                            #{sIdx + 1}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              flex: 1,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  color: s1 >= 0 ? "#a8b0a8" : "#f87171",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  fontFamily: "'Playfair Display', serif",
                                }}
                              >
                                {s1}
                              </span>

                              {b1 > 0 ? (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#22c55e",
                                    marginTop: 1,
                                  }}
                                >
                                  {b1} buraco{b1 > 1 ? "s" : ""}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#f87171",
                                    marginTop: 1,
                                  }}
                                >
                                  sin buraco
                                </div>
                              )}
                            </div>

                            <span style={{ color: "#555", fontSize: 12 }}>
                              vs
                            </span>

                            <div style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  color: s2 >= 0 ? "#a8b0a8" : "#f87171",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  fontFamily: "'Playfair Display', serif",
                                }}
                              >
                                {s2}
                              </span>

                              {b2 > 0 ? (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#22c55e",
                                    marginTop: 1,
                                  }}
                                >
                                  {b2} buraco{b2 > 1 ? "s" : ""}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#f87171",
                                    marginTop: 1,
                                  }}
                                >
                                  sin buraco
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            style={{
                              color: "#c4b89a",
                              fontSize: 13,
                              opacity: 0.5,
                            }}
                          >
                            ✎
                          </span>
                        </div>

                        {endText && (
                          <div
                            style={{
                              color:
                                endInfo.type === "joker"
                                  ? "#f87171"
                                  : endInfo.type === "cards_out"
                                  ? "#94a3b8"
                                  : "#d4b85e",
                              fontSize: 11,
                              textAlign: "center",
                              marginTop: 5,
                              fontWeight: 600,
                            }}
                          >
                            {endText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {subs.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  {[totals.t1, totals.t2].map((val, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(232,220,200,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(
                            100,
                            Math.max(0, (val / roundTarget) * 100)
                          )}%`,
                          background:
                            val >= roundTarget ? "#d4b85e" : "#4ade80",
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {unlocked && !finished && (
                <button
                  type="button"
                  onClick={() => openSubRoundEntry(rIdx)}
                  style={{
                    ...btn,
                    width: "100%",
                    padding: "11px 0",
                    fontSize: 14,
                    background: gold,
                    color: "#1a1a2e",
                  }}
                >
                  + Agregar sub-ronda
                </button>
              )}

              {finished && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#8a9a8c",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {roundWinner === "team1" &&
                    `${pair1Name} ganó en ${subs.length} sub-ronda${
                      subs.length !== 1 ? "s" : ""
                    }`}
                  {roundWinner === "team2" &&
                    `${pair2Name} ganó en ${subs.length} sub-ronda${
                      subs.length !== 1 ? "s" : ""
                    }`}
                  {roundWinner === "tie" &&
                    `Empate en la ronda tras ${subs.length} sub-ronda${
                      subs.length !== 1 ? "s" : ""
                    }`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
