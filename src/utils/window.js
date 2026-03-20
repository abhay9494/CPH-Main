const { BrowserWindow, globalShortcut, ipcMain, screen, app, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const storage = require('../storage');

let mouseEventsIgnored = false;
let windowResizing = false;
let resizeAnimation = null;
const RESIZE_ANIMATION_DURATION = 500; // milliseconds

function createWindow(sendToRenderer, geminiSessionRef) {
    // Get layout preference (default to 'normal')
    let windowWidth = 900;
    let windowHeight = 500;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // TODO: change to true
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
        maximizable: false,
    });

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );

    mainWindow.setResizable(false);
    mainWindow.setContentProtection(false);
    // if (process.platform === 'win32') mainWindow.setDisplayAffinity('exclude_from_capture');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Hide from Windows taskbar
    if (process.platform === 'win32') {
        try {
            mainWindow.setSkipTaskbar(true);
            console.log('Hidden from Windows taskbar');
        } catch (error) {
            console.warn('Could not hide from taskbar:', error.message);
        }
    }

    // Hide from Mission Control on macOS
    if (process.platform === 'darwin') {
        try {
            mainWindow.setHiddenInMissionControl(true);
            console.log('Hidden from macOS Mission Control');
        } catch (error) {
            console.warn('Could not hide from Mission Control:', error.message);
        }
    }

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // 🟢 PROTECT MAIN APP FROM F11 AND RELOADS
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11' || input.key === 'F5') event.preventDefault();
        if ((input.control || input.meta) && (input.key.toLowerCase() === 'r')) event.preventDefault();
    });

    // After window is created, initialize keybinds
    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            // Load keybinds from storage
            const savedKeybinds = storage.getKeybinds();
            if (savedKeybinds) {
                keybinds = { ...defaultKeybinds, ...savedKeybinds };
            }

            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
        previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
        nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
        scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
        scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        emergencyErase: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
    };
}

