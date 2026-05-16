import { btn } from "../utils/styles";
import BuracoSelector from "./BuracoSelector";

export default function TeamEntryPanel({
  teamName, points, onPointsChange,
  buracos, onAddBuraco, onRemoveBuraco,
  noMuerto, onToggleNoMuerto,
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

      <label style={{ color: "#8a9a8c", fontSize: 12, display: "block", marginBottom: 6 }}>
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

      <BuracoSelector buracos={buracos} onAdd={onAddBuraco} onRemove={onRemoveBuraco} />

      <button
        type="button"
        onClick={onToggleNoMuerto}
        style={{
          ...btn,
          width: "100%",
          marginTop: 8,
          padding: "12px 14px",
          fontSize: 14,
          textAlign: "left",
          background: noMuerto ? "rgba(248,113,113,0.15)" : "rgba(232,220,200,0.05)",
          color: noMuerto ? "#f87171" : "#888",
          border: `2px solid ${noMuerto ? "rgba(248,113,113,0.4)" : "rgba(232,220,200,0.12)"}`,
          borderRadius: 12,
        }}
      >
        {noMuerto ? "✓ " : "○ "}No robó el muerto (−300)
      </button>
    </div>
  );
}
