const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('CP Helper 20 - UI E2E Crash Tests', () => {
  let electronApp;
  let window;

  // 1. Boot the app before tests begin
  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['src/index.js'] });
    window = await electronApp.firstWindow();
    
    // Wait for the main LitElement component to attach to the DOM
    await window.waitForSelector('cheating-daddy-app');
  });

  // 2. Shut down after tests finish
  test.afterAll(async () => {
    await electronApp.close();
  });

  // Helper function to click the back button in your <app-header>
  // Since we don't have AppHeader.js, this looks for the standard back button/icon
  async function goBackToHub() {
    const header = window.locator('app-header');
    // Clicking the left-most button in the header (usually the Back button)
    await header.locator('button, div[role="button"]').first().click();
    // Wait for the main menu to reappear
    await expect(window.locator('main-view')).toBeVisible();
  }

  // --- THE TESTS ---

  test('1. Hub Menu Loads Successfully', async () => {
    await expect(window.locator('main-view')).toBeVisible();
  });

  test('2. Settings (Customize View) works without crashing', async () => {
    // Tell the robot to click the text that says "Settings"
    await window.locator('text=Settings').click();
    
    // Verify the Settings UI rendered instead of a white screen
    const customizeView = window.locator('customize-view');
    await expect(customizeView).toBeVisible();
    
    await goBackToHub();
  });

  test('3. Chat Vault (History View) works without crashing', async () => {
    await window.locator('text=Chat Vault').click();
    const historyView = window.locator('history-view');
    await expect(historyView).toBeVisible();
    await goBackToHub();
  });

  test('4. Help Others (Help View) works without crashing', async () => {
    // Note: Adjust the text match if your button says something slightly different like "Help"
    await window.locator('text=Help Others').click();
    const helpView = window.locator('help-view');
    await expect(helpView).toBeVisible();
    await goBackToHub();
  });

  test('5. Live Interview Mode loads Assistant View', async () => {
    await window.locator('text=Live Interview').click();
    const assistantView = window.locator('assistant-view');
    await expect(assistantView).toBeVisible();
    await goBackToHub();
  });

  test('6. Proctored OA Mode loads Assistant View', async () => {
    await window.locator('text=Proctored OA').click();
    const assistantView = window.locator('assistant-view');
    await expect(assistantView).toBeVisible();
    await goBackToHub();
  });
});