function updateGlobalShortcuts(keybinds, mainWindow) {
    // Unregister old shortcuts before applying new ones
    globalShortcut.unregisterAll();

    if (!keybinds) return;

    const register = (action, keys, callback) => {
        if (keys) {
            try {
                // Electron's globalShortcut requires keys in specific formats (e.g., 'CommandOrControl+X')
                // This safely handles the registration
                globalShortcut.register(keys.replace('Cmd', 'Command').replace('Ctrl', 'Control'), callback);
            } catch (e) {
                console.error(`Failed to register shortcut for ${action}: ${keys}`);
            }
        }
    };

    // ----------------------------------------------------
    // 1. WINDOW MOVEMENT (20px per press)
    // ----------------------------------------------------
    const moveStep = 20;
    register('moveUp', keybinds.moveUp, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, y: bounds.y - moveStep });
        }
    });
    register('moveDown', keybinds.moveDown, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, y: bounds.y + moveStep });
        }
    });
    register('moveLeft', keybinds.moveLeft, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, x: bounds.x - moveStep });
        }
    });
    register('moveRight', keybinds.moveRight, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, x: bounds.x + moveStep });
        }
    });

    let hiddenWindowsStates = new Map();

    register('toggleVisibility', keybinds.toggleVisibility, () => {
        console.log("[DEBUG-VISIBILITY] Ctrl+\\ pressed.");
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isVisible()) {
                console.log("[DEBUG-VISIBILITY] Hiding all windows.");
                hiddenWindowsStates.clear();
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) {
                        hiddenWindowsStates.set(w, w.isVisible());
                        if (w.isVisible()) w.hide();
                    }
                });
            } else {
                console.log("[DEBUG-VISIBILITY] Restoring previously visible windows.");
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) {
                        const wasVisible = hiddenWindowsStates.get(w);
                        if (wasVisible) {
                            if (w === mainWindow) {
                                w.show();
                                w.restore();
                                w.focus();
                            } else {
                                w.showInactive(); 
                            }
                        }
                    }
                });
                mainWindow.webContents.send('app-made-visible');
            }
        }
    });

    let isClickThrough = false;
    register('toggleClickThrough', keybinds.toggleClickThrough, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            isClickThrough = !isClickThrough;
            mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
            console.log(`Click-through mode: ${isClickThrough ? 'ON' : 'OFF'}`);
        }
    });

    // ----------------------------------------------------
    // 3. AI ACTIONS (Capture Screenshot)
    // ----------------------------------------------------
    register('nextStep', keybinds.nextStep, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            // Tells the UI to trigger handleCaptureScreenshot()
            mainWindow.webContents.send('execute-widget-action', 'capture');
        }
    });

    // ----------------------------------------------------
    // 4. NAVIGATION (Responses)
    // ----------------------------------------------------
    register('previousResponse', keybinds.previousResponse, () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-previous-response');
    });
    register('nextResponse', keybinds.nextResponse, () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-next-response');
    });

    // ----------------------------------------------------
    // 5. SCROLLING
    // ----------------------------------------------------
    register('scrollUp', keybinds.scrollUp, () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-up');
    });
    register('scrollDown', keybinds.scrollDown, () => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-down');
    });

    // ----------------------------------------------------
    // 6. EMERGENCY ERASE (Nuke & Quit)
    // ----------------------------------------------------
    register('emergencyErase', keybinds.emergencyErase, async () => {
        console.log("🧨 EMERGENCY ERASE TRIGGERED!");
        try {
            // 1. Wipe local config/storage files
            storage.clearAllData();
            
            // 2. Wipe Chromium cache, cookies, and AI logins globally
            await session.defaultSession.clearStorageData();
            for (let i = 1; i <= 20; i++) {
                const part = session.fromPartition(`persist:ai_profile_${i}`);
                await part.clearStorageData();
            }
            
            // 3. Instant kill process
            app.quit();
        } catch (e) {
            app.quit(); // Force quit even if cleanup fails
        }
    });
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant' && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.showInactive();
            }
            return { success: true };
        } catch (error) {
            console.error('Error toggling window visibility:', error);
            return { success: false, error: error.message };
        }
    });

    function animateWindowResize(mainWindow, targetWidth, targetHeight, layoutMode) {
        return new Promise(resolve => {
            // Check if window is destroyed before starting animation
            if (mainWindow.isDestroyed()) {
                console.log('Cannot animate resize: window has been destroyed');
                resolve();
                return;
            }

            // Clear any existing animation
            if (resizeAnimation) {
                clearInterval(resizeAnimation);
                resizeAnimation = null;
            }

            const [startWidth, startHeight] = mainWindow.getSize();

            // If already at target size, no need to animate
            if (startWidth === targetWidth && startHeight === targetHeight) {
                console.log(`Window already at target size for ${layoutMode} mode`);
                resolve();
                return;
            }

            console.log(`Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`);

            windowResizing = true;
            mainWindow.setResizable(true);

            const frameRate = 60; // 60 FPS
            const totalFrames = Math.floor(RESIZE_ANIMATION_DURATION / (1000 / frameRate));
            let currentFrame = 0;

            const widthDiff = targetWidth - startWidth;
            const heightDiff = targetHeight - startHeight;

            resizeAnimation = setInterval(() => {
                currentFrame++;
                const progress = currentFrame / totalFrames;

                // Use easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                const currentWidth = Math.round(startWidth + widthDiff * easedProgress);
                const currentHeight = Math.round(startHeight + heightDiff * easedProgress);

                if (!mainWindow || mainWindow.isDestroyed()) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;
                    return;
                }
                mainWindow.setSize(currentWidth, currentHeight);

                // Re-center the window during animation
                const primaryDisplay = screen.getPrimaryDisplay();
                const { width: screenWidth } = primaryDisplay.workAreaSize;
                const x = Math.floor((screenWidth - currentWidth) / 2);
                const y = 0;
                mainWindow.setPosition(x, y);

                if (currentFrame >= totalFrames) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;

                    // Check if window is still valid before final operations
                    if (!mainWindow.isDestroyed()) {
                        mainWindow.setResizable(false);

                        // Ensure final size is exact
                        mainWindow.setSize(targetWidth, targetHeight);
                        const finalX = Math.floor((screenWidth - targetWidth) / 2);
                        mainWindow.setPosition(finalX, 0);
                    }

                    console.log(`Animation complete: ${targetWidth}x${targetHeight}`);
                    resolve();
                }
            }, 1000 / frameRate);
        });
    }

    ipcMain.handle('update-sizes', async event => {
        // NEUTERED: Window resizing is permanently disabled. 
        // In an OA or Interview, dynamic resizing causes eye-tracking suspicion. 
        // The window will now remain a constant, reliable size.
        return { success: true };
    });

    // 🟢 NEW: Floating Companion Chat Window
    let companionChatWindow = null;

    // 🟢 FIXED: Force window to open the second connection is established
    ipcMain.on('open-companion-window', (event, data) => {
        console.log("[DEBUG-COMPANION] Received open request for:", data.name);
        
        if (typeof companionChatWindow === 'undefined' || !companionChatWindow || companionChatWindow.isDestroyed()) {
            console.log("[DEBUG-COMPANION] Creating Companion window...");
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            
            // Fixed width, full height
            const windowWidth = 340; 
            
            companionChatWindow = new BrowserWindow({
                width: windowWidth,
                height: height,
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                hasShadow: false,
                skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            
            companionChatWindow.setContentProtection(false);
            
            const htmlContent = `
                <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
                    <style>
                        body { margin:0; padding:12px; background:rgba(20,20,20,0.8); color:white; font-family:'Inter', -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; border-left:1px solid #444; }
                        ::-webkit-scrollbar { width: 6px; }
                        ::-webkit-scrollbar-track { background: transparent; }
                        ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                        ::-webkit-scrollbar-thumb:hover { background: #666; }
                        .msg-box { background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-wrap: break-word; }
                        pre { background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 11px; margin: 5px 0; border: 1px solid #333; }
                        code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; }
                        p { margin: 0 0 5px 0; } p:last-child { margin: 0; }
                    </style>
                </head>
                <body>
                    <div style="-webkit-app-region:drag; font-size:12px; font-weight:bold; color:#00cc66; margin-bottom:10px; display:flex; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid #333;">
                        <span>🟢 Linked with ${data.name}</span>
                        <span style="-webkit-app-region:no-drag; cursor:pointer; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span>
                    </div>
                    <div id="msgs" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;"></div>
                    <script>
                        require('electron').ipcRenderer.on('new-msg', (e, d) => {
                            const div = document.createElement('div');
                            div.className = 'msg-box';
                            const isYou = d.name.includes('You');
                            const color = isYou ? '#00cc66' : '#a142f4';
                            div.style.borderLeft = '2px solid ' + color;
                            div.innerHTML = '<strong style="color:' + color + '; display:block; margin-bottom:4px;">' + d.name + '</strong>' + marked.parse(d.message);
                            
                            const msgs = document.getElementById('msgs');
                            msgs.appendChild(div);
                            msgs.scrollTop = msgs.scrollHeight;
                        });
                        
                        require('electron').ipcRenderer.on('sync-opacity', (e, opacity) => {
                            document.body.style.background = \`rgba(20,20,20,\${opacity})\`;
                        });
                    </script>
                </body>
                </html>
            `;
            companionChatWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            companionChatWindow.setPosition(width - windowWidth, 0);
        }
        
        // Ensure it pops up immediately
        console.log("[DEBUG-COMPANION] Showing Companion window.");
        companionChatWindow.showInactive();
    });

    ipcMain.on('relay-companion-chat', (event, data) => {
        if (!companionChatWindow || companionChatWindow.isDestroyed()) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            const windowWidth = 340; 

            companionChatWindow = new BrowserWindow({
                width: windowWidth, height: height,
                alwaysOnTop: true, frame: false, transparent: true, 
                skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            
            companionChatWindow.setContentProtection(false);
            
            const htmlContent = `
                <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
                    <style>
                        body { margin:0; padding:12px; background:rgba(20,20,20,0.8); color:white; font-family:'Inter', -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; border-left:1px solid #444; }
                        ::-webkit-scrollbar { width: 6px; }
                        ::-webkit-scrollbar-track { background: transparent; }
                        ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                        ::-webkit-scrollbar-thumb:hover { background: #666; }
                        .msg-box { background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-wrap: break-word; }
                        pre { background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 11px; margin: 5px 0; border: 1px solid #333; }
                        code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; }
                        p { margin: 0 0 5px 0; } p:last-child { margin: 0; }
                    </style>
                </head>
                <body>
                    <div style="-webkit-app-region:drag; font-size:12px; font-weight:bold; color:#888; margin-bottom:10px; display:flex; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid #333;">
                        <span>Whisper Log</span>
                        <span style="-webkit-app-region:no-drag; cursor:pointer; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span>
                    </div>
                    <div id="msgs" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;"></div>
                    <script>
                        require('electron').ipcRenderer.on('new-msg', (e, d) => {
                            const div = document.createElement('div');
                            div.className = 'msg-box';
                            const isYou = d.name.includes('You');
                            const color = isYou ? '#00cc66' : '#a142f4';
                            div.style.borderLeft = '2px solid ' + color;
                            div.innerHTML = '<strong style="color:' + color + '; display:block; margin-bottom:4px;">' + d.name + '</strong>' + marked.parse(d.message);
                            
                            const msgs = document.getElementById('msgs');
                            msgs.appendChild(div);
                            msgs.scrollTop = msgs.scrollHeight; 
                        });
                        
                        require('electron').ipcRenderer.on('sync-opacity', (e, opacity) => {
                            document.body.style.background = \`rgba(20,20,20,\${opacity})\`;
                        });
                    </script>
                </body>
                </html>
            `;
            companionChatWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            companionChatWindow.setPosition(width - windowWidth, 0);
        }
        
        setTimeout(() => {
            if (companionChatWindow && !companionChatWindow.isDestroyed()) {
                companionChatWindow.webContents.send('new-msg', data);
                companionChatWindow.showInactive(); 
            }
        }, 300);
    });

    ipcMain.on('close-companion-chat', () => {
        if (companionChatWindow && !companionChatWindow.isDestroyed()) {
            companionChatWindow.close();
            companionChatWindow = null;
        }
    });

    ipcMain.handle('hide-companion-chat', () => {
        if (companionChatWindow && !companionChatWindow.isDestroyed()) {
            companionChatWindow.hide();
        }
    });
}

module.exports = {
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
    getCompanionWindow: () => companionChatWindow
};
