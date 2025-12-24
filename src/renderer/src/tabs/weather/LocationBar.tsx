import React from "react";
import { TactileButton } from "../../components/TactileButton";
import { Input } from "../../components/Input";
import type { WeatherData, Location } from "./types";
import { getWeatherIcon } from "./utils";

interface LocationBarProps {
  location: Location | null;
  weather: WeatherData | null;
  manualInput: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
}

export const LocationBar: React.FC<LocationBarProps> = ({
  location,
  weather,
  manualInput,
  onInputChange,
  onSearch,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {location?.name || "Weather"}
        </h2>
        {weather && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            {getWeatherIcon(weather.current_weather.weathercode, 36)}
            <span
              style={{ fontSize: "32px", fontWeight: 600, color: "#FDB813" }}
            >
              {Math.round(weather.current_weather.temperature)}°F
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Input
          value={manualInput}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Search city..."
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          style={{ width: "180px" }}
        />
        <TactileButton onClick={onSearch}>SEARCH</TactileButton>
      </div>
    </div>
  );
};
