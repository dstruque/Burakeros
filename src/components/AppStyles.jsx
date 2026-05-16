import { FONT_LINK } from "../utils/constants";

export default function AppStyles() {
  return (
    <>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        @keyframes faceSwing {
          0% { transform: translateX(-6px) rotate(-2deg); }
          50% { transform: translateX(6px) rotate(2deg); }
          100% { transform: translateX(-6px) rotate(-2deg); }
        }
        @keyframes winnerPop {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        button:active { transform: scale(0.98); }
      `}</style>
    </>
  );
}
