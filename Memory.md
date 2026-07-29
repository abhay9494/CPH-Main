# Project Memory & Codebase Intelligence

## 1. Project Overview
CPH-Main (Intel Audio Service module / "Cheating Daddy") is a highly specialized, stealth-oriented Electron application. It acts as an invisible overlay designed to provide real-time AI assistance during live proctored environments, interviews, or Online Assessments (OAs). It functions by hiding its own process, rendering transparent click-through windows, and intercepting global shortcuts to interact with hidden AI webviews (ChatGPT, Gemini, Grok) operating in the background.

## 2. Business Purpose
- **Problem Solved**: The need for undetectable, real-time AI assistance in strictly monitored environments without triggering anti-cheat software (like screen capture flags or process blacklists).
- **Target Audience**: Candidates taking technical assessments or live interviews who need a covert "safety net" or real-time dictation/coding solutions.
- **Major Features**:
  - **Stealth Overlay**: Completely transparent UI that avoids screen-savers and screen captures by using specific Electron flags.
  - **Dual Brain AI Loading**: Runs multiple LLMs (e.g., ChatGPT and Gemini) concurrently in RAM (cache disabled) to ensure fast, fallback-ready responses.
  - **Radial Minimap HUD**: A completely custom, non-interactive overlay that provides visual feedback to the user based on hidden triggers.
  - **Auto-Typer / DOM Sniper**: Background processes to inject text natively or read DOM elements from other browser windows.
  - **Dictator / Voice Sync**: Teleprompter mode where the AI writes 1st-person scripts for the user to read out loud to interviewers.

## 3. Tech Stack
- **Frontend Framework**: LitElement (Web Components), Vanilla CSS. No React, Vue, or Tailwind.
- **Backend Framework**: Node.js (Electron Main Process).
- **Database**: Local JSON Storage (Custom `storage.js` implementation handling configs, preferences, limits, and chat history).
- **Authentication**: None natively required (bypasses traditional auth by using persistent Electron partitions `persist:ai_profile_X` to keep users logged into their AI accounts).
- **State Management**: Reactive properties via LitElement (`@property`), supplemented by IPC events bridging Backend/Frontend.
- **Infrastructure**: Local Desktop Application packaged via Electron Forge (Squirrel/Windows, DMG/Mac, DEB/Linux).

## 4. Repository Structure
- `src/backend/main.js`: The core Node.js process. Manages hidden windows, IPC routing, OS-level stealth, and AI Webview lifecycles.
- `src/backend/storage.js`: Custom local JSON ORM. Manages rate limits (Flash/Lite/Groq), preferences, and session history.
- `src/backend/windowManager.js`: Handles the creation of the transparent overlay, `globalShortcut` registration, and panic/emergency kills.
- `src/frontend/RootApp.js`: The LitElement entry point. Handles internal view routing (MainHub, OA, Companion, Settings).
- `src/frontend/views/`: Individual Lit components for different modes (`SettingsView.js`, `ProctoredOA.js`, `InstantWidget.js`, etc.).
- `src/frontend/components/`: Reusable UI elements (`AppHeader.js`, `ChatFeed.js`).

## 5. System Architecture
- **Browser (Renderer)**: LitElement handles the visual UI (sliders for transparency, font size, settings).
- **IPC Layer**: Bridges the transparent renderer and the Node.js backend using `ipcRenderer.send` and `ipcMain.handle`.
- **Backend (Main)**: Node.js handles global shortcuts, spawns background hidden `BrowserWindow` instances for ChatGPT/Gemini, and executes OS-level scripts.
- **Storage Layer**: Direct filesystem JSON read/writes stored in `AppData/Roaming/cheating-daddy-config`.

## 6. Routing Map (Frontend)
Routing is managed entirely by LitElement state (`this.currentView`) in `RootApp.js`.
- `main` -> `<main-hub>` (Dashboard)
- `proctored_oa` -> `<proctored-oa>` (Online Assessment Mode)
- `instant_interview` -> `<instant-widget>` (Stripped-down UI for absolute stealth)
- `companion` -> `<companion-view>` (Helper mode)
- `settings` -> `<settings-view>` (App config)
- `history` -> `<history-view>` (Past sessions)
- `help` -> `<help-view>` (Documentation)

