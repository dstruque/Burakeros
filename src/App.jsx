import { useState, useMemo, useEffect } from "react";

const ROTATIONS = [
  { pair1: [0, 1], pair2: [2, 3] },
  { pair1: [0, 2], pair2: [1, 3] },
  { pair1: [0, 3], pair2: [1, 2] },
];

const BURACO_TYPES = [
  { key: "limpio", label: "Limpio", pts: 500, color: "#22c55e" },
  { key: "sucio", label: "Sucio", pts: 300, color: "#eab308" },
  { key: "as_limpio", label: "As Limpio", pts: 800, color: "#3b82f6" },
  { key: "as_sucio", label: "As Sucio", pts: 500, color: "#8b5cf6" },
];

const FACE_SETS = [
  {
    normal: { woman: "/mujer.png", man: "/hombre.png" },
    hearts: { woman: "/Mujerc.png", man: "/Hombrec.png" },
  },
  {
    normal: { woman: "/Mujer2.png", man: "/Hombre2.png" },
    hearts: { woman: "/Mujerc2.png", man: "/Hombrec2.png" },
  },
  {
    normal: { woman: "/Mujer3.png", man: "/Hombre3.png" },
    hearts: { woman: "/Mujerc3.png", man: "/Hombrec3.png" },
  },
];

const PLAYER_AVATARS = {
  fernando: {
    normal: "/hombre.png",
    hearts: "/HombreC.png",
  },
  lucy: {
    normal: "/mujer.png",
    hearts: "/MujerC.png",
  },
  audrey: {
    normal: "/Mujer2.png",
    hearts: "/Mujerc2.png",
  },
  "juan miguel": {
    normal: "/Hombre2.png",
    hearts: "/Hombrec2.png",
  },
  werner: {
    normal: "/Hombre3.png",
    hearts: "/Hombrec3.png",
  },
  ivetty: {
    normal: "/Mujer3.png",
    hearts: "/Mujerc3.png",
  },
};

const HISTORY_STORAGE_KEY = "burakeros-history";
const ACTIVE_GAME_STORAGE_KEY = "burakeros-active-game";
const LAST_PLAYERS_STORAGE_KEY = "burakeros-last-players";

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap";

const btn = {
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700,
  transition: "all 0.2s ease",
};

const bg =
  "linear-gradient(160deg, #0d1b0e 0%, #1a2e1c 40%, #0f1a11 100%)";

const gold = "linear-gradient(135deg, #c4a24e, #d4b85e)";

const faceWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginBottom: 10,
};

const setupFaceStyle = {
  width: 58,
  height: 58,
  objectFit: "contain",
  animation: "faceSwing 3.4s ease-in-out infinite",
  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.28))",
};

const setupFaceReverseStyle = {
  ...setupFaceStyle,
  animationDelay: "1.7s",
};

const gameFaceStyle = {
  width: 44,
  height: 44,
  objectFit: "contain",
  animation: "faceSwing 3.4s ease-in-out infinite",
  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.28))",
};

const gameFaceReverseStyle = {
  ...gameFaceStyle,
  animationDelay: "1.7s",
};

