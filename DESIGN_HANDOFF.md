# Design Handoff: Data Persistence & Management

## Context
This document describes the implementation of **Data Persistence** features in Relay. The goal was to allow users to manage contacts and groups directly within the application (add/edit) and configure where data is stored (change data folder).

This work is **functionally complete**. The next phase involves verification, polish, or moving to the next feature (potentially `BrainTab`).

## Architecture

### 1. Data Source
- **Format:** CSV (`contacts.csv`, `groups.csv`) and JSON (`history.json`).
- **Location:**
  - **Default:** `AppData/Roaming/Relay/data` (Windows/Linux) or `Library/Application Support/Relay/data` (macOS).
  - **Config:** Stored in `config.json` in the user data directory.
  - **Hot-Swapping:** Changing the folder immediately updates the app state without a restart.

### 2. Main Process (`src/main`)
- **`FileManager.ts`**: The core logic class.
  - **Read:** Uses `csv-parse` to read CSVs.
  - **Write:** Uses `csv-stringify` to append or modify CSVs.
  - **Watch:** Uses `chokidar` to watch file changes and emit `IPC_CHANNELS.DATA_UPDATED` to the renderer.
  - **Logic:**
    - `addContact(contact)`: Appends a new row to `contacts.csv`. Handles dynamic headers (adds columns if missing).
    - `addGroup(name)`: Adds a new column to `groups.csv`.
    - `updateGroupMembership(group, email, remove)`: Modifies the specific cell in `groups.csv`.
    - `import...`: Merges external CSVs into the existing data.
- **`index.ts`**:
  - Exposes IPC handlers (`ADD_CONTACT`, `ADD_GROUP`, `CHANGE_DATA_FOLDER`, etc.).
  - Handles the `CHANGE_DATA_FOLDER` workflow:
    1.  User selects folder.
    2.  `handleDataPathChange` copies missing essential files to the new location.
    3.  Updates `config.json`.
    4.  Destroys old `FileManager` and creates a new one.

### 3. Renderer Process (`src/renderer`)
- **`App.tsx`**:
  - Manages global data state (`groups`, `contacts`).
  - Contains the **Settings** logic (inline modal) to trigger `changeDataFolder`.
- **`DirectoryTab.tsx` (People)**:
  - **Add Contact:** "Add Contact" button opens `AddContactModal`. Calls `window.api.addContact`.
  - **Group Membership:** `ContactRow` has a group icon button. Opens `GroupSelector` popover to toggle membership. Calls `addContactToGroup` / `removeContactFromGroup`.
- **`AssemblerTab.tsx` (Compose)**:
  - **Add Group:** "+" button in the Groups section opens a modal. Calls `window.api.addGroup`.
  - **Quick Add:** Typing a new email in "Quick Add" prompts to create a contact via `AddContactModal`.

## Current State

### ✅ Completed
- **Change Data Folder:** Fully implemented. Users can switch folders, and data hot-reloads.
- **Add Contact:** UI and Backend connected. Can add name, email, phone, title.
- **Add Group:** UI and Backend connected. Creates new group columns.
- **Edit Group Membership:** UI and Backend connected. Can toggle users in/out of groups.
- **Import:** "Import Contacts/Groups" merges external CSVs.

### 🚧 To Do / Next Steps
1.  **Verification:**
    - Test adding a group with special characters.
    - Test changing data folder to a read-only directory (error handling).
    - Test importing a malformed CSV.
2.  **UI Polish:**
    - The `GroupSelector` in `DirectoryTab` could use better positioning logic (currently simple absolute).
    - Error states in the UI are minimal (console logs mainly).
3.  **BrainTab:**
    - The file `src/renderer/src/tabs/BrainTab.tsx` exists but is **unused**. This is likely the next major feature area.

## Key Files
- `src/main/FileManager.ts`: Core persistence logic.
- `src/renderer/src/tabs/DirectoryTab.tsx`: Contact management UI.
- `src/renderer/src/tabs/AssemblerTab.tsx`: Group management UI.
- `src/renderer/src/components/AddContactModal.tsx`: Reusable modal for creating contacts.

## API Reference (IPC)
See `src/shared/ipc.ts` (implied) or `src/preload/index.mjs` for the bridge definitions.
- `addContact(contact: Partial<Contact>): Promise<boolean>`
- `addGroup(name: string): Promise<boolean>`
- `changeDataFolder(): Promise<boolean>`
