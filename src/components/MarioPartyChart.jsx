import { useMemo } from "react";
import { PLAYER_COLORS } from "../utils/constants";
import { getPlayerAvatar } from "../utils/avatars";

function getTieOffsets(checkpoints, players, markerR) {
  return checkpoints.map((cp) => {
    const groups = {};

    cp.forEach((entry) => {
      if (!groups[entry.score]) groups[entry.score] = [];
      groups[entry.score].push(entry.index);
    });

    const offsets = {};
    const spacing = markerR * 2 + 3;

    Object.values(groups).forEach((group) => {
      group.forEach((pIdx, i) => {
        offsets[pIdx] =
          group.length > 1 ? (i - (group.length - 1) / 2) * spacing : 0;
      });
    });

    return offsets;
  });
}

export default function MarioPartyChart({ players, checkpoints, heartFaces }) {
  const W = 400;
  const H = 350;
  const padL = 58;
  const padR = 20;
  const padT = 82;
  const padB = 66;

  const chartLeft = padL;
  const chartRight = W - padR;
  const chartTop = padT;
  const chartBottom = H - padB;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;
  const markerR = 16;

  const allScores = checkpoints.flatMap((cp) => cp.map((entry) => entry.score));
  const maxScore = Math.max(0, ...allScores);
  const minScore = Math.min(0, ...allScores);
  const scaleMax = Math.max(500, Math.ceil(maxScore / 500) * 500);
  const scaleMin = Math.min(0, Math.floor(minScore / 500) * 500);
  const scoreRange = Math.max(1, scaleMax - scaleMin);
  const scoreTicks = [scaleMax, Math.round((scaleMax + scaleMin) / 2), scaleMin];

  const playerPaths = useMemo(
    () =>
      players.map((_, pIdx) =>
        checkpoints.map((cp) => {
          const entry = cp.find((e) => e.index === pIdx);
          return { position: entry.position, score: entry.score };
        })
      ),
    [checkpoints, players]
  );

  const tieOffsets = useMemo(
    () => getTieOffsets(checkpoints, players, markerR),
    [checkpoints, players]
  );

  const getX = (cpIdx) => chartLeft + (cpIdx / 2) * chartW;
  const getY = (score) =>
    chartBottom - ((score - scaleMin) / scoreRange) * chartH;

  const labels = ["R1", "R2", "R3"];
  const winnerIdx = checkpoints[2]
    ? checkpoints[2].reduce((best, entry) =>
        !best || entry.score > best.score ? entry : best
      ).index
    : null;

  return (
    <div
      style={{
        background: "rgba(232,220,200,0.06)",
        borderRadius: 16,
        padding: "16px 8px 10px",
        border: "1px solid rgba(232,220,200,0.1)",
        marginBottom: 16,
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <text
          x={W / 2}
          y="24"
          textAnchor="middle"
          fill="#e8dcc8"
          fontSize="17"
          fontWeight="900"
          fontFamily="'Playfair Display', serif"
        >
          Carrera de Burakeros
        </text>

        {labels.map((label, i) => (
          <text
            key={label}
            x={getX(i)}
            y={chartTop - 12}
            textAnchor="middle"
            fill="#c4b89a"
            fontSize="14"
            fontWeight="600"
            fontFamily="'DM Sans', sans-serif"
          >
            {label}
          </text>
        ))}

        {scoreTicks.map((score) => (
          <g key={score}>
            <line
              x1={chartLeft}
              y1={getY(score)}
              x2={chartRight}
              y2={getY(score)}
              stroke="rgba(232,220,200,0.07)"
              strokeWidth="1"
            />
            <text
              x={chartLeft - 10}
              y={getY(score) + 4}
              textAnchor="end"
              fill="#8a9a8c"
              fontSize="11"
              fontFamily="'Playfair Display', serif"
              fontWeight="700"
            >
              {score}
            </text>
          </g>
        ))}

        {[0, 1, 2].map((i) => (
          <line
            key={`v${i}`}
            x1={getX(i)}
            y1={chartTop}
            x2={getX(i)}
            y2={chartBottom}
            stroke="rgba(232,220,200,0.05)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {playerPaths.map((path, pIdx) => {
          const color = PLAYER_COLORS[pIdx];
          const pts = path.map((p, i) => ({
            x: getX(i) + (tieOffsets[i]?.[pIdx] || 0),
            y: getY(p.score),
          }));

          let d = `M ${pts[0].x} ${pts[0].y}`;
          for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const cx = (prev.x + curr.x) / 2;
            d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
          }

          return (
            <path
              key={`line-${pIdx}`}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.6"
            />
          );
        })}

        {playerPaths.map((path, pIdx) => {
          const color = PLAYER_COLORS[pIdx];
          const name = players[pIdx];
          const avatarSrc = getPlayerAvatar(name, heartFaces);
          const initial = name.charAt(0).toUpperCase();
          const isWinner = pIdx === winnerIdx;

          return path.map((p, cpIdx) => {
            const ox = tieOffsets[cpIdx]?.[pIdx] || 0;
            const x = getX(cpIdx) + ox;
            const y = getY(p.score);
            const clipId = `mp-clip-${pIdx}-${cpIdx}`;

            return (
              <g key={`m-${pIdx}-${cpIdx}`}>
                {avatarSrc ? (
                  <>
                    <defs>
                      <clipPath id={clipId}>
                        <circle cx={x} cy={y} r={markerR} />
                      </clipPath>
                    </defs>
                    <circle cx={x} cy={y} r={markerR + 2} fill={color} opacity="0.9" />
                    <image
                      href={avatarSrc}
                      x={x - markerR}
                      y={y - markerR}
                      width={markerR * 2}
                      height={markerR * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <>
                    <circle cx={x} cy={y} r={markerR} fill={color} />
                    <text
                      x={x}
                      y={y + 5}
                      textAnchor="middle"
                      fill="#1a1a2e"
                      fontSize="14"
                      fontWeight="700"
                      fontFamily="'Playfair Display', serif"
                    >
                      {initial}
                    </text>
                  </>
                )}
                {cpIdx === 2 && isWinner && (
                  <text x={x} y={y - markerR - 6} textAnchor="middle" fontSize="20">
                    ★
                  </text>
                )}
              </g>
            );
          });
        })}

        {players.map((name, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const legendX = chartLeft + col * (chartW / 2) + 6;
          const legendY = chartBottom + 24 + row * 22;

          return (
            <g key={`leg-${i}`}>
              <circle cx={legendX} cy={legendY - 4} r="6" fill={PLAYER_COLORS[i]} />
              <text
                x={legendX + 12}
                y={legendY}
                fill="#e8dcc8"
                fontSize="13"
                fontWeight="600"
                fontFamily="'DM Sans', sans-serif"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
