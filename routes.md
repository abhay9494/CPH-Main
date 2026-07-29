# Routing Intelligence Map

CPH-Main uses an internal Component-Swapping routing mechanism via LitElement, controlled by the \`currentView\` property in \`RootApp.js\`. There is no traditional URL-based routing (like React Router or Next.js) because it is a single-window desktop application.

## Frontend Routes (LitElement View Components)

| Route Name | Component File | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| \`main\` | \`views/MainHub.js\` | The primary dashboard. Allows the user to select their desired mode (OA, Interview, Companion). | No (Local) |
| \`proctored_oa\` | \`views/ProctoredOA.js\` | The Online Assessment mode UI. Displays code solutions and tools optimized for coding tests. | No (Local) |
| \`instant_interview\` | \`views/InstantWidget.js\` | A stripped-down, ultra-stealth UI that relies purely on trackpad/mouse gestures for control. | No (Local) |
| \`settings\` | \`views/SettingsView.js\` | Application configuration (Keybinds, AI Profiles, Hot Corners, UI Theme). | No (Local) |
| \`history\` | \`views/HistoryView.js\` | Browsing past sessions and AI interactions stored in the local file system. | No (Local) |
| \`help\` | \`views/HelpView.js\` | Documentation and usage instructions. | No (Local) |
| \`companion\` | \`views/Companion.js\` | A mode designed to assist someone else remotely, tracking their microphone. | No (Local) |

## Route Navigation Flow

1. User clicks a button in a component (e.g., \`MainHub.js\`).
2. Component triggers a callback: \`.onNavigate=${(dest) => this.handleHubNavigation(dest)}\`.
3. \`RootApp.js\` updates \`this.currentView = destination\`.
4. \`RootApp.js\` fires an IPC event to the backend: \`ipcRenderer.send('set-session-mode', destination)\`.
5. The backend (\`main.js\`) intercepts this and reconfigures OS-level hooks (e.g., starting hot-corners, hiding the radial HUD, altering mouse click-through behavior).
6. LitElement reactively re-renders the DOM to mount the new component.

## Edge Case: Force Routing via IPC
The application can be forcefully routed by the Backend (e.g., if a global shortcut demands an immediate UI change).
- Trigger: \`window.require('electron').ipcRenderer.on('force-route', (_, route) => { ... })\`
- Result: Instantly swaps the view regardless of the user's current state.
