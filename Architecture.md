# System Architecture Map

## High-Level Architecture Diagram
\`\`\`text
[Host Operating System (Windows/Mac/Linux)]
       |
       |-- (Global Keyboard Shortcuts / Mouse Hooks)
       v
[Electron Main Process (Node.js) - src/backend/main.js]
       |
       |-- IPC Channels (Events & Invocations)
       |
       +---> [Electron Renderer (LitElement) - src/frontend/RootApp.js]
       |          |-- <main-hub>
       |          |-- <proctored-oa>
       |          +-- Transparent Overlay UI
       |
       +---> [Hidden AI Webviews (BrowserWindow)]
       |          |-- ChatGPT Session (RAM Only)
       |          |-- Gemini Session (RAM Only)
       |          +-- Grok Session (RAM Only)
       |
       +---> [Local Storage Engine - src/backend/storage.js]
                  |-- config.json
                  |-- preferences.json
                  +-- history/ (Chat Logs)
\`\`\`

## Component Breakdown

### 1. The Stealth Renderer (Frontend)
The visible part of the application is a borderless, transparent, click-through Electron window. 
- **Responsibility**: Display text, code, and UI elements to the user without interrupting their interaction with underlying applications (like IDEs or Browsers).
- **Technology**: Web Components (LitElement) handling reactive state rendering.

### 2. The Main Controller (Backend)
The `main.js` file acts as the central nervous system.
- **Responsibility**: 
  - Manage the lifecycle of the stealth windows.
  - Intercept native OS events (hotkeys via `globalShortcut`).
  - Screen capture (`desktopCapturer`).
  - Execute Auto-Typer / DOM Scraper scripts via child processes.
- **Security**: Runs with nodeIntegration enabled but sandboxed from external web content.

### 3. The Dual Brain AI Engine
Rather than relying solely on API calls (which can be rate-limited or expensive), the application spins up hidden Chromium instances logged into ChatGPT/Gemini/Grok web interfaces.
- **Responsibility**: Inject prompts directly into the DOM of the web interfaces, click "Send", and scrape the resulting DOM for the AI's response.
- **Advantage**: Bypasses API costs, uses persistent login sessions via isolated Electron partitions (`persist:ai_profile_X`), and operates entirely in memory (`disable-disk-cache`).

### 4. The Local ORM (storage.js)
A custom file-system-based database.
- **Responsibility**: Track rate limits for fallback API models (e.g., Gemini Flash), store hot-corner configurations, and save chat session histories locally in the OS's `AppData`/`Roaming` folder.
