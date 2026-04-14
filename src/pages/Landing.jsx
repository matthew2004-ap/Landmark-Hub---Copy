// Landing page with modern UI
const { THEME } = window.__LANDMARK__;
const { Button } = window.__LANDMARK_COMPONENTS__;

function Landing({ onSelect }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.darkGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background rings */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: `1px solid rgba(245,158,11,0.06)`,
            width: 200 + i * 180,
            height: 200 + i * 180,
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            animation: `pulse ${2 + i}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          maxWidth: 600,
          animation: "slideUp 0.8s ease both",
        }}
      >
        {/* Brand Logo */}
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: `linear-gradient(135deg,${THEME.primary},#D97706)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: `0 8px 30px ${THEME.primary}66`,
            }}
          >
            🍛
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: 6,
            color: THEME.primary + "99",
            fontFamily: "monospace",
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Landmark University · Omu-Aran
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: "clamp(40px,8vw,72px)",
            fontWeight: 900,
            color: "#FEFCE8",
            lineHeight: 1.1,
            marginBottom: 14,
            textShadow: "0 4px 40px rgba(0,0,0,0.6)",
          }}
        >
          Campus
          <br />
          <span style={{ color: THEME.primary, fontStyle: "italic" }}>Chop</span> Hub
        </h1>

        {/* Subtitle Text */}
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 15,
            marginBottom: 48,
            lineHeight: 1.7,
            maxWidth: 500,
            margin: "0 auto 48px",
          }}
        >
          Order from your hostel. Skip the queue.
          <br />
          <span style={{ opacity: 0.7 }}>4 cafeterias · Real-time tracking · AI-powered</span>
        </p>

        {/* Role Selection Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            marginBottom: 40,
            maxWidth: 500,
            margin: "0 auto 40px",
          }}
        >
          {[
            {
              role: "student",
              icon: "🎓",
              label: "Student",
              desc: "Order food",
              bg: THEME.primary,
              fg: "#0A2E1C",
            },
            {
              role: "vendor",
              icon: "🍽️",
              label: "Vendor",
              desc: "Manage menu",
              bg: "transparent",
              fg: THEME.primary,
              border: `2px solid ${THEME.primary}55`,
            },
            {
              role: "admin",
              icon: "🛡️",
              label: "Admin",
              desc: "Oversee platform",
              bg: "transparent",
              fg: THEME.secondary,
              border: `2px solid ${THEME.secondary}55`,
            },
          ].map((btn) => (
            <button
              key={btn.role}
              onClick={() => onSelect(btn.role)}
              style={{
                background: btn.bg,
                color: btn.fg,
                border: btn.border || "none",
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "center",
                transition: "all 0.25s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  btn.role === "student" ? `0 8px 30px ${THEME.primary}55` : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  btn.role === "student" ? `0 8px 30px ${THEME.primary}55` : "none";
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{btn.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {btn.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.6,
                  lineHeight: 1.4,
                }}
              >
                {btn.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            maxWidth: 600,
          }}
        >
          {[
            "🎯 4 Locations",
            "🚚 Fast Delivery",
            "📍 Live Tracking",
            "🤖 AI Recommendations",
            "⭐ Community Ratings",
          ].map((feature, i) => (
            <span key={i} style={{ opacity: 0.7 }}>
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Landing;
