import React, { useMemo } from "react";
import type { WeatherData } from "./types";
import { getWeatherIcon } from "./utils";

interface HourlyForecastProps {
  weather: WeatherData | null;
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ weather }) => {
  // Filter hourly forecast to only show future hours
  const filteredHourlyForecast = useMemo(() => {
    if (!weather) return [];
    const now = new Date();
    const currentHour = now.getHours();

    return weather.hourly.time
      .map((t, i) => ({
        time: t,
        temp: weather.hourly.temperature_2m[i],
        code: weather.hourly.weathercode[i],
        precip: weather.hourly.precipitation_probability[i],
        index: i,
      }))
      .filter((item, i) => {
        const date = new Date(item.time);
        // Show current hour and future hours, up to 12 items
        return (
          date >=
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              currentHour
            ) && i < 24
        );
      })
      .slice(0, 12);
  }, [weather]);

  if (!weather) return null;

  return (
    <div
      style={{
        background: "var(--color-bg-card)",
        borderRadius: "10px",
        padding: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      <h3
        style={{
          fontSize: "12px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Hourly Forecast
      </h3>
      <div
        className="weather-scroll-container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          overflowY: "hidden",
          padding: "24px 10px",
        }}
      >
        {filteredHourlyForecast.map((item) => {
          const date = new Date(item.time);
          const now = new Date();
          const isNow =
            date.getHours() === now.getHours() &&
            date.getDate() === now.getDate();
          return (
            <div
              key={item.time}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: "8px",
                background: isNow ? "rgba(59, 130, 246, 0.15)" : "transparent",
                minWidth: "48px",
                flexShrink: 0,
                transition: "all var(--transition-smooth)",
                transformOrigin: "center center",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isNow
                  ? "rgba(59, 130, 246, 0.25)"
                  : "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.transform = "translateY(-4px) scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isNow
                  ? "rgba(59, 130, 246, 0.15)"
                  : "transparent";
                e.currentTarget.style.transform = "translateY(0) scale(1)";
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: isNow
                    ? "var(--color-accent-blue)"
                    : "var(--color-text-tertiary)",
                  marginBottom: "6px",
                  fontWeight: isNow ? 600 : 400,
                }}
              >
                {isNow
                  ? "Now"
                  : date.toLocaleTimeString([], { hour: "numeric" })}
              </span>
              <div style={{ marginBottom: "6px" }}>
                {getWeatherIcon(item.code, 18)}
              </div>
              {/* Rain Chance */}
              {item.precip > 0 ? (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#60A5FA",
                    fontWeight: 600,
                    marginBottom: "2px",
                  }}
                >
                  {item.precip}%
                </div>
              ) : (
                <div style={{ height: "15px" }} />
              )}
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {Math.round(item.temp)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
