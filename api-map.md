# API & IPC Inventory

Since this is an Electron application, "APIs" primarily refer to Inter-Process Communication (IPC) channels between the Node.js backend (Main) and the LitElement frontend (Renderer).

## Frontend to Backend (Action Requests)

| Channel Name | Method Type | Purpose | Triggered By |
| :--- | :--- | :--- | :--- |
| \`set-session-mode\` | \`.send()\` | Alerts backend that the UI mode changed (e.g., to OA or Interview) so it can adjust global shortcuts. | \`RootApp.js\` |
| \`stop-hot-corners\` | \`.send()\` | Disables mouse tracking for screen edges. | \`RootApp.js\` |
| \`start-hot-corners\` | \`.send(bounds)\` | Enables edge-of-screen hover detection for stealth triggers. | \`RootApp.js\` |
| \`toggle-radial-permanent\` | \`.send(bool)\` | Shows or hides the circular HUD overlay. | \`RootApp.js\` |
| \`set-ignore-mouse-events\` | \`.send(bool)\` | Toggles whether the transparent window intercepts clicks or lets them pass through to the OS. | \`RootApp.js\` |
| \`view-changed\` | \`.send(name)\` | Syncs the current visual view name with the backend state. | \`RootApp.js\` |
| \`trigger-ghost-hide\` | \`.invoke()\` | Commands the backend to completely hide the application process from the screen. | \`AppHeader.js\` |
| \`set-ai-provider\` | \`.invoke(id)\` | Switches the active AI engine (ChatGPT, Gemini, Grok) in the hidden webview. | \`RootApp.js\` |
| \`rebuild-radial-hud\` | \`.send()\` | Forces the backend to redraw the HUD when opacity/settings change. | \`RootApp.js\` |
| \`launch-instant-interview\`| \`.send()\` | Spawns the ultra-lightweight background AI instances. | \`RootApp.js\` |

## Backend to Frontend (Event Pushes)

| Channel Name | Purpose | Handled By |
| :--- | :--- | :--- |
| \`force-route\` | Commands the UI to instantly jump to a specific view (e.g., 'instant_widget'). | \`RootApp.js\` |
| \`execute-widget-action\` | Commands the frontend to perform an action (like 'capture' screen) based on a global shortcut press. | \`ProctoredOA.js\` / \`InstantWidget.js\` |
| \`navigate-previous-response\`| Scrolls the chat feed backward based on a hotkey. | Global Window Listeners |
| \`navigate-next-response\`| Scrolls the chat feed forward based on a hotkey. | Global Window Listeners |
| \`scroll-response-up\` | UI auto-scroll command. | Global Window Listeners |
| \`scroll-response-down\` | UI auto-scroll command. | Global Window Listeners |
| \`update-labels\` | Updates the text inside the Radial Minimap HUD. | \`cornerHudWindow\` (Native HTML) |
| \`update-progress\` | Updates the visual fill meter on a hot corner. | \`cornerHudWindow\` (Native HTML) |
| \`update-countdown\` | Displays a timer countdown on the stealth HUD. | \`cornerHudWindow\` (Native HTML) |

## External Service Integrations (Web Scraping)
Instead of traditional REST APIs, the backend orchestrates hidden \`BrowserWindow\` instances pointing to:
1. \`https://chatgpt.com\` (DOM selector: \`div[data-message-author-role="assistant"]\`)
2. \`https://gemini.google.com/app\` (DOM selector: \`model-response\`)
3. \`https://grok.com\` (DOM selector: \`.prose\`)
