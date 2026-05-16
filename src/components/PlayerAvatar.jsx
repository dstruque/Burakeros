import { getPlayerAvatar } from "../utils/avatars";

export default function PlayerAvatar({ name, heartFaces, size = 34 }) {
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
