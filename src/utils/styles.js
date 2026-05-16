export const btn = {
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700,
  transition: "all 0.2s ease",
};

export const bg = "linear-gradient(160deg, #0d1b0e 0%, #1a2e1c 40%, #0f1a11 100%)";

export const gold = "linear-gradient(135deg, #c4a24e, #d4b85e)";

export const faceWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginBottom: 10,
};

export const setupFaceStyle = {
  width: 58,
  height: 58,
  objectFit: "contain",
  animation: "faceSwing 3.4s ease-in-out infinite",
  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.28))",
};

export const setupFaceReverseStyle = {
  ...setupFaceStyle,
  animationDelay: "1.7s",
};

export const gameFaceStyle = {
  width: 44,
  height: 44,
  objectFit: "contain",
  animation: "faceSwing 3.4s ease-in-out infinite",
  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.28))",
};

export const gameFaceReverseStyle = {
  ...gameFaceStyle,
  animationDelay: "1.7s",
};
