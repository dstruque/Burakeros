export const ROTATIONS = [
  { pair1: [0, 1], pair2: [2, 3] },
  { pair1: [0, 2], pair2: [1, 3] },
  { pair1: [0, 3], pair2: [1, 2] },
];

export const BURACO_TYPES = [
  { key: "limpio", label: "Limpio", pts: 500, color: "#22c55e" },
  { key: "sucio", label: "Sucio", pts: 300, color: "#eab308" },
  { key: "as_limpio", label: "As Limpio", pts: 800, color: "#3b82f6" },
  { key: "as_sucio", label: "As Sucio", pts: 500, color: "#8b5cf6" },
];

export const PLAYER_AVATARS = {
  fernando: { normal: "/hombre.png", hearts: "/Hombrec.png" },
  lucy: { normal: "/mujer.png", hearts: "/Mujerc.png" },
  audrey: { normal: "/Mujer2.png", hearts: "/Mujerc2.png" },
  "juan miguel": { normal: "/Hombre2.png", hearts: "/Hombrec2.png" },
  werner: { normal: "/Hombre3.png", hearts: "/Hombrec3.png" },
  ivetty: { normal: "/Mujer3.png", hearts: "/Mujerc3.png" },
};

export const FACE_SETS = [
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

export const PLAYER_COLORS = ["#d4b85e", "#4ade80", "#60a5fa", "#f472b6"];

export const HISTORY_STORAGE_KEY = "burakeros-history";
export const ACTIVE_GAME_STORAGE_KEY = "burakeros-active-game";
export const LAST_PLAYERS_STORAGE_KEY = "burakeros-last-players";
export const ONLINE_ACCESS_CODE_STORAGE_KEY = "burakeros-online-access-code";
export const ONLINE_GROUP_NAME_STORAGE_KEY = "burakeros-online-group-name";
export const ONLINE_USER_STORAGE_KEY = "burakeros-online-user";

export const ALL_TARGETS_VALUE = "all";
export const HISTORICAL_RANGE_DAYS_OPTIONS = [7, 30, 90];

export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap";
