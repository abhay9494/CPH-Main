# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\app.spec.js >> CP Helper 20 - UI E2E Crash Tests >> 4. Help Others (Help View) works without crashing
- Location: tests\app.spec.js:56:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('text=Help Others')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: BG
    - slider [ref=e6]: "0.8"
  - generic [ref=e7]:
    - generic [ref=e8]: Aa
    - slider [ref=e9]: "12"
  - generic [ref=e10]:
    - generic [ref=e12]:
      - generic [ref=e13]: CP Helper 20
      - generic [ref=e14]: "⚠️ SETUP MISSING: Resume"
      - generic [ref=e15]:
        - button [ref=e16]:
          - img [ref=e17]
        - button [ref=e20]:
          - img [ref=e21]
    - generic [ref=e25]:
      - generic [ref=e26]:
        - generic [ref=e27]: Select Execution Mode
        - generic [ref=e28]: Choose how you want the AI to assist you in this session.
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: ⚡
          - generic [ref=e32]: Online Assessment
          - generic [ref=e33]: Capture your screen directly to instantly generate high-speed code solutions and algorithms.
        - generic [ref=e34]:
          - generic [ref=e35]: 🎯
          - generic [ref=e36]: Proctored OA
          - generic [ref=e37]: Zero-touch execution. Triggers AI captures and navigation via invisible mouse edge-dwells.
        - generic [ref=e38]:
          - generic [ref=e39]: 🎤
          - generic [ref=e40]: Live Interview
          - generic [ref=e41]: Real-time stealth audio bridging. Get instant, conversational AI prompts while you speak.
        - generic [ref=e42]:
          - generic [ref=e43]: 🤝
          - generic [ref=e44]: Help a Friend
          - generic [ref=e45]: Connect to a peer's session via secure WebRTC to quietly push answers and code to their screen.
      - generic [ref=e46]:
        - button "📜 Chat Vault" [ref=e47]:
          - generic [ref=e48]: 📜
          - text: Chat Vault
        - button "⚙️ Preferences" [ref=e49]:
          - generic [ref=e50]: ⚙️
          - text: Preferences
        - button "❓ Help & Guides" [ref=e51]:
          - generic [ref=e52]: ❓
          - text: Help & Guides
```

# Test source

```ts
  1  | const { _electron: electron } = require('playwright');
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | test.describe('CP Helper 20 - UI E2E Crash Tests', () => {
  5  |   let electronApp;
  6  |   let window;
  7  | 
  8  |   // 1. Boot the app before tests begin
  9  |   test.beforeAll(async () => {
  10 |     electronApp = await electron.launch({ args: ['src/index.js'] });
  11 |     window = await electronApp.firstWindow();
  12 |     
  13 |     // Wait for the main LitElement component to attach to the DOM
  14 |     await window.waitForSelector('cheating-daddy-app');
  15 |   });
  16 | 
  17 |   // 2. Shut down after tests finish
  18 |   test.afterAll(async () => {
  19 |     await electronApp.close();
  20 |   });
  21 | 
  22 |   // Helper function to click the back button in your <app-header>
  23 |   // Since we don't have AppHeader.js, this looks for the standard back button/icon
  24 |   async function goBackToHub() {
  25 |     const header = window.locator('app-header');
  26 |     // Clicking the left-most button in the header (usually the Back button)
  27 |     await header.locator('button, div[role="button"]').first().click();
  28 |     // Wait for the main menu to reappear
  29 |     await expect(window.locator('main-view')).toBeVisible();
  30 |   }
  31 | 
  32 |   // --- THE TESTS ---
  33 | 
  34 |   test('1. Hub Menu Loads Successfully', async () => {
  35 |     await expect(window.locator('main-view')).toBeVisible();
  36 |   });
  37 | 
  38 |   test('2. Settings (Customize View) works without crashing', async () => {
  39 |     // Tell the robot to click the text that says "Settings"
  40 |     await window.locator('text=Settings').click();
  41 |     
  42 |     // Verify the Settings UI rendered instead of a white screen
  43 |     const customizeView = window.locator('customize-view');
  44 |     await expect(customizeView).toBeVisible();
  45 |     
  46 |     await goBackToHub();
  47 |   });
  48 | 
  49 |   test('3. Chat Vault (History View) works without crashing', async () => {
  50 |     await window.locator('text=Chat Vault').click();
  51 |     const historyView = window.locator('history-view');
  52 |     await expect(historyView).toBeVisible();
  53 |     await goBackToHub();
  54 |   });
  55 | 
  56 |   test('4. Help Others (Help View) works without crashing', async () => {
  57 |     // Note: Adjust the text match if your button says something slightly different like "Help"
> 58 |     await window.locator('text=Help Others').click();
     |                                              ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  59 |     const helpView = window.locator('help-view');
  60 |     await expect(helpView).toBeVisible();
  61 |     await goBackToHub();
  62 |   });
  63 | 
  64 |   test('5. Live Interview Mode loads Assistant View', async () => {
  65 |     await window.locator('text=Live Interview').click();
  66 |     const assistantView = window.locator('assistant-view');
  67 |     await expect(assistantView).toBeVisible();
  68 |     await goBackToHub();
  69 |   });
  70 | 
  71 |   test('6. Proctored OA Mode loads Assistant View', async () => {
  72 |     await window.locator('text=Proctored OA').click();
  73 |     const assistantView = window.locator('assistant-view');
  74 |     await expect(assistantView).toBeVisible();
  75 |     await goBackToHub();
  76 |   });
  77 | });
```