function AppStyles() {
  return (
    <>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        @keyframes faceSwing {
          0% {
            transform: translateX(-6px) rotate(-2deg);
          }
          50% {
            transform: translateX(6px) rotate(2deg);
          }
          100% {
            transform: translateX(-6px) rotate(-2deg);
          }
        }

        @keyframes winnerPop {
          0% {
            transform: scale(0.92);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }

        button:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  );
}

function createGameId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPlayerAvatar(name, heartFaces) {
  const avatar = PLAYER_AVATARS[normalizeName(name)];
  if (!avatar) return null;
  return heartFaces ? avatar.hearts : avatar.normal;
}

function getEndTypeInfo(endType) {
  if (endType === "team1_closed") {
    return { team: "team1", type: "closed" };
  }

  if (endType === "team2_closed") {
    return { team: "team2", type: "closed" };
  }

  if (endType === "team1_joker") {
    return { team: "team1", type: "joker" };
  }

  if (endType === "team2_joker") {
    return { team: "team2", type: "joker" };
  }

  if (endType === "cards_out") {
    return { team: null, type: "cards_out" };
  }

  return { team: null, type: null };
}

function calcSubScore(sub, teamKey) {
  const score = sub[teamKey + "Score"] || 0;
  const buracos = sub[teamKey + "Buracos"] || [];
  const { team: endingTeam, type: endingType } = getEndTypeInfo(sub.endType);

  let buracoPts = 0;

  buracos.forEach((b) => {
    const bt = BURACO_TYPES.find((t) => t.key === b);
    if (bt) buracoPts += bt.pts;
  });

  let total = score + buracoPts;

  if (endingType === "closed" && endingTeam === teamKey) {
    total += 200;
  }

  if (endingType === "joker" && endingTeam === teamKey) {
    total = -Math.abs(total);
  } else if (
    endingType === "closed" &&
    endingTeam !== teamKey &&
    buracos.length === 0
  ) {
    total = -Math.abs(total);
  }


  return total;
}

function getRoundTotals(rounds) {
  return rounds.map((subs) => {
    let t1 = 0;
    let t2 = 0;

    subs.forEach((s) => {
      t1 += calcSubScore(s, "team1");
      t2 += calcSubScore(s, "team2");
    });

    return { t1, t2 };
  });
}

function getCumulativeScores(rounds, roundTotals, players) {
  const cs = players.map(() => 0);

  rounds.forEach((_, rIdx) => {
    const rot = ROTATIONS[rIdx];
    const t = roundTotals[rIdx];

    rot.pair1.forEach((pi) => {
      cs[pi] += t.t1;
    });

    rot.pair2.forEach((pi) => {
      cs[pi] += t.t2;
    });
  });

  return cs;
}

function getRoundWinner(totals, roundTarget) {
  const t1Reached = totals.t1 >= roundTarget;
  const t2Reached = totals.t2 >= roundTarget;

  if (!t1Reached && !t2Reached) return null;

  if (totals.t1 > totals.t2) return "team1";
  if (totals.t2 > totals.t1) return "team2";

  return "tie";
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error(e);
  }
}

