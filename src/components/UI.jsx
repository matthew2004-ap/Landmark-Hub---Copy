// Reusable UI Components
const { useState } = React;
const { THEME } = window.__LANDMARK__;

// Stars rating component
export function Stars({ value = 5, onChange, size = 18 }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          style={{
            fontSize: size,
            cursor: onChange ? "pointer" : "default",
            color: star <= value ? THEME.primary : "#374151",
            transition: "color 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => onChange && (e.target.style.transform = "scale(1.2)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// Badge/Chip component
export function Chip({ label, color = THEME.success }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        background: color + "22",
        color: color,
        border: `1px solid ${color}55`,
        borderRadius: 20,
        padding: "4px 10px",
        letterSpacing: 0.4,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

// Status chip specialized
export function StatusChip({ status }) {
  const statusColors = {
    Preparing: THEME.warning,
    "On the Way": THEME.secondary,
    Delivered: THEME.success,
    Pending: THEME.warning,
    "In Review": THEME.secondary,
    Resolved: THEME.success,
  };
  return <Chip label={status} color={statusColors[status] || "#6B7280"} />;
}

// Loading spinner
export function Spinner() {
  return (
    <div
      style={{
        display: "inline-block",
        width: 20,
        height: 20,
        border: "3px solid rgba(255,255,255,0.2)",
        borderTopColor: THEME.primary,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// Animated pulse dot
export function Pulse({ color = THEME.primary }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        animation: "pulse 1.5s ease-in-out infinite",
        marginRight: 8,
      }}
    />
  );
}

// Modern Button Component
export function Button({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md", 
  disabled = false,
  loading = false,
  fullWidth = false,
  ...props 
}) {
  const variants = {
    primary: {
      bg: THEME.primary,
      fg: "#0A2E1C",
      hover: "rgba(245, 158, 11, 0.9)",
    },
    secondary: {
      bg: "transparent",
      fg: THEME.primary,
      border: `2px solid ${THEME.primary}44`,
      hover: THEME.primary + "11",
    },
    danger: {
      bg: THEME.warning,
      fg: "white",
      hover: "rgba(239, 68, 68, 0.9)",
    },
    ghost: {
      bg: "transparent",
      fg: "white",
      hover: "rgba(255,255,255,0.1)",
    },
  };

  const sizes = {
    sm: { padding: "8px 14px", fontSize: 13 },
    md: { padding: "12px 20px", fontSize: 14 },
    lg: { padding: "16px 28px", fontSize: 16 },
  };

  const style = variants[variant];
  const size_style = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: style.bg,
        color: style.fg,
        border: style.border || "none",
        borderRadius: 10,
        padding: size_style.padding,
        fontSize: size_style.fontSize,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all 0.25s",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// Card Component
export function Card({ children, padding = 20, className = "", ...props }) {
  return (
    <div
      className={`card-hover ${className}`}
      style={{
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding,
        backdropFilter: "blur(10px)",
        ...props.style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Input Component
export function Input({ 
  label, 
  error, 
  icon = null,
  fullWidth = true,
  ...props 
}) {
  return (
    <div style={{ width: fullWidth ? "100%" : "auto" }}>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 600,
            fontSize: 13,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span
            style={{
              position: "absolute",
              left: 12,
              fontSize: 18,
              pointerEvents: "none",
            }}
          >
            {icon}
          </span>
        )}
        <input
          style={{
            width: "100%",
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${THEME.border}`,
            borderRadius: 8,
            padding: icon ? "12px 12px 12px 40px" : "12px 14px",
            color: "white",
            fontSize: 14,
            transition: "all 0.2s",
            paddingLeft: icon ? 40 : 14,
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: 12, color: THEME.warning, marginTop: 4, display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// Select/Dropdown Component
export function Select({ label, options, value, onChange, ...props }) {
  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 600,
            fontSize: 13,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: "100%",
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${THEME.border}`,
          borderRadius: 8,
          padding: "12px 14px",
          color: "white",
          fontSize: 14,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default {
  Stars,
  Chip,
  StatusChip,
  Spinner,
  Pulse,
  Button,
  Card,
  Input,
  Select,
};
