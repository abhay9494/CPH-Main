const { BrowserWindow, globalShortcut, ipcMain, screen, app, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const storage = require('../storage');

// let mouseEventsIgnored = false;
global.isOAModeActive = false;
let windowResizing = false;
let resizeAnimation = null;
// let isOAModeActive = false; // 🟢 Tracks if Proctored OA is active
let isClickThroughState = false; // 🟢 Tracks the exact Click-Through state
const RESIZE_ANIMATION_DURATION = 500; // milliseconds

// 🐛 FIX: Declare this globally so the export at the bottom can read it!
let companionChatWindow = null;
global.radialHudWindow = null; 
global.activeRadialLabels = Array(16).fill('—');

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
    mainWindow.setContentProtection(true);
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

    // 🟢 X-RAY MODE: Force open the console to see what is killing the UI!
    // mainWindow.webContents.openDevTools({ mode: 'detach' });

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
        emergencyKill: isMac ? 'Cmd+Shift+Q' : 'Ctrl+Shift+Q', // 🟢 NEW: Instant Death
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
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, y: bounds.y - moveStep });
        }
    });
    register('moveDown', keybinds.moveDown, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, y: bounds.y + moveStep });
        }
    });
    register('moveLeft', keybinds.moveLeft, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, x: bounds.x - moveStep });
        }
    });
    register('moveRight', keybinds.moveRight, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            const bounds = mainWindow.getBounds();
            mainWindow.setBounds({ ...bounds, x: bounds.x + moveStep });
        }
    });

    let isStealthHidden = false;
    let wasAiVisibleBeforeShortcut = false; // 🟢 NEW: Memory Variable

    register('toggleVisibility', keybinds.toggleVisibility, () => {
        if (global.isOAModeActive) return; // 🟢 NUKE SHORTCUT IN OA MODE

        if (mainWindow && !mainWindow.isDestroyed()) {
            isStealthHidden = !isStealthHidden;
            if (isStealthHidden) {
                // 🟢 Record AI window state BEFORE hiding everything
                let aiWin = BrowserWindow.getAllWindows().find(w => 
                    !w.isDestroyed() && w !== mainWindow && 
                    (w.webContents.getURL().includes('chatgpt') || w.webContents.getURL().includes('gemini') || w.webContents.getURL().includes('grok'))
                );
                
                if (aiWin) {
                    wasAiVisibleBeforeShortcut = aiWin.isVisible() && aiWin.getOpacity() !== 0;
                } else {
                    wasAiVisibleBeforeShortcut = false;
                }

                // 🟢 FIX: Opacity 0 + ClickThrough ensures ZERO OS-level focus steal!
                mainWindow.setOpacity(0);
                mainWindow.webContents.send('app-made-hidden');
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
                
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed() && w !== mainWindow && w.isVisible()) {
                        w.setOpacity(0);
                        w.setIgnoreMouseEvents(true, { forward: true });
                    }
                });
            } else {
                mainWindow.setOpacity(1);
                
                // 🟢 FIX: Restore the tracked click-through state instead of blindly setting it to false!
                if (isClickThroughState) {
                    mainWindow.setIgnoreMouseEvents(true, { forward: true });
                } else {
                    mainWindow.setIgnoreMouseEvents(false);
                }
                
                mainWindow.webContents.send('app-made-visible');

                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed() && w !== mainWindow) {
                        const url = w.webContents.getURL() || "";
                        // 🟢 FIX: Let the frontend exclusively manage the Widget visibility!
                        if (url.includes('widget.html')) return; 

                        const isAiWindow = url.includes('chatgpt') || url.includes('gemini') || url.includes('grok');
                        if (isAiWindow) {
                            if (wasAiVisibleBeforeShortcut) {
                                w.setOpacity(1);
                                w.setIgnoreMouseEvents(false);
                            }
                        } else {
                            w.setOpacity(1);
                            w.setIgnoreMouseEvents(false);
                        }
                    }
                });
                if (isStealthHidden) {
                    if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.hide();
                } else {
                    if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.isLiveInterviewMode) {
                        global.radialHudWindow.showInactive();
                        // 🟢 DEFENSE 3: Re-apply the flag to beat the Windows OS reset bug!
                        global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                    }
                }
            }
        }
    });

    let isClickThrough = false;
    register('toggleClickThrough', keybinds.toggleClickThrough, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            isClickThrough = !isClickThrough;
            mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
            // console.log(`Click-through mode: ${isClickThrough ? 'ON' : 'OFF'}`);
        }
    });

    // ----------------------------------------------------
    // 3. AI ACTIONS (Capture Screenshot)
    // ----------------------------------------------------
    register('nextStep', keybinds.nextStep, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) {
            // Tells the UI to trigger handleCaptureScreenshot()
            mainWindow.webContents.send('execute-widget-action', 'capture');
        }
    });

    // ----------------------------------------------------
    // 4. NAVIGATION (Responses)
    // ----------------------------------------------------
    register('previousResponse', keybinds.previousResponse, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-previous-response');
    });
    register('nextResponse', keybinds.nextResponse, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('navigate-next-response');
    });

    // ----------------------------------------------------
    // 5. SCROLLING
    // ----------------------------------------------------
    register('scrollUp', keybinds.scrollUp, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-up');
    });
    register('scrollDown', keybinds.scrollDown, () => {
        if (global.isOAModeActive) return;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('scroll-response-down');
    });

    // ----------------------------------------------------
    // 6. EMERGENCY ERASE (Nuke & Quit)
    // ----------------------------------------------------
    register('emergencyErase', keybinds.emergencyErase, async () => {
        // console.log("🧨 EMERGENCY ERASE TRIGGERED!");
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

    register('emergencyKill', keybinds.emergencyKill, () => {
        console.log("💀 EMERGENCY KILL TRIGGERED!");
        app.exit(0); // 🟢 INSTANT KILL: Bypasses all teardown events and vanishes immediately.
    });

    // 🟢 CREATE THE INDEPENDENT RADIAL WINDOW AS A PERMANENT MINIMAP
    global.createRadialWindow = () => {
        const { screen } = require('electron');
        if (!global.radialHudWindow || global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow = new BrowserWindow({
                width: 400, height: 400,
                frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            global.radialHudWindow.setContentProtection(true);
        // 🟢 DEFENSE 1: OS-Level Ghosting on creation
        global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });

        // 🟢 DEFENSE 2: CSS-Level Ghosting (pointer-events: none !important;)
        const htmlContent = `
        <html><body style="margin:0; overflow:hidden; font-family:sans-serif; color:white; pointer-events:none !important;">
        <div id="container" style="position:relative; width:400px; height:400px; border-radius:50%; background:rgba(10,10,10,0.85); border:3px solid rgba(255,255,255,0.1); backdrop-filter:blur(4px); box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div id="highlight" style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:50%; background:transparent; transition: 0.1s;"></div>
                <div id="icons"></div>
                <div id="centerText" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; font-size:13px; font-weight:bold; color:#f14c4c; background:#111; padding:8px 12px; border-radius:8px; border:1px solid #f14c4c; width: 140px; text-transform:uppercase; transition: 0.2s;">RADIAL MINIMAP</div>
            </div>
            <script>
            const { ipcRenderer } = require('electron');
            const highlight = document.getElementById('highlight');
            const centerText = document.getElementById('centerText');
            const iconsDiv = document.getElementById('icons');

            for(let i=0; i<16; i++) {
                let angle = i * 22.5 - 90;
                let rad = angle * Math.PI / 180;
                let x = 200 + 150 * Math.cos(rad);
                let y = 200 + 150 * Math.sin(rad);
                let el = document.createElement('div');
                el.id = 'icon-'+i;
                el.style.position = 'absolute';
                el.style.left = x + 'px';
                el.style.top = y + 'px';
                el.style.transform = 'translate(-50%, -50%)';
                el.style.fontSize = '22px';
                el.style.opacity = '0.4';
                el.style.transition = '0.2s';
                iconsDiv.appendChild(el);
            }

            ipcRenderer.on('update-hud', (e, data) => {
                const { slice, labels, isActive } = data;

                // 🟢 DYNAMIC COLORS: Red when Off, Green when Armed
                if (isActive) {
                    centerText.style.color = '#00cc66'; 
                    centerText.style.borderColor = '#00cc66';
                    centerText.style.boxShadow = '0 0 15px rgba(0,204,102,0.4)';
                } else {
                    centerText.style.color = '#f14c4c'; 
                    centerText.style.borderColor = '#f14c4c';
                    centerText.style.boxShadow = 'none';
                }

                for(let i=0; i<16; i++) {
                    const el = document.getElementById('icon-'+i);
                    el.innerText = labels[i].split(' ')[0] || '';
                    if(slice === i && isActive) {
                        el.style.opacity = '1';
                        el.style.transform = 'translate(-50%, -50%) scale(1.6)';
                        el.style.color = '#00cc66'; 
                    } else {
                        el.style.opacity = '0.4';
                        el.style.transform = 'translate(-50%, -50%) scale(1)';
                        el.style.color = 'white';
                    }
                }

                if (slice !== null && isActive) {
                    highlight.style.background = \`conic-gradient(from \${slice * 22.5 - 11.25}deg, rgba(0, 204, 102, 0.4) 0deg, rgba(0, 204, 102, 0.4) 22.5deg, transparent 22.5deg)\`;
                    centerText.innerText = labels[slice].replace(/^[^\w\s]+/, '').trim() || labels[slice];
                } else {
                    highlight.style.background = 'transparent';
                    centerText.innerText = 'RADIAL MINIMAP';
                }
            });
            </script>
            </body></html>
            `;
            global.radialHudWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;
            global.radialHudWindow.setPosition(Math.floor((width - 400) / 2), height - 420);
        }
    };
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant' && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    // 🟢 BGMI Tracker Variables
    let bgmiTrackerProcess = null;
    let radialTelemetryLoop = null;
    let radialAnchorX = 0;
    let radialAnchorY = 0;
    let currentRadialSlice = null;
    const DEADZONE_PX = 25; 

    ipcMain.on('sync-radial-labels', (event, labels) => {
        global.activeRadialLabels = labels || Array(16).fill('—');
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('update-hud', { 
                slice: null, 
                labels: global.activeRadialLabels,
                isActive: global.isRadialModeActive || false
            });
        }
    });

    ipcMain.on('toggle-radial-permanent', (event, isVisible) => {
        global.isLiveInterviewMode = isVisible;
        if (isVisible) {
            global.createRadialWindow();

            // 🟢 HUD Starts Visible, but RED (Inactive)
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.showInactive();
                // 🟢 DEFENSE 3: Re-apply the flag to beat the Windows OS reset bug!
                global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false });
            }

            if (!bgmiTrackerProcess) {
                const { spawn } = require('child_process');
                const fs = require('fs');
                const path = require('path');

                // 🟢 Bulletproof Array format: Prevents VS Code/Prettier from breaking PowerShell indentation!
                const psScript = [
                    '$code = @"',
                    'using System;',
                    'using System.Runtime.InteropServices;',
                    'public class KeyH {',
                    '    [DllImport("user32.dll")]',
                    '    public static extern short GetAsyncKeyState(int vKey);',
                    '}',
                    '"@',
                    'Add-Type -TypeDefinition $code',
                    '$ctrlDown = $false',
                    'while ($true) {',
                    '    $state = [KeyH]::GetAsyncKeyState(0x11)',
                    '    $isDown = ($state -band 0x8000) -ne 0',
                    '    if ($isDown -ne $ctrlDown) {',
                    '        $ctrlDown = $isDown',
                    '        if ($isDown) { ',
                    '            [Console]::WriteLine("CTRL_DOWN")',
                    '            [Console]::Out.Flush()',
                    '        } else { ',
                    '            [Console]::WriteLine("CTRL_UP")',
                    '            [Console]::Out.Flush()',
                    '        }',
                    '    }',
                    '    Start-Sleep -Milliseconds 15',
                    '}'
                ].join('\n');
                // 🟢 SECURITY BYPASS: Force it into Electron's User Data folder so Windows Defender ignores it!
                const scriptPath = path.join(app.getPath('userData'), 'cph_radial_tracker.ps1');
                fs.writeFileSync(scriptPath, psScript);

                bgmiTrackerProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath]);

                bgmiTrackerProcess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');

                    for (let output of lines) {
                        output = output.trim();

                        if (output === 'CTRL_DOWN') {
                            if (global.ctrlHoldTimer) clearTimeout(global.ctrlHoldTimer);

                            // 🟢 THE EXACT 2-SECOND DELAY
                            global.ctrlHoldTimer = setTimeout(() => {
                                global.isRadialModeActive = true;

                                // 🟢 Set Anchor point *AFTER* 2 seconds have passed!
                                const { screen } = require('electron');
                                const point = screen.getCursorScreenPoint();
                                radialAnchorX = point.x;
                                radialAnchorY = point.y;
                                currentRadialSlice = null;

                                // 🟢 Armed: Turn HUD text GREEN & Re-Ghost
                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    // 🟢 DEFENSE 3: Re-apply the flag to beat the Windows OS reset bug!
                                    global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                                    global.radialHudWindow.webContents.send('update-hud', {
                                        slice: null,
                                        labels: global.activeRadialLabels,
                                        isActive: true
                                    });
                                }

                                if (radialTelemetryLoop) clearInterval(radialTelemetryLoop);
                                radialTelemetryLoop = setInterval(() => {
                                    const p = screen.getCursorScreenPoint();
                                    const dx = p.x - radialAnchorX;
                                    const dy = p.y - radialAnchorY;
                                    const dist = Math.sqrt(dx*dx + dy*dy);

                                    // Must pull > 25px away from where the 2-second timer finished
                                    if (dist > DEADZONE_PX) {
                                        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                        angle = angle + 90; 
                                        if (angle < 0) angle += 360;
                                        let adjustedAngle = (angle + 11.25) % 360;
                                        currentRadialSlice = Math.floor(adjustedAngle / 22.5);
                                    } else {
                                        currentRadialSlice = null; 
                                    }

                                    if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                        global.radialHudWindow.webContents.send('update-hud', {
                                            slice: currentRadialSlice,
                                            labels: global.activeRadialLabels,
                                            isActive: true
                                        });
                                    }
                                }, 30);
                            }, 2000); // 2000ms = 2 Seconds
                        }

                        if (output === 'CTRL_UP') {
                            // If you released Ctrl before 2 seconds, cancel the timer
                            if (global.ctrlHoldTimer) {
                                clearTimeout(global.ctrlHoldTimer);
                                global.ctrlHoldTimer = null;
                            }

                            // If the system was ARMED and GREEN, execute the pull!
                            if (global.isRadialModeActive) {
                                if (radialTelemetryLoop) {
                                    clearInterval(radialTelemetryLoop);
                                    radialTelemetryLoop = null;
                                }

                                // Bulletproof Execution Window Target
                                const mainAppWindow = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
                                if (currentRadialSlice !== null && mainAppWindow && !mainAppWindow.isDestroyed()) {
                                    mainAppWindow.webContents.send('execute-radial-hud', currentRadialSlice);
                                }

                                currentRadialSlice = null;
                                global.isRadialModeActive = false;

                                // 🟢 Reset: Turn HUD text back to RED
                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    global.radialHudWindow.webContents.send('update-hud', { 
                                        slice: null, 
                                        labels: global.activeRadialLabels, 
                                        isActive: false 
                                    });
                                }
                            }
                        }
                    }
                });

                bgmiTrackerProcess.stderr.on('data', (data) => {
                    console.error('[BGMI ERROR]', data.toString());
                });
            }
        } else {
            // Mode Cleanup
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.hide();
            if (bgmiTrackerProcess) {
                bgmiTrackerProcess.kill();
                bgmiTrackerProcess = null;
            }
            if (radialTelemetryLoop) {
                clearInterval(radialTelemetryLoop);
                radialTelemetryLoop = null;
            }
        }
    });

    ipcMain.on('set-oa-mode', (event, isActive) => {
        global.isOAModeActive = isActive;
        if (isActive) global.isClickThroughState = true;
    });

    // 🟢 FIX: Intercept and track the ignore-mouse events here so the global shortcuts can read it!
    ipcMain.removeAllListeners('set-ignore-mouse-events');
    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        global.isClickThroughState = ignore;
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setIgnoreMouseEvents(ignore, { forward: true });
            // 🟢 BEAM THE STATE TO THE APP HEADER INDICATOR!
            win.webContents.send('ghost-state-changed', ignore);
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
                // console.log('Cannot animate resize: window has been destroyed');
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
                // console.log(`Window already at target size for ${layoutMode} mode`);
                resolve();
                return;
            }

            // console.log(`Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`);

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

                    // console.log(`Animation complete: ${targetWidth}x${targetHeight}`);
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

    // 🟢 FIXED: Force window to open the second connection is established
    ipcMain.on('open-companion-window', (event, data) => {
        // console.log("[DEBUG-COMPANION] Received open request for:", data.name);
        
        if (typeof companionChatWindow === 'undefined' || !companionChatWindow || companionChatWindow.isDestroyed()) {
            // console.log("[DEBUG-COMPANION] Creating Companion window...");
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
            
            companionChatWindow.setContentProtection(true);
            
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
                        <span style="-webkit-app-region:no-drag; cursor: default !important; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span>
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
        // console.log("[DEBUG-COMPANION] Showing Companion window.");
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
            
            companionChatWindow.setContentProtection(true);
            
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
                        <span style="-webkit-app-region:no-drag; cursor: default !important; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span>
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
