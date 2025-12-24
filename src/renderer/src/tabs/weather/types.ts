import type { WeatherAlert } from "@shared/ipc";

export interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max: number[];
    precipitation_probability_max: number[];
  };
}

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface WeatherTabProps {
  weather: WeatherData | null;
  alerts: WeatherAlert[];
  location: Location | null;
  loading: boolean;
  onLocationChange: (loc: Location) => void;
  onManualRefresh: (lat: number, lon: number) => void;
}

// Re-export for convenience
export type { WeatherAlert };
