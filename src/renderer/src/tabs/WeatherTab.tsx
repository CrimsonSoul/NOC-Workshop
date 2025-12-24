import React, { useState, useEffect, useCallback } from "react";
import { TabFallback } from "../components/TabFallback";
import {
  WeatherAlertCard,
  HourlyForecast,
  DailyForecast,
  RadarPanel,
  LocationBar,
  type WeatherTabProps,
  type Location,
} from "./weather";

export const WeatherTab: React.FC<WeatherTabProps> = ({
  weather,
  alerts,
  location,
  loading,
  onLocationChange,
  onManualRefresh,
}) => {
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const autoLocateAttemptedRef = React.useRef(false);

  // Reverse geocode coordinates to get location name
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const data = await window.api.searchLocation(`${lat},${lon}`);
      if (data.results && data.results.length > 0) {
        const { name, admin1, country_code } = data.results[0];
        return `${name}, ${admin1 || ""} ${country_code}`.trim();
      }
    } catch {
      // Fallback
    }
    return "Current Location";
  };

  const handleAutoLocate = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);

    const tryIPLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();

        if (data.latitude && data.longitude) {
          const newLoc: Location = {
            latitude: data.latitude,
            longitude: data.longitude,
            name: `${data.city}, ${data.region_code} ${data.country_code}`,
          };
          onLocationChange(newLoc);
          localStorage.setItem("weather_location", JSON.stringify(newLoc));
          onManualRefresh(data.latitude, data.longitude);
          return true;
        }
      } catch (e) {
        console.error("[Weather] IP Location fallback failed:", e);
      }
      return false;
    };

    if (!("geolocation" in navigator)) {
      await tryIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const name = await reverseGeocode(latitude, longitude);
        const newLoc: Location = { latitude, longitude, name };
        onLocationChange(newLoc);
        localStorage.setItem("weather_location", JSON.stringify(newLoc));
        onManualRefresh(latitude, longitude);
      },
      async (err) => {
        console.error("[Weather] Geolocation failed:", err.message);

        const ipSuccess = await tryIPLocation();

        if (!ipSuccess) {
          if (err.code === 1) {
            // PERMISSION_DENIED
            setPermissionDenied(true);
            setError(
              "Location access was denied and fallback failed. Please search for your city manualy."
            );
          } else {
            setError(
              "Could not detect location automatically. Please search for your city manualy."
            );
          }
        }
      },
      {
        timeout: 5000,
        maximumAge: 300000,
        enableHighAccuracy: false,
      }
    );
  }, [onLocationChange, onManualRefresh]);

  // Auto-locate on mount if no location
  useEffect(() => {
    if (!location && !loading && !autoLocateAttemptedRef.current) {
      autoLocateAttemptedRef.current = true;
      handleAutoLocate();
    }
  }, [location, loading, handleAutoLocate]);

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setError(null);
    try {
      const data = await window.api.searchLocation(manualInput);
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, admin1, country_code } =
          data.results[0];
        const label = `${name}, ${admin1 || ""} ${country_code}`.trim();
        const newLoc: Location = { latitude, longitude, name: label };
        onLocationChange(newLoc);
        localStorage.setItem("weather_location", JSON.stringify(newLoc));
        onManualRefresh(latitude, longitude);
        setManualInput("");
      } else {
        setError("Location not found. Try a different search term.");
      }
    } catch (err: any) {
      setError(err.message || "Search failed");
    }
  };

  if (!location && loading) return <TabFallback />;

  return (
    <div
      className="weather-scroll-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--color-bg-app)",
        padding: "20px 24px",
        gap: "16px",
        overflow: "hidden",
      }}
    >
      {/* Top Bar: Location & Controls */}
      <LocationBar
        location={location}
        weather={weather}
        manualInput={manualInput}
        onInputChange={setManualInput}
        onSearch={handleManualSearch}
      />

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#EF4444",
            borderRadius: "8px",
            fontSize: "13px",
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div
          className="weather-scroll-container"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
            maxHeight: expandedAlert ? "300px" : "150px",
            overflowY: "auto",
          }}
        >
          {alerts.map((alert) => (
            <WeatherAlertCard
              key={alert.id}
              alert={alert}
              isExpanded={expandedAlert === alert.id}
              onToggle={() =>
                setExpandedAlert(expandedAlert === alert.id ? null : alert.id)
              }
            />
          ))}
        </div>
      )}

      {/* Main Content - Responsive Grid */}
      <div
        className="weather-tab-root weather-scroll-container"
        style={{
          display: "flex",
          gap: "16px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left: Forecast */}
        <div
          className="weather-forecast-column weather-scroll-container"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: "0 0 35%",
            minWidth: "300px",
            overflowY: "auto",
          }}
        >
          <HourlyForecast weather={weather} />
          <DailyForecast weather={weather} />
        </div>

        {/* Right: Radar */}
        <RadarPanel location={location} />
      </div>
    </div>
  );
};
