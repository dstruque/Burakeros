import { btn } from "../utils/styles";

export default function EndTypeSelector({ pair1Name, pair2Name, endType, onChange, team1NoMuerto, team2NoMuerto }) {
  const options = [
    { key: "team1_closed", label: `${pair1Name} cerró`, detail: team1NoMuerto ? "No puede cerrar si no robó el muerto" : "+200", color: "#4ade80", disabled: team1NoMuerto },
    { key: "team2_closed", label: `${pair2Name} cerró`, detail: team2NoMuerto ? "No puede cerrar si no robó el muerto" : "+200", color: "#4ade80", disabled: team2NoMuerto },
    { key: "team1_joker", label: `${pair1Name} botó comodín`, detail: "Ese equipo va negativo", color: "#f87171", disabled: false },
    { key: "team2_joker", label: `${pair2Name} botó comodín`, detail: "Ese equipo va negativo", color: "#f87171", disabled: false },
    { key: "cards_out", label: "Se acabaron las cartas", detail: "Sin buraco va negativo", color: "#94a3b8", disabled: false },
  ];

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
      <p
        style={{
          color: "#c4b89a",
          fontSize: 13,
          fontWeight: 700,
          margin: "0 0 10px",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        ¿Cómo terminó la sub-ronda?
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {options.map((option) => {
          const selected = endType === option.key;
          return (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onClick={() => { if (!option.disabled) onChange(option.key); }}
              style={{
                ...btn,
                width: "100%",
                padding: "12px 14px",
                textAlign: "left",
                borderRadius: 12,
                background: selected ? option.color + "22" : "rgba(232,220,200,0.04)",
                color: option.disabled ? "#666" : selected ? option.color : "#c4b89a",
                border: `2px solid ${option.disabled ? "rgba(232,220,200,0.06)" : selected ? option.color + "88" : "rgba(232,220,200,0.1)"}`,
                opacity: option.disabled ? 0.55 : 1,
                cursor: option.disabled ? "not-allowed" : "pointer",
              }}
            >
              <div style={{ fontSize: 14 }}>
                {selected ? "✓ " : option.disabled ? "⛔ " : "○ "}{option.label}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {option.detail}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
