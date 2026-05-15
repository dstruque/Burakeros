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

const FACE_LEFT = "/mujer.png";
const FACE_RIGHT = "/hombre.png";

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

function calcSubScore(sub, teamKey) {
  const score = sub[teamKey + "Score"] || 0;
  const buracos = sub[teamKey + "Buracos"] || [];
  const noMuerto = sub[teamKey + "NoMuerto"] || false;

  let buracoPts = 0;

  buracos.forEach((b) => {
    const bt = BURACO_TYPES.find((t) => t.key === b);
    if (bt) buracoPts += bt.pts;
  });

  let total = score + buracoPts;

  if (buracos.length === 0) total = -Math.abs(total);
  if (noMuerto) total -= 300;

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

function loadHistory() {
  try {
    const saved = localStorage.getItem("burakeros-history");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem("burakeros-history", JSON.stringify(history));
  } catch (e) {
    console.error(e);
  }
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
                key={i}
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
          ⚠ Sin buraco = puntos en negativo
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
  noMuerto,
  onToggleNoMuerto,
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
        Puntos de cartas
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

      <button
        onClick={onToggleNoMuerto}
        style={{
          ...btn,
          width: "100%",
          marginTop: 8,
          padding: "12px 14px",
          fontSize: 14,
          textAlign: "left",
          background: noMuerto
            ? "rgba(248,113,113,0.15)"
            : "rgba(232,220,200,0.05)",
          color: noMuerto ? "#f87171" : "#888",
          border: `2px solid ${
            noMuerto
              ? "rgba(248,113,113,0.4)"
              : "rgba(232,220,200,0.12)"
          }`,
          borderRadius: 12,
        }}
      >
        {noMuerto ? "✓ " : "○ "}No robó el muerto (−300)
      </button>
    </div>
  );
}

