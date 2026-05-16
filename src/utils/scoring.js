import { ALL_TARGETS_VALUE, BURACO_TYPES, ROTATIONS } from "./constants";

export function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getEndTypeInfo(endType) {
  if (endType === "team1_closed") return { team: "team1", type: "closed" };
  if (endType === "team2_closed") return { team: "team2", type: "closed" };
  if (endType === "team1_joker") return { team: "team1", type: "joker" };
  if (endType === "team2_joker") return { team: "team2", type: "joker" };
  if (endType === "cards_out") return { team: null, type: "cards_out" };
  return { team: null, type: null };
}

export function calcSubScore(sub, teamKey) {
  const score = sub[teamKey + "Score"] || 0;
  const buracos = sub[teamKey + "Buracos"] || [];
  const noMuerto = sub[teamKey + "NoMuerto"] || false;
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
  } else if (endingType === "joker" && endingTeam !== teamKey) {
    return 0;
  } else if (
    endingType === "closed" &&
    endingTeam !== teamKey &&
    buracos.length === 0
  ) {
    total = -Math.abs(total);
  } else if (endingType === "cards_out" && buracos.length === 0) {
    total = -Math.abs(total);
  }

  if (noMuerto) total -= 300;

  return total;
}

export function getRoundTotals(rounds) {
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

export function getCumulativeScores(rounds, roundTotals, players) {
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

export function getRoundWinner(totals, roundTarget) {
  const t1Reached = totals.t1 >= roundTarget;
  const t2Reached = totals.t2 >= roundTarget;

  if (!t1Reached && !t2Reached) return null;
  if (totals.t1 > totals.t2) return "team1";
  if (totals.t2 > totals.t1) return "team2";

  return "tie";
}

export function getProgressiveRankings(rounds, roundTotals, players) {
  const checkpoints = [];
  const cumulative = players.map(() => 0);

  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const rot = ROTATIONS[rIdx];
    const t = roundTotals[rIdx];

    rot.pair1.forEach((pi) => {
      cumulative[pi] += t.t1;
    });

    rot.pair2.forEach((pi) => {
      cumulative[pi] += t.t2;
    });

    const sorted = players
      .map((_, i) => ({ index: i, score: cumulative[i] }))
      .sort((a, b) => b.score - a.score);

    let pos = 1;

    sorted.forEach((p, i) => {
      if (i > 0 && p.score === sorted[i - 1].score) {
        p.position = sorted[i - 1].position;
      } else {
        p.position = pos;
      }

      pos++;
    });

    checkpoints.push(sorted);
  }

  return checkpoints;
}

export function getHistoricalTargetOptions(history) {
  const targets = new Set([3000]);

  history.forEach((game) => {
    const target = Number(game.roundTarget || 3000);
    if (Number.isFinite(target) && target > 0) targets.add(target);
  });

  return Array.from(targets).sort((a, b) => a - b);
}

export function isAllHistoricalTargets(target) {
  return target === ALL_TARGETS_VALUE;
}

export function getHistoricalTargetLabel(target) {
  if (isAllHistoricalTargets(target)) {
    return "todos los puntajes";
  }

  return `${target} puntos`;
}

export function getHistoricalRangeLabel(rangeMode, rangeDays) {
  if (rangeMode === "recent") {
    return `ultimos ${rangeDays} dias`;
  }

  return "overall";
}

export function getFilteredHistoricalGames(history, target, rangeMode, rangeDays) {
  const cutoff =
    rangeMode === "recent"
      ? Date.now() - Number(rangeDays || 30) * 24 * 60 * 60 * 1000
      : null;

  return history.filter((game) => {
    if (
      !isAllHistoricalTargets(target) &&
      Number(game.roundTarget || 3000) !== Number(target)
    ) {
      return false;
    }

    if (cutoff === null) return true;

    const gameTime = new Date(game.date).getTime();
    return Number.isFinite(gameTime) && gameTime >= cutoff;
  });
}

export function hasRoundDetails(game) {
  return (
    Array.isArray(game?.roundDetails) &&
    game.roundDetails.length === ROTATIONS.length
  );
}

export function getHistoricalRanking(
  history,
  target,
  metric,
  rangeMode,
  rangeDays
) {
  const aggregates = new Map();

  getFilteredHistoricalGames(history, target, rangeMode, rangeDays).forEach(
    (game) => {
      (game.ranking || []).forEach((player) => {
        const displayName = (player.name || "").trim();
        const key = normalizeName(displayName);

        if (!key) return;

        const current = aggregates.get(key) || {
          key,
          name: displayName,
          totalPoints: 0,
          gamesPlayed: 0,
        };

        current.name = displayName || current.name;
        current.totalPoints += Number(player.score) || 0;
        current.gamesPlayed += 1;

        aggregates.set(key, current);
      });
    }
  );

  return Array.from(aggregates.values())
    .map((player) => ({
      ...player,
      averagePoints:
        player.gamesPlayed > 0
          ? player.totalPoints / player.gamesPlayed
          : 0,
      rankingPoints:
        metric === "sum"
          ? player.totalPoints
          : player.totalPoints / player.gamesPlayed,
    }))
    .sort((a, b) => {
      if (b.rankingPoints !== a.rankingPoints) {
        return b.rankingPoints - a.rankingPoints;
      }

      if (b.gamesPlayed !== a.gamesPlayed) {
        return b.gamesPlayed - a.gamesPlayed;
      }

      return a.name.localeCompare(b.name, "es");
    });
}

export function formatPoints(value) {
  return Number(value || 0).toLocaleString("es", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}