function loadActiveGame() {
  try {
    const saved = localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveActiveGame(game) {
  try {
    localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(game));
  } catch (e) {
    console.error(e);
  }
}

function clearActiveGame() {
  try {
    localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

function loadLastPlayers() {
  try {
    const saved = localStorage.getItem(LAST_PLAYERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLastPlayers(players) {
  try {
    localStorage.setItem(LAST_PLAYERS_STORAGE_KEY, JSON.stringify(players));
  } catch (e) {
    console.error(e);
  }
}

function SuitEasterEggs({
  onDiamondClick,
  onHeartClick,
  heartFaces,
  compact = false,
}) {
  return (
    <div
      style={{
        fontSize: compact ? 22 : 28,
        marginBottom: compact ? 6 : 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 8 : 10,
        userSelect: "none",
      }}
    >
      <span>♠</span>
      <button
        type="button"
        onClick={onHeartClick}
        aria-label="Activar corazones"
        style={{
          border: "none",
          background: "transparent",
          color: heartFaces ? "#fb7185" : "inherit",
          fontSize: "inherit",
          padding: 0,
          cursor: "pointer",
          lineHeight: 1,
          filter: heartFaces
            ? "drop-shadow(0 0 8px rgba(251,113,133,0.7))"
            : "none",
        }}
      >
        ♥
      </button>
      <button
        type="button"
        onClick={onDiamondClick}
        aria-label="Cambiar caras"
        style={{
          border: "none",
          background: "transparent",
          color: "inherit",
          fontSize: "inherit",
          padding: 0,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ♦
      </button>
      <span>♣</span>
    </div>
  );
}

function PlayerAvatar({ name, heartFaces, size = 34 }) {
  const src = getPlayerAvatar(name, heartFaces);

  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(232,220,200,0.08)",
          border: "1px solid rgba(232,220,200,0.12)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 3px 7px rgba(0,0,0,0.28))",
      }}
    />
  );
}

function BuracoSelector({ buracos, onAdd, onRemove }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          color: "#c4b89a",
          fontSize: 13,
          fontWeight: 700,
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Buracos cerrados
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {BURACO_TYPES.map((bt) => (
          <button
            key={bt.key}
            type="button"
            onClick={() => onAdd(bt.key)}
            style={{
              ...btn,
              padding: "12px 8px",
              fontSize: 14,
              background: bt.color + "25",
              color: bt.color,
              border: `2px solid ${bt.color}77`,
              borderRadius: 12,
              lineHeight: 1.3,
            }}
          >
            + {bt.label}
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              {bt.pts} pts
            </span>
          </button>
        ))}
      </div>

      {buracos.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {buracos.map((b, i) => {
            const bt = BURACO_TYPES.find((t) => t.key === b);

            return (
              <span
                key={`${b}-${i}`}
                onClick={() => onRemove(i)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: bt.color + "33",
                  color: bt.color,
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {bt.label} ✕
              </span>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            color: "#f87171",
            fontSize: 13,
            marginBottom: 8,
            padding: "8px 12px",
            background: "rgba(248,113,113,0.1)",
            borderRadius: 8,
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          ⚠ Sin buraco puede quedar negativo
        </div>
      )}
    </div>
  );
}

function TeamEntryPanel({
  teamName,
  points,
  onPointsChange,
  buracos,
  onAddBuraco,
  onRemoveBuraco,
}) {
  return (
    <div
      style={{
        background: "rgba(232,220,200,0.06)",
        borderRadius: 14,
        padding: 18,
        border: "1px solid rgba(232,220,200,0.12)",
        marginBottom: 14,
      }}
    >
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          color: "#e8dcc8",
          fontSize: 18,
          margin: "0 0 14px",
        }}
      >
        {teamName}
      </h3>

      <label
        style={{
          color: "#8a9a8c",
          fontSize: 12,
          display: "block",
          marginBottom: 6,
        }}
      >
        Puntaje Base
      </label>

      <input
        type="number"
        inputMode="numeric"
        value={points}
        onChange={(e) => onPointsChange(e.target.value)}
        placeholder="0"
        style={{
          border: "2px solid rgba(232,220,200,0.25)",
          borderRadius: 12,
          padding: 14,
          fontSize: 22,
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          background: "rgba(250,249,246,0.08)",
          color: "#e8dcc8",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      />

      <BuracoSelector
        buracos={buracos}
        onAdd={onAddBuraco}
        onRemove={onRemoveBuraco}
      />

    </div>
  );
}

function EndTypeSelector({ pair1Name, pair2Name, endType, onChange }) {
  const options = [
    {
      key: "team1_closed",
      label: `${pair1Name} cerró`,
      detail: "+200",
      color: "#4ade80",
    },
    {
      key: "team2_closed",
      label: `${pair2Name} cerró`,
      detail: "+200",
      color: "#4ade80",
    },
    {
      key: "team1_joker",
      label: `${pair1Name} botó comodín`,
      detail: "Ese equipo va negativo",
      color: "#f87171",
    },
    {
      key: "team2_joker",
      label: `${pair2Name} botó comodín`,
      detail: "Ese equipo va negativo",
      color: "#f87171",
    },
    {
      key: "cards_out",
      label: "Se acabaron las cartas",
      detail: "Nadie cerró",
      color: "#94a3b8",
    },
  ];

  return (
    <div
      style={{
        background: "rgba(232,220,200,0.06)",
        borderRadius: 14,
        padding: 18,
        border: "1px solid rgba(232,220,200,0.12)",
        marginBottom: 14,
      }}
    >
      <p
        style={{
          color: "#c4b89a",
          fontSize: 13,
          fontWeight: 700,
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        ¿Cómo terminó la sub-ronda?
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {options.map((option) => {
          const selected = endType === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              style={{
                ...btn,
                width: "100%",
                padding: "12px 14px",
                textAlign: "left",
                borderRadius: 12,
                background: selected
                  ? option.color + "22"
                  : "rgba(232,220,200,0.04)",
                color: selected ? option.color : "#c4b89a",
                border: `2px solid ${
                  selected ? option.color + "88" : "rgba(232,220,200,0.1)"
                }`,
              }}
            >
              <div style={{ fontSize: 14 }}>
                {selected ? "✓ " : "○ "}
                {option.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginTop: 3,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {option.detail}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const [subEndType, setSubEndType] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [gameSaved, setGameSaved] = useState(false);
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [savedGamePreview, setSavedGamePreview] = useState(null);

  const [lastPlayers, setLastPlayers] = useState([]);
  const [gameId, setGameId] = useState(null);

  const [faceSetIndex, setFaceSetIndex] = useState(0);
  const [heartFaces, setHeartFaces] = useState(false);

  useEffect(() => {
    const h = loadHistory();
    const active = loadActiveGame();
    const savedPlayers = loadLastPlayers();

    setHistory(h);
    setHistoryLoaded(true);
    setLastPlayers(savedPlayers);

    if (active) {
      setSavedGamePreview(active);
    }
  }, []);

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
    setSubEndType(null);
  };

  const resetFullSetup = () => {
    setPlayers(["", "", "", ""]);
    setRoundTarget(3000);
    setRounds([[], [], []]);
    setShowRules(false);
    setGameSaved(false);
    setHasActiveGame(false);
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
    setSubEndType(savedGamePreview.subEndType || null);

    setFaceSetIndex(savedGamePreview.faceSetIndex || 0);
    setHeartFaces(savedGamePreview.heartFaces || false);

    setGameId(savedGamePreview.gameId || createGameId());
    setGameSaved(false);
    setHasActiveGame(true);
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

    if (subIdx !== null) {
      const s = rounds[rIdx][subIdx];

      setT1Pts(String(s.team1Score || 0));
      setT2Pts(String(s.team2Score || 0));
      setT1Buracos([...(s.team1Buracos || [])]);
      setT2Buracos([...(s.team2Buracos || [])]);
      setSubEndType(s.endType || null);
    } else {
      resetInputs();
    }
  };

  const saveSubRound = () => {
    if (!subEndType) return;

    const newSub = {
      team1Score: parseInt(t1Pts, 10) || 0,
      team2Score: parseInt(t2Pts, 10) || 0,
      team1Buracos: [...t1Buracos],
      team2Buracos: [...t2Buracos],
      endType: subEndType,
    };

    setRounds((prev) => {
      const updated = prev.map((r) => [...r]);

      if (editingSubIdx !== null) {
        updated[editingRound][editingSubIdx] = newSub;
      } else {
        updated[editingRound] = [...updated[editingRound], newSub];
      }

      return updated;
    });

    setEditingRound(null);
    setEditingSubIdx(null);
  };

  const deleteSubRound = (rIdx, sIdx) => {
    if (!confirm("¿Eliminar esta sub-ronda?")) return;

    setRounds((prev) => {
      const updated = prev.map((r) => [...r]);
      updated[rIdx] = updated[rIdx].filter((_, i) => i !== sIdx);
      return updated;
    });
  };

  useEffect(() => {
    if (hasActiveGame && !allFinished) {
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
        subEndType,
        faceSetIndex,
        heartFaces,
        savedAt: new Date().toISOString(),
      };

      saveActiveGame(activeGame);
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
    subEndType,
    faceSetIndex,
    heartFaces,
  ]);

  useEffect(() => {
    if (
      allFinished &&
      !gameSaved &&
      players.every((p) => p.trim()) &&
      historyLoaded
    ) {
      const alreadySaved = history.some((h) => h.gameId && h.gameId === gameId);

      if (alreadySaved) {
        setGameSaved(true);
        setHasActiveGame(false);
        setSavedGamePreview(null);
        clearActiveGame();
        return;
      }

      const rt = getRoundTotals(rounds);
      const cs = getCumulativeScores(rounds, rt, players);

      const ranked = players
        .map((name, i) => ({
          name,
          score: cs[i],
        }))
        .sort((a, b) => b.score - a.score);

      const entry = {
        gameId,
        date: new Date().toISOString(),
        players: [...players],
        roundTarget,
        ranking: ranked,
        rounds: rounds.map((subs, rIdx) => ({
          t1: rt[rIdx].t1,
          t2: rt[rIdx].t2,
          subRounds: subs.length,
        })),
      };

      const newHistory = [entry, ...history].slice(0, 50);

      setHistory(newHistory);
      saveHistory(newHistory);
      setGameSaved(true);
      setHasActiveGame(false);
      setSavedGamePreview(null);
      clearActiveGame();
    }
  }, [
    allFinished,
    gameSaved,
    players,
    rounds,
    history,
    historyLoaded,
    roundTarget,
    gameId,
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
                  style={{
                    background: "rgba(232,220,200,0.06)",
                    borderRadius: 14,
                    padding: 16,
                    border: "1px solid rgba(232,220,200,0.1)",
                    marginBottom: 12,
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
                    </div>

                    <span style={{ fontSize: 14 }}>🏆</span>
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
                  localStorage.removeItem(HISTORY_STORAGE_KEY);
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
          />

          <EndTypeSelector
            pair1Name={pair1Name}
            pair2Name={pair2Name}
            endType={subEndType}
            onChange={setSubEndType}
          />

          <button
            type="button"
            onClick={saveSubRound}
            style={{
              ...btn,
              width: "100%",
              padding: "14px 0",
              fontSize: 17,
              background: subEndType ? gold : "#3a3a3a",
              color: subEndType ? "#1a1a2e" : "#777",
              letterSpacing: 1,
              marginTop: 4,
              cursor: subEndType ? "pointer" : "not-allowed",
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

          {isEditing && (
            <button
              type="button"
              onClick={() => {
                deleteSubRound(editingRound, editingSubIdx);
                setEditingRound(null);
                setEditingSubIdx(null);
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

  if (allFinished) {
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

                  <PlayerAvatar name={p.name} heartFaces={heartFaces} size={40} />

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

          <div style={{ display: "flex", gap: 10 }}>
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
            Cerrar: +200
            <br />
            Si el rival cierra y no tienes buraco: todo negativo
            <br />
            Si botas comodín: tu equipo va negativo
            <br />
            Si el rival bota comodín: tú no recibes penalización por no tener buraco
            <br />
            Si se acaban las cartas: nadie cierra
          </div>
        )}

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
