import { BURACO_TYPES } from "../utils/constants";
import { btn } from "../utils/styles";

export default function BuracoSelector({ buracos, onAdd, onRemove }) {
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {BURACO_TYPES.map((bt) => (
          <button
            key={bt.key}
            type="button"
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
            <span style={{ fontSize: 12, opacity: 0.8 }}>{bt.pts} pts</span>
          </button>
        ))}
      </div>

      {buracos.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {buracos.map((b, i) => {
            const bt = BURACO_TYPES.find((t) => t.key === b);
            return (
              <button
                key={`${b}-${i}`}
                type="button"
                onClick={() => onRemove(i)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: bt.color + "33",
                  color: bt.color,
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                  border: "none",
                }}
              >
                {bt.label} ✕
              </button>
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
          ⚠ Sin buraco puede quedar negativo
        </div>
      )}
    </div>
  );
}