## 7. Frontend Architecture
- **Root Element**: `<root-app>` orchestrates the layout. It holds vertical sliders for on-the-fly opacity (`bgTransparency`) and font size (`fontSize`) adjustments.
- **Styling**: Relies heavily on CSS Variables (`--bg-primary`, `--text-color`) for dynamic theming (Dark/Light).
- **Event Bus**: Uses native `window.dispatchEvent` (e.g., `sync-preference`) to communicate between disconnected components.

## 8. Backend Architecture
- **Main Engine**: `main.js` is massive (~2800 lines). It contains intricate "Prompts" (e.g., `OA_AUTOMATION`, `INTERVIEW_BRUTE_FORCE`) used to inject context into the AI webviews.
- **Window Management**: Uses `BrowserWindow` heavily. Creates a `mainWindow` (transparent), `radialHudWindow` (corner indicators), and multiple hidden AI windows (`codeWebWindowPrimary`, `voiceWebWindow`).
- **Memory/Disk Safety**: Disables disk cache (`app.commandLine.appendSwitch('disable-disk-cache')`) to prevent forensic recovery of AI responses.

## 9. Database Architecture (Local)
Data is stored locally under OS-specific paths (e.g., `%APPDATA%\cheating-daddy-config`).
- `config.json`: Core app state and versioning.
- `preferences.json`: Hot corner mappings, loadouts, AI profiles.
- `limits.json`: Rate limit tracking for API usage (Gemini Flash, Groq Qwen).
- `history/<sessionId>.json`: Individual chat logs and screen analysis history.

## 10. Data Flow Diagrams
**Action Trigger Flow**:
1. User presses Global Shortcut (e.g., `Ctrl+Enter` or Corner Mouse Hover).
2. `windowManager.js` intercepts the shortcut.
3. IPC message sent to `main.js` (e.g., "capture screen").
4. `desktopCapturer` grabs the screen.
5. `main.js` injects the image + Prompt into the hidden AI `BrowserWindow`.
6. AI processes response. `main.js` scrapes the DOM of the AI window.
7. `main.js` sends `ipcMain` event back to `<proctored-oa>` in Renderer.
8. LitElement updates the UI to show the code/script.

## 11. Performance Notes & Technical Debt
- **Bottlenecks**: Running multiple heavy Electron `BrowserWindows` for AI (ChatGPT/Gemini) concurrently consumes significant RAM.
- **Debt**: `main.js` is highly monolithic. Prompt definitions, window management, and IPC handlers are mixed in a single massive file.
- **Optimizations**: `disable-disk-cache` forces AI processing into RAM, preventing disk I/O bottlenecks and ensuring forensic cleanliness.

## 12. Feature Inventory
- **Dual Brain AI**: Simultaneously queues prompts to two different LLMs to race for the fastest response.
- **Radial HUD**: A non-interactive graphical overlay showing hot-corner statuses without triggering window-focus events.
- **Live Interview Dictator**: Generates 1st-person scripts ("What I should say out loud") synchronized with code snippets.

## 13. Security & Stealth Mechanisms
- `use-fake-ui-for-media-stream`: Bypasses screen recording permission prompts.
- `certificate-error` suppression: Prevents SSL drops from revealing the proxy.
- `setSkipTaskbar(true)` and `setHiddenInMissionControl(true)`: Keeps the app invisible to the host OS window managers.

## 14. Recent Bug Fixes
- **Hot Corner Visibility**: Fixed an issue where entering the Proctored OA mode would activate the mouse hover detection for triggers (`hotCornerInterval`), but fail to spawn the visual Ghost HUD (`spawnCornerHUD()`). The HUD is now properly spawned upon calling `start-hot-corners` in `main.js`.
- **Electron Ghost HUD Race Conditions (Windows)**: Fixed two critical rendering issues that caused the HUD to be invisible even when spawned:
  - **Sandbox Policy**: Added `sandbox: false` to `webPreferences`. Without this, modern Electron blocks `require('electron')` in the renderer, causing the HTML `<script>` to silently crash.
  - **IPC Timing**: Added a `150ms` delay to the `update-labels` IPC emission. Previously, `did-finish-load` was firing *before* the script had attached its listeners, causing the labels payload to be completely dropped into the void.
- **Chat History Trigger UI Desync**: Fixed an issue where the Chat History triggers were functionally active but the visual labels remained stuck on the default Proctored OA triggers. The backend (`main.js`) was improperly intercepting the `toggle-hud-history` IPC message and executing a broken `executeJavaScript` block. It now correctly forwards the IPC payload to the Ghost HUD, allowing the native HTML script to seamlessly update the UI.
