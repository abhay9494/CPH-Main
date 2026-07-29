# Dependency Graph & Core Files

## Dependency Analysis
The codebase minimizes external NPM dependencies to keep the application lightweight and stealthy, heavily relying on Electron's native APIs and custom logic.

### Core NPM Dependencies (`package.json`)
- `electron` (v30+): The core engine for the backend and Chromium renderer.
- `puppeteer`: Used for advanced headless browser automation (likely DOM Sniper).
- `tesseract.js`: Local Optical Character Recognition (OCR) for screen scraping without network calls.
- `@google/genai`: Fallback API integration for Gemini models.
- `electron-forge`: Build and packaging pipeline.

### Internal File Dependency Graph

\`\`\`text
src/backend/main.js (CRITICAL CORE)
  ├── electron (app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut)
  ├── src/backend/windowManager.js (Creates the transparent overlay)
  ├── src/backend/storage.js (Reads/Writes to %APPDATA%)
  └── src/backend/ipc/instant_interview_ctrl.js (Lightweight controller)

src/frontend/RootApp.js (FRONTEND CORE)
  ├── lit-core-2.7.4.min.js (Bundled Web Components framework)
  ├── src/frontend/components/AppHeader.js (Navigation/Controls)
  ├── src/frontend/views/MainHub.js (Entry Dashboard)
  ├── src/frontend/views/ProctoredOA.js (Code display logic)
  ├── src/frontend/views/SettingsView.js (Config UI)
  └── src/frontend/views/InstantWidget.js (Stealth UI)

src/backend/storage.js (DATA CORE)
  ├── fs (Native File System)
  ├── path (Native Path Resolution)
  └── os (Native OS info for locating AppData)
\`\`\`

## High Impact & Critical Files (Do Not Modify Lightly)

1. **`src/backend/main.js`**:
   - **Impact**: EXTREME. This file contains the foundational `app.on('ready')` logic, the `PROMPTS` dictionary, and the hidden AI `BrowserWindow` orchestration. Breaking this file breaks the entire stealth capability and AI interaction pipeline.
   - **Risk**: High risk of race conditions if async IPC handlers are modified improperly.

2. **`src/backend/windowManager.js`**:
   - **Impact**: HIGH. Defines the properties of the transparent window (`transparent: true, hasShadow: false`). Removing or altering specific Electron flags here will cause the app to show up on screen recordings or lose its click-through nature.

3. **`src/frontend/RootApp.js`**:
   - **Impact**: HIGH. Controls the entire visual state machine. Modifying the LitElement render cycle or `connectedCallback` IPC listeners will sever the communication between the UI and the Backend.

4. **`src/backend/storage.js`**:
   - **Impact**: MODERATE. Changes to the JSON schema must be handled carefully to avoid corrupting existing user configurations, requiring migration logic if keys are renamed.
