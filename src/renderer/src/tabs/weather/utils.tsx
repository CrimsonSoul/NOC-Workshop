import React from "react";

// Generate RainViewer URL with location centered
export const getRadarUrl = (lat: number, lon: number): string => {
  return `https://www.rainviewer.com/map.html?loc=${lat},${lon},6&theme=dark&color=1&opacity=0.7`;
};

export const getWeatherIcon = (code: number, size = 24) => {
  const strokeWidth = 2; // Standard stroke

  // Common styles
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    strokeWidth: strokeWidth,
    strokeLinecap: "round" as "round",
    strokeLinejoin: "round" as "round",
    style: { overflow: "visible" as const },
  };

  // Helper: Cloud Path (Standardized)
  // A nice fluffy cloud base
  const cloudPath =
    "M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8";

  // Clear / Sun
  if (code === 0 || code === 1) {
    return (
      <svg {...commonProps} stroke="#FDB813">
        <circle cx="12" cy="12" r="5" fill="rgba(253, 184, 19, 0.1)" />
        {/* Explicit rays for perfect symmetry without path distortion */}
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  }

  // Partly Cloudy
  if (code === 2) {
    return (
      <svg {...commonProps} stroke="currentColor">
        {/* Sun behind */}
        <g stroke="#FDB813">
          <circle cx="16" cy="8" r="4" fill="rgba(253, 184, 19, 0.1)" />
          <line x1="16" y1="1" x2="16" y2="2.5" />
          <line x1="21.5" y1="2.5" x2="20.5" y2="3.5" />
          <line x1="23" y1="8" x2="21.5" y2="8" />
        </g>
        {/* Cloud Front */}
        <path
          d={cloudPath}
          stroke="#A1A1AA"
          fill="rgba(15, 15, 18, 0.9)" // Slightly opaque to hide sun line overlap
        />
      </svg>
    );
  }

  // Overcast / Fog (Moved Fog in here for similar look)
  if (code === 3 || code === 45 || code === 48) {
    return (
      <svg {...commonProps} stroke="#A1A1AA">
        <path d={cloudPath} fill="rgba(161, 161, 170, 0.1)" />
        {/* Simple Fog / Overcast lines if needed, for now just a solid cloud is standard */}
        {code === 45 || code === 48 ? (
          <>
            <line x1="6" y1="22" x2="18" y2="22" strokeOpacity="0.5" />
            <line x1="8" y1="25" x2="16" y2="25" strokeOpacity="0.3" />
          </>
        ) : null}
      </svg>
    );
  }

  // Drizzle / Rain
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg {...commonProps} stroke="#60A5FA">
        <path d={cloudPath} stroke="#A1A1AA" fill="rgba(15, 15, 18, 0.4)" />
        <line x1="8" y1="21" x2="8" y2="24" />
        <line x1="12" y1="21" x2="12" y2="24" />
        <line x1="16" y1="21" x2="16" y2="24" />
      </svg>
    );
  }

  // Snow
  if (code >= 71 && code <= 77) {
    return (
      <svg {...commonProps} stroke="#E5E7EB">
        <path d={cloudPath} stroke="#A1A1AA" fill="rgba(15, 15, 18, 0.4)" />
        <g transform="translate(0, 2)">
          <line x1="8" y1="21" x2="8" y2="21.01" strokeWidth="3" />
          <line x1="12" y1="21" x2="12" y2="21.01" strokeWidth="3" />
          <line x1="16" y1="21" x2="16" y2="21.01" strokeWidth="3" />
        </g>
      </svg>
    );
  }

  // Thunderstorm
  if (code >= 95) {
    return (
      <svg {...commonProps} stroke="currentColor">
        <path d={cloudPath} stroke="#A1A1AA" fill="rgba(15, 15, 18, 0.4)" />
        {/* Adjusted bolt to fit in viewbox 24x24 */}
        <path
          d="M13 14L10 18H14L11 23"
          stroke="#FDE047"
          fill="rgba(253, 224, 71, 0.1)"
        />
      </svg>
    );
  }

  // Default / Cloudy Fallback
  return (
    <svg {...commonProps} stroke="#A1A1AA">
      <path d={cloudPath} />
    </svg>
  );
};

// CSS to inject into radar webview for styling
export const RADAR_INJECT_CSS = `
  .map-buttons-play {
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    padding: 6px 16px !important;
    border-radius: 30px !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    top: 8px !important;
    left: 8px !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
  }
  .forecast-period {
    color: #ffffff !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    margin-right: 4px !important;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
  }
  .map-buttons-play svg {
    fill: #ffffff !important;
    width: 20px !important;
    height: 20px !important;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)) !important;
  }
  
  /* Zoom Controls refined as glassmorphic pills */
  .map-buttons-zoom-in-out {
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    padding: 4px !important;
    border-radius: 30px !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    right: 8px !important;
    bottom: 40px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
  }
  .map-button-zoom-in, .map-button-zoom-out {
    background: transparent !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: none !important;
    padding: 0 !important;
  }
  .map-button-zoom-in svg, .map-button-zoom-out svg {
    fill: #ffffff !important;
    width: 18px !important;
    height: 18px !important;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)) !important;
  }

  #menu-bar { 
    top: auto !important;
    bottom: 8px !important; 
    left: 8px !important;
    right: auto !important;
    width: auto !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  #app-icon, .get-the-app { 
    background: rgba(0, 0, 0, 0.5) !important;
    padding: 6px 12px !important;
    border-radius: 12px !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    color: #ffffff !important;
    text-decoration: none !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
  }
  #app-icon .small-hide { 
    display: none !important; 
  }
  .map-link, .map-link.small-hide, #search-icon, .search-box, .maplibregl-ctrl-logo { 
    display: none !important; 
  }
`;

// JavaScript to inject into radar webview for positioning fixes
export const RADAR_INJECT_JS = `
  const menu = document.getElementById('menu-bar');
  if (menu) {
    menu.style.top = 'auto';
    menu.style.bottom = '8px';
    menu.style.left = '8px';
    menu.style.right = 'auto';
    menu.style.width = 'auto';
  }
  const play = document.querySelector('.map-buttons-play');
  if (play) play.style.top = '8px';
  const zoom = document.querySelector('.map-buttons-zoom-in-out');
  if (zoom) {
    zoom.style.right = '8px';
    zoom.style.bottom = '40px';
  }
  const iconWrap = document.querySelector('#app-icon .small-hide');
  if (iconWrap) iconWrap.style.display = 'none';
`;

// Alert severity color mapping
export const SEVERITY_COLORS: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  Extreme: {
    bg: "rgba(220, 38, 38, 0.15)",
    border: "rgba(220, 38, 38, 0.5)",
    text: "#FCA5A5",
    icon: "#EF4444",
  },
  Severe: {
    bg: "rgba(234, 88, 12, 0.15)",
    border: "rgba(234, 88, 12, 0.5)",
    text: "#FDBA74",
    icon: "#F97316",
  },
  Moderate: {
    bg: "rgba(234, 179, 8, 0.15)",
    border: "rgba(234, 179, 8, 0.5)",
    text: "#FDE047",
    icon: "#EAB308",
  },
  Minor: {
    bg: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.5)",
    text: "#93C5FD",
    icon: "#3B82F6",
  },
  Unknown: {
    bg: "rgba(107, 114, 128, 0.15)",
    border: "rgba(107, 114, 128, 0.5)",
    text: "#9CA3AF",
    icon: "#6B7280",
  },
};
