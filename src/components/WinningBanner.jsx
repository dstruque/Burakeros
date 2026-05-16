import PlayerAvatar from "./PlayerAvatar";

export default function WinningBanner({ ranking, heartFaces }) {
  const hasScores = ranking.some((p) => p.score !== 0);
  if (!hasScores) return null;

  const leader = ranking[0];
  const isTied = ranking.length > 1 && ranking[0].score === ranking[1].score;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(196,162,78,0.12), rgba(212,184,94,0.06))",
        borderRadius: 12,
        padding: "10px 16px",
        border: "1px solid rgba(212,184,94,0.2)",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      {isTied ? (
        <span style={{ color: "#c4b89a", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          ⚖️ Empate · {leader.score} pts
        </span>
      ) : (
        <>
          <span style={{ fontSize: 16 }}>👑</span>
          <PlayerAvatar name={leader.name} heartFaces={heartFaces} size={28} />
          <span style={{ color: "#d4b85e", fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            {leader.name}
          </span>
          <span style={{ color: "#c4b89a", fontSize: 13 }}>
            lidera con {leader.score} pts
          </span>
        </>
      )}
    </div>
  );
}
