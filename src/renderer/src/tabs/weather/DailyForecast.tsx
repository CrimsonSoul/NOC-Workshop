import React from "react";
import type { WeatherData } from "./types";
import { getWeatherIcon } from "./utils";

interface DailyForecastProps {
  weather: WeatherData | null;
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ weather }) => {
  if (!weather) return null;

  return (
    <div
      style={{
        background: "var(--color-bg-card)",
        borderRadius: "10px",
        padding: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          flexShrink: 0,
        }}
      >
        16-Day Forecast
      </h3>
      <div
        className="weather-scroll-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "10px 20px",
        }}
      >
        {weather.daily.time.map((t, i) => {
          const date = new Date(t);
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                borderRadius: "6px",
                background: isToday ? "rgba(59, 130, 246, 0.1)" : "transparent",
                transition: "all var(--transition-base)",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isToday
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(255, 255, 255, 0.03)";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isToday
                  ? "rgba(59, 130, 246, 0.1)"
                  : "transparent";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <span
                style={{
                  width: "44px",
                  fontWeight: isToday ? 600 : 500,
                  fontSize: "14px",
                  color: isToday
                    ? "var(--color-accent-blue)"
                    : "var(--color-text-primary)",
                }}
              >
                {isToday
                  ? "Today"
                  : date.toLocaleDateString([], { weekday: "short" })}
              </span>
              <div
                style={{
                  width: "32px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {getWeatherIcon(weather.daily.weathercode[i], 20)}
              </div>
              {/* Wind and Precip */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginLeft: "12px",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                {weather.daily.wind_speed_10m_max[i] > 8 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      color: "var(--color-text-tertiary)",
                      background: "rgba(255,255,255,0.03)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span style={{ fontSize: "11px", fontWeight: 500 }}>
                      {Math.round(weather.daily.wind_speed_10m_max[i])}
                    </span>
                  </div>
                )}
                {weather.daily.precipitation_probability_max[i] > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      color: "#60A5FA",
                      background: "rgba(96, 165, 250, 0.08)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 600 }}>
                      {weather.daily.precipitation_probability_max[i]}%
                    </span>
                  </div>
                )}
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "15px",
                    minWidth: "32px",
                    textAlign: "right",
                  }}
                >
                  {Math.round(weather.daily.temperature_2m_max[i])}°
                </span>
                <span
                  style={{
                    color: "var(--color-text-tertiary)",
                    fontSize: "15px",
                    minWidth: "32px",
                    textAlign: "right",
                  }}
                >
                  {Math.round(weather.daily.temperature_2m_min[i])}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