export default function BurakerosApp() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [showRules, setShowRules] = useState(false);

  const [rounds, setRounds] = useState([[], [], []]);

  const [editingRound, setEditingRound] = useState(null);
  const [editingSubIdx, setEditingSubIdx] = useState(null);

  const [t1Pts, setT1Pts] = useState("");
  const [t2Pts, setT2Pts] = useState("");
  const [t1Buracos, setT1Buracos] = useState([]);
  const [t2Buracos, setT2Buracos] = useState([]);
  const [t1NoMuerto, setT1NoMuerto] = useState(false);
  const [t2NoMuerto, setT2NoMuerto] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [gameSaved, setGameSaved] = useState(false);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setHistoryLoaded(true);
  }, []);

  const roundTotals = useMemo(() => getRoundTotals(rounds), [rounds]);

  const isRoundFinished = (rIdx) =>
    roundTotals[rIdx].t1 >= 3000 || roundTotals[rIdx].t2 >= 3000;

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
    setT1NoMuerto(false);
    setT2NoMuerto(false);
  };

  const startNewGame = () => {
    setScreen("game");
    setRounds([[], [], []]);
    setShowRules(false);
    setGameSaved(false);
    resetInputs();
  };

  const returnToSetup = () => {
    setScreen("setup");
    setRounds([[], [], []]);
    setShowRules(false);
    setGameSaved(false);
    resetInputs();
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
      setT1NoMuerto(s.team1NoMuerto || false);
      setT2NoMuerto(s.team2NoMuerto || false);
    } else {
      resetInputs();
    }
  };

  const saveSubRound = () => {
    const newSub = {
      team1Score: parseInt(t1Pts) || 0,
      team2Score: parseInt(t2Pts) || 0,
      team1Buracos: [...t1Buracos],
      team2Buracos: [...t2Buracos],
      team1NoMuerto: t1NoMuerto,
      team2NoMuerto: t2NoMuerto,
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
    setRounds((prev) => {
      const updated = prev.map((r) => [...r]);
      updated[rIdx] = updated[rIdx].filter((_, i) => i !== sIdx);
      return updated;
    });
  };

  useEffect(() => {
    if (
      allFinished &&
      !gameSaved &&
      players.every((p) => p.trim()) &&
      historyLoaded
    ) {
      const rt = getRoundTotals(rounds);
      const cs = getCumulativeScores(rounds, rt, players);

      const ranked = players
        .map((name, i) => ({
          name,
          score: cs[i],
        }))
        .sort((a, b) => b.score - a.score);

      const entry = {
        date: new Date().toISOString(),
        players: [...players],
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
    }
  }, [
    allFinished,
    gameSaved,
    players,
    rounds,
    history,
    historyLoaded,
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
            onClick={() => setScreen("setup")}
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

              return (
                <div
                  key={gIdx}
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
                    <span style={{ color: "#8a9a8c", fontSize: 12 }}>
                      {dateStr}
                    </span>
                    <span style={{ fontSize: 14 }}>🏆</span>
                  </div>

                  {game.ranking.map((p, pIdx) => (
                    <div
                      key={pIdx}
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

                  {game.rounds && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      {game.rounds.map((r, ri) => (
                        <div
                          key={ri}
                          style={{
                            flex: 1,
                            background: "rgba(232,220,200,0.05)",
                            borderRadius: 8,
                            padding: "6px 8px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              color: "#8a9a8c",
                              fontSize: 10,
                              marginBottom: 2,
                            }}
                          >
                            R{ri + 1}
                          </div>

                          <div
                            style={{
                              color: "#a8b0a8",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {r.t1} vs {r.t2}
                          </div>

                          <div style={{ color: "#666", fontSize: 10 }}>
                            {r.subRounds} sub
                            {r.subRounds !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm("¿Borrar todo el historial?")) {
                  setHistory([]);
                  localStorage.removeItem("burakeros-history");
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
            <div style={{ fontSize: 28, marginBottom: 8 }}>♠ ♥ ♦ ♣</div>

            <div style={faceWrapStyle}>
              <img src={FACE_LEFT} alt="Burakera" style={setupFaceStyle} />

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
                src={FACE_RIGHT}
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
              onClick={() => {
                if (allFilled) startNewGame();
              }}
              style={{
                ...btn,
                width: "100%",
                marginTop: 8,
                padding: "14px 0",
                fontSize: 17,
                background: allFilled ? gold : "#3a3a3a",
                color: allFilled ? "#1a1a2e" : "#777",
                letterSpacing: 1,
              }}
            >
              COMENZAR JUEGO
            </button>
          </div>

          {historyLoaded && (
            <button
              onClick={() => setScreen("history")}
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
            onToggleNoMuerto={() => setT1NoMuerto((v) => !v)}
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
            onToggleNoMuerto={() => setT2NoMuerto((v) => !v)}
          />

          <button
            onClick={saveSubRound}
            style={{
              ...btn,
              width: "100%",
              padding: "14px 0",
              fontSize: 17,
              background: gold,
              color: "#1a1a2e",
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {isEditing ? "GUARDAR CAMBIOS" : "GUARDAR SUB-RONDA"}
          </button>

          {isEditing && (
            <button
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
          <div style={faceWrapStyle}>
            <img src={FACE_LEFT} alt="Burakera" style={gameFaceStyle} />

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
              src={FACE_RIGHT}
              alt="Burakero"
              style={gameFaceReverseStyle}
            />
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
              onClick={() => setScreen("history")}
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
            Cerrar ronda: +200 · No robó muerto: −300
            <br />
            Sin buraco al cierre rival: todo negativo
            <br />
            Botar comodín: todo negativo · Meta: 3000 pts
          </div>
        )}

        {allFinished && (
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(196,162,78,0.12), rgba(212,184,94,0.12))",
              borderRadius: 14,
              padding: 20,
              border: "1px solid rgba(196,162,78,0.3)",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>🏆</div>

            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#d4b85e",
                fontSize: 22,
                margin: 0,
              }}
            >
              ¡{ranking[0].name} gana!
            </h2>

            <p
              style={{
                color: "#c4b89a",
                fontSize: 15,
                margin: "4px 0 0",
              }}
            >
              {ranking[0].score} puntos
            </p>
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
                        totals.t1 >= 3000
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
                        totals.t2 >= 3000
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

                    return (
                      <div
                        key={sIdx}
                        onClick={() => openSubRoundEntry(rIdx, sIdx)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 4px",
                          borderBottom:
                            sIdx < subs.length - 1
                              ? "1px solid rgba(232,220,200,0.06)"
                              : "none",
                          cursor: "pointer",
                          borderRadius: 6,
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
                            Math.max(0, (val / 3000) * 100)
                          )}%`,
                          background: val >= 3000 ? "#d4b85e" : "#4ade80",
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
                  {totals.t1 >= 3000 ? pair1Name : pair2Name} ganó en{" "}
                  {subs.length} sub-ronda{subs.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}