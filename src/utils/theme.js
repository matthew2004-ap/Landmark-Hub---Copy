// Theme and global styles
export const THEME = {
  primary: "#F59E0B",
  secondary: "#38BDF8",
  success: "#16A34A",
  warning: "#EF4444",
  dark: "#0A2E1C",
  darkGradient: "linear-gradient(160deg,#041A0D 0%,#0A2E1C 55%,#061A10 100%)",
  card: "#1F3A2F",
  border: "rgba(255,255,255,0.1)",
};

export const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    background: ${THEME.dark};
    color: white;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 40px rgba(245,158,11,0.6); } }
  
  .anim { animation: fadeIn 0.4s ease both; }
  .slide-anim { animation: slideUp 0.5s ease both; }
  
  .card-hover {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3) !important;
  }
  
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: ${THEME.primary} !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1) !important;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;
