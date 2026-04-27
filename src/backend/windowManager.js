const { BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('node:path');
const storage = require('./storage'); 

function createWindow() {
    const prefs = storage.getPreferences();
    let windowWidth = Math.max(600, prefs.mainWindowWidth || 900);
    let windowHeight = Math.max(400, prefs.mainWindowHeight || 500);

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
        maximizable: false,
    });

    mainWindow.setResizable(false);
    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.platform === 'win32') {
        try { mainWindow.setSkipTaskbar(true); } catch (error) {}
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
    }
    if (process.platform === 'darwin') {
        try { mainWindow.setHiddenInMissionControl(true); } catch (error) {}
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' || input.key === 'F5') event.preventDefault();
        if ((input.control || input.meta) && (input.key.toLowerCase() === 'r')) event.preventDefault();
    });

    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;
            const savedKeybinds = storage.getKeybinds();
            if (savedKeybinds) keybinds = { ...defaultKeybinds, ...savedKeybinds };
            updateGlobalShortcuts(keybinds, mainWindow);
        }, 150);
    });

    return mainWindow;
}

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up', moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left', moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\', toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter', previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]', scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E', emergencyKill: isMac ? 'Cmd+Shift+Q' : 'Ctrl+Shift+Q',
    };
}

function updateGlobalShortcuts(keybinds, mainWindow) {
    globalShortcut.unregisterAll();
    if (!keybinds) return;

    const register = (action, keys, callback) => {
        if (keys) {
            try { globalShortcut.register(keys.replace('Cmd', 'Command').replace('Ctrl', 'Control'), callback); } 
            catch (e) { }
        }
    };

    const moveStep = 20;
    register('moveUp', keybinds.moveUp, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) { const b = mainWindow.getBounds(); mainWindow.setBounds({ ...b, y: b.y - moveStep }); }
    });
    register('moveDown', keybinds.moveDown, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) { const b = mainWindow.getBounds(); mainWindow.setBounds({ ...b, y: b.y + moveStep }); }
    });
    register('moveLeft', keybinds.moveLeft, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) { const b = mainWindow.getBounds(); mainWindow.setBounds({ ...b, x: b.x - moveStep }); }
    });
    register('moveRight', keybinds.moveRight, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) { const b = mainWindow.getBounds(); mainWindow.setBounds({ ...b, x: b.x + moveStep }); }
    });

    register('toggleVisibility', keybinds.toggleVisibility, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (global.toggleStealthMode) global.toggleStealthMode();
    });

    let isClickThrough = false;
    register('toggleClickThrough', keybinds.toggleClickThrough, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            isClickThrough = !isClickThrough;
            mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
        }
    });

    register('nextStep', keybinds.nextStep, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('execute-widget-action', 'capture');
    });

    register('previousResponse', keybinds.previousResponse, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-previous-response');
    });
    register('nextResponse', keybinds.nextResponse, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-next-response');
    });

    register('scrollUp', keybinds.scrollUp, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-up');
    });
    register('scrollDown', keybinds.scrollDown, () => {
        if (global.isOAModeActive || global.isLiveInterviewMode) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-down');
    });

    register('emergencyErase', keybinds.emergencyErase, async () => {
        try {
            storage.clearAllData();
            const { session, app } = require('electron');
            await session.defaultSession.clearStorageData();
            for (let i = 1; i <= 20; i++) {
                const part = session.fromPartition(`persist:ai_profile_${i}`);
                await part.clearStorageData();
            }
            app.quit();
        } catch (e) { require('electron').app.quit(); }
    });

    register('emergencyKill', keybinds.emergencyKill, () => { require('electron').app.exit(0); });
}

module.exports = { createWindow, getDefaultKeybinds, updateGlobalShortcuts };