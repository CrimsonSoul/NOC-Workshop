import React from "react";
import type { WeatherAlert } from "./types";
import { SEVERITY_COLORS } from "./utils";

interface WeatherAlertCardProps {
  alert: WeatherAlert;
  isExpanded: boolean;
  onToggle: () => void;
}

export const WeatherAlertCard: React.FC<WeatherAlertCardProps> = ({
  alert,
  isExpanded,
  onToggle,
}) => {
  const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS["Unknown"];

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "10px 14px",
        cursor: "pointer",
        transition: "all var(--transition-smooth)",
        transformOrigin: "center center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px) scale(1.01)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {/* Alert Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.icon}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: "2px" }}
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "18px",
                color: colors.text,
                letterSpacing: "-0.01em",
              }}
            >
              {alert.event}
            </span>
            <span
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.3)",
                color: colors.text,
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              {alert.severity}
            </span>
            {alert.urgency === "Immediate" && (
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "rgba(220, 38, 38, 0.4)",
                  color: "#FFF",
                  textTransform: "uppercase",
                  fontWeight: 800,
                }}
              >
                🚨 Immediate
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "16px",
              color: "var(--color-text-primary)",
              opacity: 0.9,
              margin: "6px 0 0",
              lineHeight: "1.4",
              fontWeight: 500,
            }}
          >
            {alert.headline}
          </p>
          {isExpanded && (
            <div
              className="weather-scroll-container"
              style={{
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-text-tertiary)",
                  margin: "0 0 8px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
              >
                {alert.description}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  fontSize: "12px",
                  color: "var(--color-text-quaternary)",
                }}
              >
                <span>Expires: {new Date(alert.expires).toLocaleString()}</span>
                <span>{alert.senderName}</span>
              </div>
            </div>
          )}
        </div>
        {/* Expand/Collapse Arrow */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-smooth)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
};
