import { formatPoints, getHistoricalTargetLabel } from "../utils/scoring";
import { bg } from "../utils/styles";
import PlayerAvatar from "./PlayerAvatar";

export function HistoricalRankingRows({
  ranking,
  limit = null,
  metric,
  heartFaces,
}) {
  const rows = limit ? ranking.slice(0, limit) : ranking;
  const metricLabel = metric === "sum" ? "pts suma" : "pts promedio";

  return (
    <>
      {rows.map((player, index) => (
        <div
          key={player.key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom:
              index < rows.length - 1
                ? "1px solid rgba(232,220,200,0.08)"
                : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 28,
                color:
                  index === 0
                    ? "#d4b85e"
                    : index === 1
                    ? "#94a3b8"
                    : index === 2
                    ? "#b45309"
                    : "#8a9a8c",
                fontFamily: "'Playfair Display', serif",
                fontSize: 20,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </span>

            <PlayerAvatar
              name={player.name}
              heartFaces={heartFaces}
              size={34}
            />

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#e8dcc8",
                  fontWeight: 700,
                  fontSize: 15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {player.name}
              </div>
              <div
                style={{
                  color: "#8a9a8c",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {player.gamesPlayed} partida
                {player.gamesPlayed !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                color: "#4ade80",
                fontFamily: "'Playfair Display', serif",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              {formatPoints(player.rankingPoints)}
            </div>
            <div
              style={{
                color: "#8a9a8c",
                fontSize: 11,
                marginTop: 1,
              }}
            >
              {metricLabel}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function HistoricalRankingImageCard({
  ranking,
  target,
  metric,
  rangeLabel,
  heartFaces,
}) {
  return (
    <div
      style={{
        width: 460,
        boxSizing: "border-box",
        background: bg,
        padding: 22,
        fontFamily: "'DM Sans', sans-serif",
        color: "#e8dcc8",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>♠ ♥ ♦ ♣</div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 30,
            margin: 0,
            fontWeight: 900,
            color: "#e8dcc8",
          }}
        >
          Ranking Historico
        </h2>
        <div
          style={{
            color: "#c4b89a",
            fontSize: 14,
            marginTop: 6,
          }}
        >
          Burakeros · {rangeLabel} · {getHistoricalTargetLabel(target)}
        </div>
      </div>

      <div
        style={{
          background: "rgba(232,220,200,0.06)",
          borderRadius: 18,
          padding: 16,
          border: "1px solid rgba(232,220,200,0.12)",
        }}
      >
        {ranking.length === 0 ? (
          <div
            style={{
              padding: "24px 10px",
              textAlign: "center",
              color: "#8a9a8c",
              fontSize: 14,
            }}
          >
            No hay partidas guardadas con estos filtros.
          </div>
        ) : (
          <HistoricalRankingRows
            ranking={ranking}
            limit={6}
            metric={metric}
            heartFaces={heartFaces}
          />
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          color: "#666",
          fontSize: 11,
          marginTop: 14,
        }}
      >
        Top 6 por {metric === "sum" ? "suma de puntos" : "puntos promedio"}
      </div>
    </div>
  );
}
