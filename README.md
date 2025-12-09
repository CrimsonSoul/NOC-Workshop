# Relay

Relay is a desktop application that pairs a Vite-powered UI with an Electron shell to help operators manage and bridge contact data with high precision. It serves as a focused environment for composing contact lists from local data sources and bridging them to external communication tools like Microsoft Teams.

## Purpose

The application acts as a "Relay" between local CSV-based data silos and modern collaboration platforms. It emphasizes:
- **Data Composition**: Quickly assembling ad-hoc lists of contacts from various groups.
- **Bridging**: Seamlessly transferring these composed lists into actionable contexts (e.g., Teams meetings).
- **Data Management**: Providing a clean, fast interface for managing contact directories and group memberships without the overhead of heavy CRM systems.

## Design Philosophy: Matte Dark

The user interface follows a 'Matte Dark' aesthetic, utilizing a deep charcoal palette (#141414) with subtle, pastel-colored accents for categorization. The design emphasizes high contrast, purposeful motion, and tactile interactions to create a professional and focused data composition environment.

- **Visuals**: Dark, opaque surfaces to prevent visual bleeding; crisp typography (Inter, JetBrains Mono) for readability.
- **Interactions**: Controls favor tactile cues (outlined buttons, toggles) and subtle scale/fade animations to provide feedback without distraction.
- **Layout**: Prioritizes hierarchy and legibility for fast scanning, designed for a vertical slice of a 1080p screen.

## Getting started (Electron + Vite)

1. **Install dependencies**: `npm install`
2. **Start the development shell**: `npm run dev` (launches Vite with Electron)
3. **Build a distributable**: `npm run build` (bundles Vite assets and packages Electron)

## Structure

- `src/main`: Electron main process (window creation, IPC, file management).
- `src/preload`: Context bridge exposing typed IPC helpers to the renderer.
- `src/renderer`: React renderer powered by Vite with tabs for Composition, Directory, and Reports.
- `src/shared`: Shared IPC contracts used across processes.

## Architecture Highlights

- **Local-First Data**: Operates directly on CSV/JSON files in a user-defined data folder.
- **IPC Bridge**: Keeps renderer and main process isolated; only vetted commands cross the boundary.
- **Hot-Reloading**: The application watches for file changes and updates the UI in real-time.
- **Security**: Strict Context Security Policy (CSP) and sandboxed renderer processes.

## Testing Strategy

- **Unit Tests**: `npm run test:unit` runs Vitest for logic and component testing.
- **E2E Tests**: `npm test` runs Playwright to verify end-to-end flows against the built renderer.

For deeper implementation guidance, review `docs/architecture.md` or `DESIGN_HANDOFF.md`.
