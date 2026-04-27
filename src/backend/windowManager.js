const { BrowserWindow, globalShortcut, ipcMain, screen, app, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const storage = require('./storage'); 

global.isOAModeActive = false;
let windowResizing = false;
let resizeAnimation = null;
const RESIZE_ANIMATION_DURATION = 500;

let companionChatWindow = null;
global.radialHudWindow = null; 
global.activeRadialLabels = Array(16).fill('—');

function createWindow(sendToRenderer, geminiSessionRef) {
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
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.platform === 'win32') {
        try { mainWindow.setSkipTaskbar(true); } catch (error) {}
    }
    if (process.platform === 'darwin') {
        try { mainWindow.setHiddenInMissionControl(true); } catch (error) {}
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    // 🟢 3-TIER Z-INDEX: Middle Layer (Overlay)
    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu', 1);
    }

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
            updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);
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
            await session.defaultSession.clearStorageData();
            for (let i = 1; i <= 20; i++) {
                const part = session.fromPartition(`persist:ai_profile_${i}`);
                await part.clearStorageData();
            }
            app.quit();
        } catch (e) { app.quit(); }
    });

    register('emergencyKill', keybinds.emergencyKill, () => { app.exit(0); });

    global.createRadialWindow = () => {
        const { screen } = require('electron');
        const prefs = storage.getPreferences();
        const rs = prefs.radialSettings || { size: 400, offsetX: 0, offsetY: 0 };
        const bgAlpha = prefs.backgroundTransparency ?? 0.8;
        
        if (!global.radialHudWindow || global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow = new BrowserWindow({
                width: rs.size, height: rs.size,
                frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            global.radialHudWindow.setContentProtection(true);
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });

            // 🟢 3-TIER Z-INDEX: Absolute Top Layer (Minimap)
            global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
            global.radialHudWindow.moveTop();

            const htmlContent = `
            <html><body style="margin:0; overflow:hidden; font-family:sans-serif; color:white; pointer-events:none !important;">
            <div id="wrapper" style="position:relative; width:${rs.size}px; height:${rs.size}px;">
                <div id="container" style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(30,30,30,${bgAlpha}); border:3px solid rgba(255,255,255,0.1); backdrop-filter:blur(4px); box-shadow: 0 10px 40px rgba(0,0,0,0.8); transition: opacity 0.2s;">
                    <div id="highlight" style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:50%; background:transparent; transition: 0.1s;"></div>
                    <div id="icons"></div>
                    <div id="centerText" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; font-size:${Math.max(10, rs.size/30)}px; font-weight:bold; color:#f14c4c; background:rgba(10,10,10,0.8); padding:8px 12px; border-radius:8px; border:1px solid #f14c4c; width: 35%; text-transform:uppercase; transition: 0.2s;">RADIAL MINIMAP</div>
                </div>
                <div id="ghostDot" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:6px; height:6px; background-color:#f14c4c; border-radius:50%; opacity:0; transition: opacity 0.2s;"></div>
            </div>
            <script>
            const { ipcRenderer } = require('electron');
            const container = document.getElementById('container');
            const ghostDot = document.getElementById('ghostDot');
            const highlight = document.getElementById('highlight');
            const centerText = document.getElementById('centerText');
            const iconsDiv = document.getElementById('icons');
            const SIZE = ${rs.size};
            const RADIUS = SIZE * 0.375;

            for(let i=0; i<16; i++) {
                let angle = i * 22.5 - 90;
                let rad = angle * Math.PI / 180;
                let x = (SIZE/2) + RADIUS * Math.cos(rad);
                let y = (SIZE/2) + RADIUS * Math.sin(rad);
                let el = document.createElement('div');
                el.id = 'icon-'+i;
                el.style.position = 'absolute';
                el.style.left = x + 'px';
                el.style.top = y + 'px';
                el.style.transform = 'translate(-50%, -50%)';
                el.style.fontSize = Math.max(14, SIZE/18) + 'px';
                el.style.opacity = '0.4';
                el.style.transition = '0.2s';
                iconsDiv.appendChild(el);
            }

            ipcRenderer.on('update-hud', (e, data) => {
                const { slice, labels, isActive, ghostMode } = data;

                if (ghostMode) { container.style.opacity = '0'; return; } 
                else { container.style.opacity = '1'; ghostDot.style.opacity = '0'; }

                if (isActive) {
                    centerText.style.color = '#00cc66'; centerText.style.borderColor = '#00cc66'; centerText.style.boxShadow = '0 0 15px rgba(0,204,102,0.4)';
                } else {
                    centerText.style.color = '#f14c4c'; centerText.style.borderColor = '#f14c4c'; centerText.style.boxShadow = 'none';
                }

                for(let i=0; i<16; i++) {
                    const el = document.getElementById('icon-'+i);
                    el.innerText = labels[i].split(' ')[0] || '';
                    if(slice === i && isActive) {
                        el.style.opacity = '1'; el.style.transform = 'translate(-50%, -50%) scale(1.6)'; el.style.color = '#00cc66'; 
                    } else {
                        el.style.opacity = '0.4'; el.style.transform = 'translate(-50%, -50%) scale(1)'; el.style.color = 'white';
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
            ipcRenderer.on('set-ghost-dot', (e, isVisible) => { ghostDot.style.opacity = isVisible ? '1' : '0'; });
            </script>
            </body></html>
            `;
            global.radialHudWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;
            let baseX = Math.floor((width - rs.size) / 2);
            let baseY = height - (rs.size + 20);
            global.radialHudWindow.setPosition(baseX + rs.offsetX, baseY + rs.offsetY);
        }
    };
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant' && !mainWindow.isDestroyed()) {
            global.isClickThroughState = false;
            mainWindow.setIgnoreMouseEvents(false);
            mainWindow.webContents.send('ghost-state-changed', false);
        }
    });

    let bgmiTrackerProcess = null;
    let radialTelemetryLoop = null;
    let radialAnchorX = 0;
    let radialAnchorY = 0;
    let currentRadialSlice = null;
    const DEADZONE_PX = 25; 

    let hotCornerInterval = null;
    let currentDwellZone = null;

    ipcMain.on('start-hot-corners', (event, bounds) => {
        if (hotCornerInterval) return;
        const { screen } = require('electron');
        const b = bounds || { cornerSize: 15, centerX: 40, centerY: 40 };

        hotCornerInterval = setInterval(() => {
            const point = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(point);
            if (!display) return;

            const { x: dx, y: dy, width: w, height: h } = display.bounds;
            const x = point.x - dx;
            const y = point.y - dy;
            
            const edge = 35; // Tolerance
            let isTop = y <= edge;
            let isBottom = y >= h - edge;
            let isLeft = x <= edge;
            let isRight = x >= w - edge;

            const xPct = (x / w) * 100;
            const yPct = (y / h) * 100;

            const getSeg = (pct, centerSize, cornerSize) => {
                if (pct <= cornerSize) return '1'; 
                if (pct >= 100 - cornerSize) return '5'; 
                const midStart = 50 - (centerSize / 2);
                const midEnd = 50 + (centerSize / 2);
                if (pct >= midStart && pct <= midEnd) return '3'; 
                if (pct > cornerSize && pct < midStart) return '2'; 
                return '4'; 
            };

            let activeZone = 'none';
            if (isTop) {
                const s = getSeg(xPct, b.centerX, b.cornerSize);
                activeZone = s === '1' ? 'top_left' : s === '2' ? 'top_mid_left' : s === '3' ? 'top_center' : s === '4' ? 'top_mid_right' : 'top_right';
            } else if (isBottom) {
                const s = getSeg(xPct, b.centerX, b.cornerSize);
                activeZone = s === '1' ? 'bottom_left' : s === '2' ? 'bottom_mid_left' : s === '3' ? 'bottom_center' : s === '4' ? 'bottom_mid_right' : 'bottom_right';
            } else if (isLeft) {
                const s = getSeg(yPct, b.centerY, b.cornerSize);
                activeZone = s === '1' ? 'top_left' : s === '2' ? 'left_mid_top' : s === '3' ? 'middle_left' : s === '4' ? 'left_mid_bottom' : 'bottom_left';
            } else if (isRight) {
                const s = getSeg(yPct, b.centerY, b.cornerSize);
                activeZone = s === '1' ? 'top_right' : s === '2' ? 'right_mid_top' : s === '3' ? 'middle_right' : s === '4' ? 'right_mid_bottom' : 'bottom_right';
            }

            if (activeZone !== currentDwellZone) {
                currentDwellZone = activeZone;
                const mainAppWindow = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
                if (mainAppWindow && !mainAppWindow.isDestroyed()) {
                    mainAppWindow.webContents.send('hot-corner-hover', currentDwellZone);
                }
            }
        }, 50);
    });

    ipcMain.on('stop-hot-corners', () => {
        if (hotCornerInterval) {
            clearInterval(hotCornerInterval);
            hotCornerInterval = null;
            currentDwellZone = null;
        }
    });

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

    ipcMain.on('preview-radial-hud', (event, isPreview) => {
        global.isPreviewingRadial = isPreview;
        if (isPreview) {
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.destroy();
                global.radialHudWindow = null;
            }
            global.createRadialWindow();
            global.radialHudWindow.showInactive();
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
            global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
            global.radialHudWindow.moveTop();
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: true });
        } else {
            if (!global.isLiveInterviewMode && global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.hide();
            }
        }
    });

    ipcMain.on('set-ghost-dot', (event, isVisible) => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('set-ghost-dot', isVisible);
        }
    });

    ipcMain.removeAllListeners('rebuild-radial-hud');
    ipcMain.on('rebuild-radial-hud', () => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.destroy();
            global.radialHudWindow = null;
        }
        if (global.isLiveInterviewMode || global.isPreviewingRadial) {
            global.createRadialWindow();
            global.radialHudWindow.showInactive();
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
            global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
            global.radialHudWindow.moveTop();
            global.radialHudWindow.webContents.send('update-hud', { 
                slice: null, 
                labels: global.activeRadialLabels, 
                isActive: global.isPreviewingRadial 
            });
        }
    });

    ipcMain.on('live-resize-main-window', (event, { width, height }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const safeWidth = Math.max(600, width);
            const safeHeight = Math.max(400, height);
            mainWindow.setResizable(true);
            mainWindow.setSize(safeWidth, safeHeight);
            const primaryDisplay = screen.getPrimaryDisplay();
            const screenWidth = primaryDisplay.workAreaSize.width;
            const x = Math.floor((screenWidth - safeWidth) / 2);
            mainWindow.setPosition(x, 0);
            mainWindow.setResizable(false);
        }
    });

    ipcMain.on('toggle-radial-permanent', (event, isVisible) => {
        global.isLiveInterviewMode = isVisible;
        if (isVisible) {
            global.createRadialWindow();

            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.showInactive();
                global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
                global.radialHudWindow.moveTop();
                global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
            }

            if (!bgmiTrackerProcess) {
                const { spawn } = require('child_process');
                const psScript = [
                    '$code = @"', 'using System;', 'using System.Runtime.InteropServices;',
                    'public class KeyH { [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey); }', '"@',
                    'Add-Type -TypeDefinition $code', '$ctrlDown = $false',
                    'while ($true) {',
                    '    $state = [KeyH]::GetAsyncKeyState(0x11)',
                    '    $isDown = ($state -band 0x8000) -ne 0',
                    '    if ($isDown -ne $ctrlDown) {',
                    '        $ctrlDown = $isDown',
                    '        if ($isDown) { [Console]::WriteLine("CTRL_DOWN"); [Console]::Out.Flush() }',
                    '        else { [Console]::WriteLine("CTRL_UP"); [Console]::Out.Flush() }',
                    '    }',
                    '    Start-Sleep -Milliseconds 15',
                    '}'
                ].join('\n');
                const scriptPath = path.join(app.getPath('userData'), 'cph_radial_tracker.ps1');
                fs.writeFileSync(scriptPath, psScript);

                bgmiTrackerProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath]);

                bgmiTrackerProcess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (let output of lines) {
                        output = output.trim();
                        if (output === 'CTRL_DOWN') {
                            if (global.isGhostHidden) continue;
                            if (global.ctrlHoldTimer) clearTimeout(global.ctrlHoldTimer);

                            const prefs = require('./storage').getPreferences();
                            const rs = prefs.radialSettings || {};
                            const holdDelayMs = rs.holdDelay ?? 2000;

                            global.ctrlHoldTimer = setTimeout(() => {
                                global.isRadialModeActive = true;
                                const point = screen.getCursorScreenPoint();
                                radialAnchorX = point.x;
                                radialAnchorY = point.y;
                                currentRadialSlice = null;

                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
                                    global.radialHudWindow.moveTop();
                                    global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: true, ghostMode: false });
                                }

                                if (radialTelemetryLoop) clearInterval(radialTelemetryLoop);
                                radialTelemetryLoop = setInterval(() => {
                                    const p = screen.getCursorScreenPoint();
                                    const dx = p.x - radialAnchorX;
                                    const dy = p.y - radialAnchorY;
                                    const dist = Math.sqrt(dx*dx + dy*dy);

                                    if (dist > DEADZONE_PX) {
                                        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                        angle = angle + 90; 
                                        if (angle < 0) angle += 360;
                                        currentRadialSlice = Math.floor(((angle + 11.25) % 360) / 22.5);
                                    } else {
                                        currentRadialSlice = null; 
                                    }

                                    if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                        global.radialHudWindow.webContents.send('update-hud', { slice: currentRadialSlice, labels: global.activeRadialLabels, isActive: true, ghostMode: false });
                                    }

                                    const mainAppWindow = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
                                    if (mainAppWindow && !mainAppWindow.isDestroyed() && currentRadialSlice !== null) {
                                        mainAppWindow.webContents.send('radial-continuous-hold', currentRadialSlice);
                                    }
                                }, 30);
                            }, holdDelayMs);
                        }

                        if (output === 'CTRL_UP') {
                            if (global.ctrlHoldTimer) { clearTimeout(global.ctrlHoldTimer); global.ctrlHoldTimer = null; }
                            if (global.isGhostHidden) continue;

                            if (global.isRadialModeActive) {
                                if (radialTelemetryLoop) { clearInterval(radialTelemetryLoop); radialTelemetryLoop = null; }

                                const mainAppWindow = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
                                if (currentRadialSlice !== null && mainAppWindow && !mainAppWindow.isDestroyed()) {
                                    mainAppWindow.webContents.send('execute-radial-hud', currentRadialSlice);
                                }

                                currentRadialSlice = null;
                                global.isRadialModeActive = false;

                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
                                }
                            }
                        }
                    }
                });
            }
        } else {
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.hide();
            if (bgmiTrackerProcess) { bgmiTrackerProcess.kill(); bgmiTrackerProcess = null; }
            if (radialTelemetryLoop) { clearInterval(radialTelemetryLoop); radialTelemetryLoop = null; }
        }
    });

    ipcMain.on('set-oa-mode', (event, isActive) => {
        global.isOAModeActive = isActive;
        if (isActive) global.isClickThroughState = true;
    });

    ipcMain.removeAllListeners('set-ignore-mouse-events');
    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        global.isClickThroughState = ignore;
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setIgnoreMouseEvents(ignore, { forward: true });
            win.webContents.send('ghost-state-changed', ignore);
        }
    });

    ipcMain.handle('window-minimize', () => { if (!mainWindow.isDestroyed()) mainWindow.minimize(); });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) { updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef); }
    });

    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) return { success: false, error: 'Window has been destroyed' };
            if (mainWindow.isVisible()) mainWindow.hide();
            else mainWindow.showInactive();
            return { success: true };
        } catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('update-sizes', async event => { return { success: true }; });

    ipcMain.on('open-companion-window', (event, data) => {
        if (typeof companionChatWindow === 'undefined' || !companionChatWindow || companionChatWindow.isDestroyed()) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            const windowWidth = 340; 
            
            companionChatWindow = new BrowserWindow({
                width: windowWidth, height: height, frame: false, transparent: true, alwaysOnTop: true, hasShadow: false, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            companionChatWindow.setContentProtection(true);
            
            const htmlContent = `
                <html>
                <head>
                    <script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script>
                    <style>
                        body { margin:0; padding:12px; background:rgba(20,20,20,0.8); color:white; font-family:'Inter', -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; border-left:1px solid #444; }
                        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                        .msg-box { background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-wrap: break-word; }
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
                            div.style.borderLeft = '2px solid ' + (d.name.includes('You') ? '#00cc66' : '#a142f4');
                            div.innerHTML = '<strong style="color:' + (d.name.includes('You') ? '#00cc66' : '#a142f4') + '; display:block; margin-bottom:4px;">' + d.name + '</strong>' + marked.parse(d.message);
                            document.getElementById('msgs').appendChild(div);
                            document.getElementById('msgs').scrollTop = document.getElementById('msgs').scrollHeight;
                        });
                        require('electron').ipcRenderer.on('sync-opacity', (e, opacity) => { document.body.style.background = \`rgba(20,20,20,\${opacity})\`; });
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

    ipcMain.on('relay-companion-chat', (event, data) => {
        if (!companionChatWindow || companionChatWindow.isDestroyed()) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            companionChatWindow = new BrowserWindow({
                width: 340, height: height, alwaysOnTop: true, frame: false, transparent: true, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            companionChatWindow.setContentProtection(true);
            const htmlContent = `<html><head><script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script><style>body { margin:0; padding:12px; background:rgba(20,20,20,0.8); color:white; font-family:'Inter', -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; border-left:1px solid #444; } .msg-box { background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-wrap: break-word; }</style></head><body><div style="-webkit-app-region:drag; font-size:12px; font-weight:bold; color:#888; margin-bottom:10px; display:flex; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid #333;"><span>Whisper Log</span><span style="-webkit-app-region:no-drag; cursor: default !important; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span></div><div id="msgs" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;"></div><script>require('electron').ipcRenderer.on('new-msg', (e, d) => { const div = document.createElement('div'); div.className = 'msg-box'; div.style.borderLeft = '2px solid ' + (d.name.includes('You') ? '#00cc66' : '#a142f4'); div.innerHTML = '<strong style="color:' + (d.name.includes('You') ? '#00cc66' : '#a142f4') + '; display:block; margin-bottom:4px;">' + d.name + '</strong>' + marked.parse(d.message); document.getElementById('msgs').appendChild(div); document.getElementById('msgs').scrollTop = document.getElementById('msgs').scrollHeight; }); require('electron').ipcRenderer.on('sync-opacity', (e, opacity) => { document.body.style.background = \`rgba(20,20,20,\${opacity})\`; });</script></body></html>`;
            companionChatWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            companionChatWindow.setPosition(width - 340, 0);
        }
        setTimeout(() => { if (companionChatWindow && !companionChatWindow.isDestroyed()) { companionChatWindow.webContents.send('new-msg', data); companionChatWindow.showInactive(); } }, 300);
    });

    ipcMain.on('close-companion-chat', () => { if (companionChatWindow && !companionChatWindow.isDestroyed()) { companionChatWindow.close(); companionChatWindow = null; } });
    ipcMain.handle('hide-companion-chat', () => { if (companionChatWindow && !companionChatWindow.isDestroyed()) companionChatWindow.hide(); });
}

module.exports = { createWindow, getDefaultKeybinds, updateGlobalShortcuts, setupWindowIpcHandlers, getCompanionWindow: () => companionChatWindow };