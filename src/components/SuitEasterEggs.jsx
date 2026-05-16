export default function SuitEasterEggs({ onDiamondClick, onHeartClick, heartFaces, compact = false }) {
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
          filter: heartFaces ? "drop-shadow(0 0 8px rgba(251,113,133,0.7))" : "none",
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
