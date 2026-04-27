if (require('electron-squirrel-startup')) process.exit(0);

const PROMPTS = {
    OA_AUTOMATION: (language) => `Output ONLY functional code in ${language || 'c++'}. CRITICAL RULES:\n- Do NOT output any greetings, explanations, or comments.\n- Use single letter variable names.\n- Give me code with a main function so that I can run locally.\n- Don't change the function signature given in the image. See function signature and test cases from the image.\n- Give me test cases to be put in cph extension of vs code (only those test cases which are visible in the image) like this:\ntest case1\ninput\nexpected output\n- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,
    REFACTOR: `Refactor the above code. Output ONLY functional code. CRITICAL RULES:\n- Do NOT output any greetings, explanations, or comments.\n- If the original code uses a for loop, see if a while loop or a higher-order function (like map or filter) fits better.\n- Break large functions into smaller helper functions.\n- If specific independent tasks happen in a sequence, change the order of initialization if it doesn't affect the output.\n- Structurally invert nested if statements by checking for invalid conditions and returning early.\n- Replace long switch statements or if-else chains with a Map (Dictionary) or Array lookup.\n- Algorithms often iterate forward (0 to N). Change this to backward iteration (N to 0) or use recursion.\n- Extract complex conditions into variables with semantic names.\n- Do not use classes.\n- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,
    FIX_ERROR: `Look at the code written by me in the code editor of the screenshot attached and see the compiler error or wrong answer present. CRITICAL RULES:\n- Output ONLY the fully corrected functional code.\n- Do NOT output any greetings, general explanations, or extra text.\n- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,
    VOICE_CONTEXT: `Read the attached problem or code. Do NOT output the solution or read it out loud. Just ingest the context silently. Be prepared to answer verbal questions about its logic, approach, or time complexity if I ask you through the microphone. Reply with a short confirmation that you understand.`
};

const { app, BrowserWindow, shell, ipcMain, session, desktopCapturer, clipboard, nativeImage, dialog, screen } = require('electron');

dialog.showErrorBox = function(title, content) { console.log(`[SILENT ERROR] ${title}: ${content}`); };
process.on('uncaughtException', (error) => { console.error('[CRASH PREVENTED]:', error); });
process.on('unhandledRejection', (reason, promise) => { console.error('[CRASH PREVENTED]:', reason); });

app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'Autofill,AutofillServerCommunication');

const { createWindow, updateGlobalShortcuts } = require('./windowManager'); 
const storage = require('./storage'); 
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow = null;
let voiceWebWindow = null;
let codeWebWindow = null;
let companionChatWindow = null;
let currentBrainMode = 'fast';
let activeLoadout = { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };
let accumulatedScreenshots = [];
let scrapingInterval = null;
let isAppQuitting = false;
let wasAiVisibleBeforeGhost = false;

global.radialHudWindow = null; 
global.activeRadialLabels = Array(16).fill('—');
global.isOAModeActive = false;

const AI_CONFIGS = [
    { name: 'ChatGPT', url: 'https://chatgpt.com', msgSelector: 'div[data-message-author-role="assistant"]' },
    { name: 'Gemini', url: 'https://gemini.google.com/app', msgSelector: 'model-response' },
    { name: 'Grok', url: 'https://grok.com', msgSelector: '.prose' }
];

global.createRadialWindow = () => {
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

        // 🟢 ABSOLUTE TOP LAYER
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

function launchDualBrains() {
    const prefs = storage.getPreferences();
    const loadouts = prefs.dualBrainLoadouts || [];
    activeLoadout = loadouts.find(l => l.id === (prefs.activeLoadoutId || 'loadout_1')) || 
                    { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };

    const voiceProvider = AI_CONFIGS[activeLoadout.voiceEngine];
    const codeProvider = AI_CONFIGS[activeLoadout.codeEngine];

    if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.destroy();
    voiceWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `🗣️ Voice Brain: ${voiceProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.voiceProfileId}` }
    });
    voiceWebWindow.setContentProtection(true);
    voiceWebWindow.webContents.setAudioMuted(true);

    // 🟢 TUCK AI UNDER OVERLAY
    if (process.platform === 'win32') voiceWebWindow.setAlwaysOnTop(true, 'floating', 1);
    voiceWebWindow.loadURL(voiceProvider.url);
    
    voiceWebWindow.webContents.on('dom-ready', async () => {
        voiceWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen'] });
            if (!sources || sources.length === 0) return;
            const screenSourceId = sources[0].id;
            const hijackScript = `
                if (!window.__micHijacked) {
                    window.__micHijacked = true;
                    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                    navigator.mediaDevices.getUserMedia = async (constraints) => {
                        if (constraints && constraints.audio) {
                            try {
                                const stream = await originalGetUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } }, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: '${screenSourceId}' } } });
                                const audioTrack = stream.getAudioTracks()[0];
                                const videoTrack = stream.getVideoTracks()[0];
                                if (videoTrack) videoTrack.stop();
                                return new MediaStream([audioTrack]);
                            } catch (e) {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                return ctx.createMediaStreamDestination().stream; 
                            }
                        }
                        return originalGetUserMedia(constraints);
                    };
                }
                true;
            `;
            await voiceWebWindow.webContents.executeJavaScript(hijackScript);
        } catch (err) { }
    });

    if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.destroy();
    codeWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `💻 Code Brain: ${codeProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.codeProfileId}` }
    });
    codeWebWindow.setContentProtection(true);
    codeWebWindow.webContents.setAudioMuted(true);

    // 🟢 TUCK AI UNDER OVERLAY
    if (process.platform === 'win32') codeWebWindow.setAlwaysOnTop(true, 'floating', 1);
    codeWebWindow.loadURL(codeProvider.url);
    codeWebWindow.webContents.on('dom-ready', async () => {
        codeWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        await codeWebWindow.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked")); true;`).catch(() => {});
    });

    const preventDeath = (win) => {
        win.on('close', (event) => { if (!isAppQuitting) { event.preventDefault(); win.hide(); } });
        win.on('focus', () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
                global.radialHudWindow.moveTop();
            }
        });
    };
    preventDeath(voiceWebWindow);
    preventDeath(codeWebWindow);

    startDualScrapers(voiceProvider, codeProvider);
}

function startDualScrapers(voiceProvider, codeProvider) {
    if (scrapingInterval) clearInterval(scrapingInterval);
    let lastVoiceMsg = { count: 0, text: "" }, lastCodeMsg = { count: 0, text: "" }, lastMicState = null;

    scrapingInterval = setInterval(async () => {
        const scrape = async (win, provider) => {
            if (!win || win.isDestroyed()) return null;
            return await win.webContents.executeJavaScript(`
                (() => {
                    try {
                        const msgs = Array.from(document.querySelectorAll('${provider.msgSelector}')).filter(el => {
                            if (el.closest('[data-testid="user-message"]') || el.closest('[data-message-author-role="user"]') || el.closest('.user-message')) return false;
                            return (el.innerText || el.textContent || '').trim().length > 0;
                        });
                        if (msgs.length === 0) return null;
                        return { count: msgs.length, text: (msgs[msgs.length - 1].innerText || msgs[msgs.length - 1].textContent || '').trim() };
                    } catch(e) { return null; }
                })();
            `);
        };

        const vData = await scrape(voiceWebWindow, voiceProvider).catch(() => null);
        if (vData) {
            if (vData.count > lastVoiceMsg.count) BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('voice-new-message', vData.text); });
            else if (vData.count === lastVoiceMsg.count && vData.text !== lastVoiceMsg.text) BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('voice-update-message', vData.text); });
            lastVoiceMsg = vData;
        }

        const cData = await scrape(codeWebWindow, codeProvider).catch(() => null);
        if (cData) {
            if (cData.count > lastCodeMsg.count) BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-new-message', cData.text); });
            else if (cData.count === lastCodeMsg.count && cData.text !== lastCodeMsg.text) BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-update-message', cData.text); });
            lastCodeMsg = cData;
        }

        if (voiceWebWindow && !voiceWebWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
            const spyScript = `
                (function() {
                    try {
                        var btns = Array.from(document.querySelectorAll('button, div[role="button"]')); 
                        var activeBtn = btns.find(function(b) { 
                            var txt = (b.textContent || '').trim().toLowerCase(); 
                            var aria = (b.getAttribute('aria-label') || '').toLowerCase(); 
                            var testid = (b.getAttribute('data-testid') || '').toLowerCase(); 
                            return txt === 'stop' || txt === 'end' || txt.includes('end call') || aria.includes('stop') || aria.includes('end') || testid.includes('end') || testid.includes('stop'); 
                        });
                        return !!activeBtn;
                    } catch(e) { return false; }
                })();
            `;
            voiceWebWindow.webContents.executeJavaScript(spyScript).then((isMicActive) => {
                if (isMicActive !== lastMicState) {
                    lastMicState = isMicActive;
                    BrowserWindow.getAllWindows().forEach(w => {
                        if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) { w.webContents.send('sync-mic-state', !!isMicActive); }
                    });
                }
            }).catch(() => { });
        }
    }, 1000);
}

async function sendPayloadToWindow(win, customText, images = []) {
    if (!win || win.isDestroyed()) return;
    const isBoxReady = await win.webContents.executeJavaScript(`(() => { try { const el = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); if (el && el.offsetParent !== null) { el.focus(); return true; } return false; } catch(e) { return false; } })()`);
    if (!isBoxReady) return;
    
    for (let imgData of images) {
        const img = nativeImage.createFromDataURL(imgData);
        clipboard.writeImage(img);
        win.webContents.paste();
        await new Promise(r => setTimeout(r, 400));
    }
    if (customText) { clipboard.writeText(customText); win.webContents.paste(); }

    const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
    let isReady = false, attempts = 0;
    while (!isReady && attempts < 40) {
        isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
        if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
    }
    
    await new Promise(r => setTimeout(r, 200));
    await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) btn.click(); return true; } catch(e) { return false; } })()`);
    setTimeout(() => { if (!win.isDestroyed()) win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); }, 200);
}

app.whenReady().then(async () => {
    app.on('session-created', (sess) => {
        sess.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
        sess.setPermissionCheckHandler(() => true);
        sess.setDisplayMediaRequestHandler((request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => { callback({ video: sources[0], audio: 'loopback' }); });
        }, { useSystemPicker: false });
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then(sources => { callback({ video: sources[0], audio: 'loopback' }); });
    }, { useSystemPicker: false });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    storage.initializeStorage();
    mainWindow = createWindow(); // Initialize main UI Window

    mainWindow.on('hide', () => {
        if (voiceWebWindow && !voiceWebWindow.isDestroyed() && voiceWebWindow.isVisible()) voiceWebWindow.hide();
        if (codeWebWindow && !codeWebWindow.isDestroyed() && codeWebWindow.isVisible()) codeWebWindow.hide();
    });

    mainWindow.on('show', () => {
        let m = mainWindow; m.focus(); m.setOpacity(0.99);
        setTimeout(() => { m.setOpacity(1); }, 50);
        if (m.webContents) m.webContents.send('app-made-visible');
    });

    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();
    launchDualBrains(); 
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { isAppQuitting = true; });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(); });

function setupStorageIpcHandlers() {
    ipcMain.handle('storage:get-config', async () => { return { success: true, data: storage.getConfig() }; });
    ipcMain.handle('storage:set-config', async (event, config) => { storage.setConfig(config); return { success: true }; });
    ipcMain.handle('storage:update-config', async (event, key, value) => { storage.updateConfig(key, value); return { success: true }; });
    ipcMain.handle('storage:get-credentials', async () => { return { success: true, data: storage.getCredentials() }; });
    ipcMain.handle('storage:set-credentials', async (event, credentials) => { storage.setCredentials(credentials); return { success: true }; });
    ipcMain.handle('storage:get-preferences', async () => { return { success: true, data: storage.getPreferences() }; });
    ipcMain.handle('storage:set-preferences', async (event, preferences) => { storage.setPreferences(preferences); return { success: true }; });
    ipcMain.handle('storage:update-preference', async (event, key, value) => { storage.updatePreference(key, value); return { success: true }; });
    ipcMain.handle('storage:get-keybinds', async () => { return { success: true, data: storage.getKeybinds() }; });
    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => { storage.setKeybinds(keybinds); return { success: true }; });
    ipcMain.handle('storage:get-all-sessions', async () => { return { success: true, data: storage.getAllSessions() }; });
    ipcMain.handle('storage:get-session', async (event, sessionId) => { return { success: true, data: storage.getSession(sessionId) }; });
    ipcMain.handle('storage:save-session', async (event, sessionId, data) => { storage.saveSession(sessionId, data); return { success: true }; });
    ipcMain.handle('storage:delete-session', async (event, sessionId) => { storage.deleteSession(sessionId); return { success: true }; });
    ipcMain.handle('storage:delete-all-sessions', async () => { storage.deleteAllSessions(); return { success: true }; });
    ipcMain.handle('storage:get-today-limits', async () => { return { success: true, data: storage.getTodayLimits() }; });
    ipcMain.handle('storage:clear-all', async () => {
        storage.clearAllData();
        await session.defaultSession.clearStorageData();
        for (let i = 1; i <= 20; i++) { const part = session.fromPartition(`persist:ai_profile_${i}`); await part.clearStorageData(); }
        return { success: true };
    });
}

function setupGeneralIpcHandlers() {
    let hotCornerInterval = null;
    let currentDwellZone = null;
    let bgmiTrackerProcess = null;
    let radialTelemetryLoop = null;
    let radialAnchorX = 0;
    let radialAnchorY = 0;
    let currentRadialSlice = null;
    const DEADZONE_PX = 25; 

    ipcMain.handle('open-login-window', async (event, profileId, aiIndex) => {
        const provider = AI_CONFIGS[aiIndex];
        const partitionId = `persist:ai_profile_${profileId}`;
        return new Promise((resolve) => {
            const loginWin = new BrowserWindow({ width: 1000, height: 800, show: true, autoHideMenuBar: true, title: `Login to ${provider.name}`, webPreferences: { nodeIntegration: false, contextIsolation: true, partition: partitionId } });
            loginWin.loadURL(provider.url); loginWin.on('closed', () => { resolve(true); });
        });
    });

    ipcMain.handle('get-app-version', async () => { return app.getVersion(); });

    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant') {
            global.currentSessionMode = 'main';
            global.isLiveInterviewMode = false;
            global.isGhostHidden = false;
            global.isClickThroughState = false; 

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setOpacity(1);
                mainWindow.setIgnoreMouseEvents(false);
                mainWindow.webContents.send('ghost-state-changed', false);
            }
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                voiceWebWindow.hide(); voiceWebWindow.setOpacity(1); voiceWebWindow.setIgnoreMouseEvents(false);
            }
            if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                codeWebWindow.hide(); codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
            }
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.hide();
        }
    });

    ipcMain.handle('quit-application', async event => { try { app.quit(); return { success: true }; } catch (error) { return { success: false }; } });
    ipcMain.handle('open-external', async (event, url) => { try { await shell.openExternal(url); return { success: true }; } catch (error) { return { success: false }; } });

    ipcMain.on('start-hot-corners', (event, bounds) => {
        if (hotCornerInterval) return;
        const b = bounds || { cornerSize: 15, centerX: 40, centerY: 40 };

        hotCornerInterval = setInterval(() => {
            const point = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(point);
            if (!display) return;

            const { x: dx, y: dy, width: w, height: h } = display.bounds;
            const x = point.x - dx;
            const y = point.y - dy;
            
            const edge = 35; // Tolerance
            let isTop = y <= edge; let isBottom = y >= h - edge; let isLeft = x <= edge; let isRight = x >= w - edge;
            const xPct = (x / w) * 100; const yPct = (y / h) * 100;

            const getSeg = (pct, centerSize, cornerSize) => {
                if (pct <= cornerSize) return '1'; if (pct >= 100 - cornerSize) return '5'; 
                const midStart = 50 - (centerSize / 2); const midEnd = 50 + (centerSize / 2);
                if (pct >= midStart && pct <= midEnd) return '3'; if (pct > cornerSize && pct < midStart) return '2'; return '4'; 
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
                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('hot-corner-hover', currentDwellZone);
            }
        }, 50);
    });

    ipcMain.on('stop-hot-corners', () => {
        if (hotCornerInterval) { clearInterval(hotCornerInterval); hotCornerInterval = null; currentDwellZone = null; }
    });

    ipcMain.on('sync-radial-labels', (event, labels) => {
        global.activeRadialLabels = labels || Array(16).fill('—');
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: global.isRadialModeActive || false });
        }
    });

    ipcMain.on('preview-radial-hud', (event, isPreview) => {
        global.isPreviewingRadial = isPreview;
        if (isPreview) {
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) { global.radialHudWindow.destroy(); global.radialHudWindow = null; }
            global.createRadialWindow();
            global.radialHudWindow.showInactive();
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: true });
        } else {
            if (!global.isLiveInterviewMode && global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.hide();
        }
    });

    ipcMain.on('set-ghost-dot', (event, isVisible) => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) global.radialHudWindow.webContents.send('set-ghost-dot', isVisible);
    });

    ipcMain.removeAllListeners('rebuild-radial-hud');
    ipcMain.on('rebuild-radial-hud', () => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) { global.radialHudWindow.destroy(); global.radialHudWindow = null; }
        if (global.isLiveInterviewMode || global.isPreviewingRadial) {
            global.createRadialWindow();
            global.radialHudWindow.showInactive();
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
            global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
            global.radialHudWindow.moveTop();
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: global.isPreviewingRadial });
        }
    });

    ipcMain.on('live-resize-main-window', (event, { width, height }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const safeWidth = Math.max(600, width); const safeHeight = Math.max(400, height);
            mainWindow.setResizable(true); mainWindow.setSize(safeWidth, safeHeight);
            const primaryDisplay = screen.getPrimaryDisplay();
            mainWindow.setPosition(Math.floor((primaryDisplay.workAreaSize.width - safeWidth) / 2), 0);
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

                let psBuffer = "";
                bgmiTrackerProcess.stdout.on('data', (data) => {
                    psBuffer += data.toString();
                    
                    if (psBuffer.includes('CTRL_DOWN')) {
                        psBuffer = psBuffer.replace(/CTRL_DOWN/g, ''); // Clear the buffer of the command

                        if (global.isGhostHidden) return;
                        if (global.ctrlHoldTimer) clearTimeout(global.ctrlHoldTimer);

                        const prefs = storage.getPreferences();
                        const rs = prefs.radialSettings || {};
                        const holdDelayMs = rs.holdDelay ?? 2000;

                        global.ctrlHoldTimer = setTimeout(() => {
                            global.isRadialModeActive = true;
                            const { screen } = require('electron');
                            const point = screen.getCursorScreenPoint();
                            radialAnchorX = point.x; radialAnchorY = point.y;
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
                                const dx = p.x - radialAnchorX; const dy = p.y - radialAnchorY;
                                const dist = Math.sqrt(dx*dx + dy*dy);

                                if (dist > DEADZONE_PX) {
                                    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                    angle = angle + 90; if (angle < 0) angle += 360;
                                    currentRadialSlice = Math.floor(((angle + 11.25) % 360) / 22.5);
                                } else { currentRadialSlice = null; }

                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    global.radialHudWindow.webContents.send('update-hud', { slice: currentRadialSlice, labels: global.activeRadialLabels, isActive: true, ghostMode: false });
                                }

                                if (mainWindow && !mainWindow.isDestroyed() && currentRadialSlice !== null) {
                                    mainWindow.webContents.send('radial-continuous-hold', currentRadialSlice);
                                }
                            }, 30);
                        }, holdDelayMs);
                    }

                    if (psBuffer.includes('CTRL_UP')) {
                        psBuffer = psBuffer.replace(/CTRL_UP/g, ''); // Clear the buffer of the command

                        if (global.ctrlHoldTimer) { clearTimeout(global.ctrlHoldTimer); global.ctrlHoldTimer = null; }
                        
                        if (global.isRadialModeActive) {
                            if (radialTelemetryLoop) { clearInterval(radialTelemetryLoop); radialTelemetryLoop = null; }

                            if (currentRadialSlice !== null && mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.webContents.send('execute-radial-hud', currentRadialSlice);
                            }

                            currentRadialSlice = null;
                            global.isRadialModeActive = false;

                            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
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

    ipcMain.handle('capture-screenshot', async () => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
            const screenImage = sources[0].thumbnail.toDataURL(); 
            const saveDir = 'D:/Files';
            if (!fs.existsSync(saveDir)) { fs.mkdirSync(saveDir, { recursive: true }); }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            const base64Data = screenImage.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(filePath, base64Data, 'base64');
            accumulatedScreenshots.push(screenImage);
            return accumulatedScreenshots.length;
        } catch (err) { return accumulatedScreenshots.length; }
    });

    ipcMain.handle('clear-screenshots', async () => { accumulatedScreenshots = []; return 0; });
    ipcMain.handle('get-screenshots', async () => { return accumulatedScreenshots; });

    ipcMain.handle('send-screenshots-to-ai', async (event, customPrompt) => {
        try {
            if (accumulatedScreenshots.length === 0) return false;
            const codePrompt = customPrompt || PROMPTS.OA_AUTOMATION('C++');
            const voicePrompt = PROMPTS.VOICE_CONTEXT;
            await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots); accumulatedScreenshots = []; }, 1500);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('new-chat', async () => {
        try {
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.loadURL(AI_CONFIGS[activeLoadout.voiceEngine].url);
            if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.loadURL(AI_CONFIGS[activeLoadout.codeEngine].url);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.on('set-session-mode', (event, mode) => { global.currentSessionMode = mode; });

    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) return false;
        const script = `
            (function() {
                try { 
                    var btns = Array.from(document.querySelectorAll('button, div[role="button"]')); 
                    var isTurnOn = ${isTurningOn};
                    if (isTurnOn) {
                        var stopBtn = btns.find(b => {
                            var t = (b.textContent||'').toLowerCase(); var a = (b.getAttribute('aria-label')||'').toLowerCase(); var d = (b.getAttribute('data-testid')||'').toLowerCase();
                            return t === 'stop' || t === 'end' || t.includes('end call') || a.includes('stop') || a.includes('end') || d.includes('stop') || d.includes('end');
                        });
                        if (stopBtn) return true; 
                        
                        var startBtn = btns.find(b => {
                            var t = (b.textContent||'').toLowerCase(); var a = (b.getAttribute('aria-label')||'').toLowerCase(); var d = (b.getAttribute('data-testid')||'').toLowerCase();
                            return a.includes('voice') || a.includes('microphone') || d.includes('voice') || t.includes('start voice');
                        });
                        if (startBtn) { startBtn.click(); return true; }
                    } else {
                        var stopBtn = btns.find(b => {
                            var t = (b.textContent||'').toLowerCase(); var a = (b.getAttribute('aria-label')||'').toLowerCase(); var d = (b.getAttribute('data-testid')||'').toLowerCase();
                            return t === 'stop' || t === 'end' || t.includes('end call') || a.includes('stop') || a.includes('end') || d.includes('stop') || d.includes('end');
                        });
                        if (stopBtn) { stopBtn.click(); return true; }
                    }
                    return false;
                } catch(e) { return false; }
            })();
        `;
        try {
            const result = await Promise.race([
                voiceWebWindow.webContents.executeJavaScript(script),
                new Promise(r => setTimeout(() => r(false), 2000))
            ]);
            return result === true;
        } catch (err) { return false; }
    });

    ipcMain.handle('set-ai-provider', async (event, targetIdx) => { return AI_CONFIGS[targetIdx].name; });

    ipcMain.handle('check-active-ai', () => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) { return { name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: "" }; }
        return {name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: voiceWebWindow.webContents.getURL() };
    });

    ipcMain.handle('send-oa-automation', async (event, language) => {
        try {
            if (accumulatedScreenshots.length === 0) return false;
            const codePrompt = PROMPTS.OA_AUTOMATION(language);
            const voicePrompt = PROMPTS.VOICE_CONTEXT;
            await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots); accumulatedScreenshots = []; }, 1500);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-oa-refactor', async () => {
        try {
            await sendPayloadToWindow(codeWebWindow, PROMPTS.REFACTOR, []);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, PROMPTS.VOICE_CONTEXT, []); }, 1500);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        try {
            if (accumulatedScreenshots.length === 0) return false;
            await sendPayloadToWindow(codeWebWindow, PROMPTS.FIX_ERROR, accumulatedScreenshots);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, PROMPTS.VOICE_CONTEXT, accumulatedScreenshots); accumulatedScreenshots = []; }, 1500);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-oa-regenerate', async () => {
        try {
            const script = `(() => { try { const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').toLowerCase().includes('regenerate') || (b.getAttribute('aria-label')||'').toLowerCase().includes('regenerate')); if(btn) { btn.click(); return true; } return false; } catch(e) { return false; } })();`;
            if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.webContents.executeJavaScript(script).catch(()=>{});
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.webContents.executeJavaScript(script).catch(()=>{});
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        try { if (!text) return; await sendPayloadToWindow(voiceWebWindow, text, []); return true; } catch(e) { return false; }
    });

    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => { currentBrainMode = mode; return true; });
    ipcMain.handle('get-current-ai-mode', async () => { return currentBrainMode; });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        try { launchDualBrains(); return targetProfileId; } catch(e) { return false; }
    });

    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        try {
            if (!codeWebWindow) return false;
            const isVisible = codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0;
            const targetVisible = forceShow !== undefined ? forceShow : !isVisible;

            if (targetVisible) {
                const primaryDisplay = screen.getPrimaryDisplay();
                const { width, height } = primaryDisplay.workAreaSize;

                if (global.currentSessionMode === 'proctored_oa') {
                    const safeWidth = Math.max(800, Math.floor(width * 0.7));
                    const safeHeight = Math.max(600, Math.floor(height * 0.8));
                    const x = Math.floor((width - safeWidth) / 2);
                    const y = Math.floor((height - safeHeight) / 2);

                    if (!codeWebWindow.isDestroyed()) {
                        codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
                        codeWebWindow.setAlwaysOnTop(true, 'floating', 1);
                        codeWebWindow.setBounds({ x, y, width: safeWidth, height: safeHeight });
                        codeWebWindow.showInactive();
                    }
                    if (voiceWebWindow && !voiceWebWindow.isDestroyed()) { voiceWebWindow.hide(); }
                } else {
                    const halfWidth = Math.floor(width / 2);

                    if (!codeWebWindow.isDestroyed()) {
                        codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
                        codeWebWindow.setAlwaysOnTop(true, 'floating', 1);
                        codeWebWindow.setBounds({ x: 0, y: 0, width: halfWidth, height: height });
                        codeWebWindow.showInactive();
                    }
                    if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                        voiceWebWindow.setOpacity(1); voiceWebWindow.setIgnoreMouseEvents(false);
                        voiceWebWindow.setAlwaysOnTop(true, 'floating', 1);
                        voiceWebWindow.setBounds({ x: halfWidth, y: 0, width: halfWidth, height: height });
                        voiceWebWindow.showInactive();
                    }
                }

                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                    global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
                    global.radialHudWindow.moveTop();
                }
                return true;
            } else {
                if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.hide();
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.hide();
                return false;
            }
        } catch(e) { return false; }
    });

    ipcMain.handle('hide-all-overlays', () => {
        try {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) {
                    w.setOpacity(0); w.setIgnoreMouseEvents(true, { forward: true });
                }
            });

            if (voiceWebWindow && !voiceWebWindow.isDestroyed() && voiceWebWindow.isVisible()) {
                voiceWebWindow.setOpacity(0); voiceWebWindow.setIgnoreMouseEvents(true, { forward: true });
            }
            if (codeWebWindow && !codeWebWindow.isDestroyed() && codeWebWindow.isVisible()) {
                codeWebWindow.setOpacity(0); codeWebWindow.setIgnoreMouseEvents(true, { forward: true });
            }
            return true;
        } catch(e) { return false; }
    });

    global.toggleStealthMode = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            global.isGhostHidden = !global.isGhostHidden;

            if (global.isGhostHidden) {
                mainWindow.webContents.send('app-made-hidden');
                wasAiVisibleBeforeGhost = (voiceWebWindow && voiceWebWindow.isVisible() && voiceWebWindow.getOpacity() !== 0) || 
                                          (codeWebWindow && codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0);

                mainWindow.setOpacity(0); mainWindow.setIgnoreMouseEvents(true, { forward: true });
                
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) { voiceWebWindow.setOpacity(0); voiceWebWindow.setIgnoreMouseEvents(true, { forward: true }); }
                if (codeWebWindow && !codeWebWindow.isDestroyed()) { codeWebWindow.setOpacity(0); codeWebWindow.setIgnoreMouseEvents(true, { forward: true }); }
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) { global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: true }); }
            } else {
                mainWindow.webContents.send('app-made-visible');
                mainWindow.setOpacity(1); mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });
                
                if (wasAiVisibleBeforeGhost) {
                    if (voiceWebWindow && !voiceWebWindow.isDestroyed()) { voiceWebWindow.setOpacity(1); voiceWebWindow.setIgnoreMouseEvents(false); }
                    if (codeWebWindow && !codeWebWindow.isDestroyed()) { codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false); }
                }
                
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                    global.radialHudWindow.showInactive(); global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
                }

                if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                    setTimeout(() => { if (!global.radialHudWindow.isDestroyed()) { global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9); global.radialHudWindow.moveTop(); } }, 50);
                }
            }
        }
    };

    ipcMain.handle('trigger-ghost-hide', () => { try { global.toggleStealthMode(); return true; } catch(e) { return false; } });

    ipcMain.on('set-oa-mode', (event, isActive) => {
        global.isOAModeActive = isActive;
        if (isActive) global.isClickThroughState = true;
    });

    ipcMain.removeAllListeners('set-ignore-mouse-events');
    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        global.isClickThroughState = ignore;
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) { win.setIgnoreMouseEvents(ignore, { forward: true }); win.webContents.send('ghost-state-changed', ignore); }
    });

    let autoTyperProcess = null;
    ipcMain.on('start-auto-type', (event, rawCode, wpmSpeed, mistakeChance) => {
        if (mainWindow) mainWindow.webContents.send('typing-status', true);
        let cleanCode = rawCode.replace(/^(c\+\+|python|java|javascript|js)\s*\n/i, '');
        const b64Code = Buffer.from(cleanCode).toString('base64');
        const ps1Path = path.join(os.tmpdir(), 'cptyper.ps1');
        
        const psScript = `
        param([string]$b64, [int]$wpm, [int]$mistakeChance)
        Add-Type -AssemblyName System.Windows.Forms
        $text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
        $chars = $text.ToCharArray()
        $baseDelay = [math]::Round(12000 / $wpm)
        if ($baseDelay -lt 10) { $baseDelay = 10 }
        $lineIdx = 0
        [Console]::WriteLine("LINE_0")
        [Console]::Out.Flush()
        foreach ($c in $chars) {
            $key = $c.ToString()
            if ($key -eq "\`r") { continue }
            if ($key -eq "\`n") {
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                Start-Sleep -Milliseconds 50
                [System.Windows.Forms.SendKeys]::SendWait("x+{HOME}+{HOME}{BACKSPACE}")
                Start-Sleep -Milliseconds ($baseDelay * 2)
                $lineIdx++
                [Console]::WriteLine("LINE_$lineIdx")
                [Console]::Out.Flush()
                continue
            }
            if ('+^%~(){}[]'.Contains($key)) { $key = "{$key}" }
            if ($key -match '^[a-z]$') {
                if ((Get-Random -Minimum 1 -Maximum 100) -le $mistakeChance) {
                    $wrongChars = "abcdefghijklmnopqrstuvwxyz"
                    $wrong = $wrongChars[(Get-Random -Maximum 26)].ToString()
                    [System.Windows.Forms.SendKeys]::SendWait($wrong)
                    Start-Sleep -Milliseconds ($baseDelay + 50)
                    [System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
                    Start-Sleep -Milliseconds ($baseDelay + 50)
                }
            }
            [System.Windows.Forms.SendKeys]::SendWait($key)
            if ($c -eq '{' -or $c -eq '[' -or $c -eq '(' -or $c -eq '"' -or $c -eq "'") {
                Start-Sleep -Milliseconds 40
                [System.Windows.Forms.SendKeys]::SendWait("{DELETE}")
            }
            $variance = Get-Random -Minimum -10 -Maximum 10
            $delay = $baseDelay + $variance
            if ($delay -lt 10) { $delay = 10 }
            Start-Sleep -Milliseconds $delay
        }
        `;
        fs.writeFileSync(ps1Path, psScript);
        if (autoTyperProcess) { try { autoTyperProcess.kill(); } catch(e){} }
        autoTyperProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', ps1Path, b64Code, wpmSpeed, mistakeChance]);
        autoTyperProcess.stdout.on('data', (data) => {
            const lines = data.toString().split(/[\r\n]+/);
            lines.forEach(l => {
                if (l.startsWith('LINE_')) {
                    const idx = parseInt(l.replace('LINE_', ''));
                    if (!isNaN(idx) && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('typing-progress', idx);
                }
            });
        });
        autoTyperProcess.on('close', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('typing-status', false); });
    });

    ipcMain.on('stop-auto-type', () => {
        if (autoTyperProcess) { try { autoTyperProcess.kill(); } catch(e){} autoTyperProcess = null; }
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('typing-status', false);
    });

    ipcMain.handle('window-minimize', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); });
    ipcMain.on('update-keybinds', (event, newKeybinds) => { if (mainWindow && !mainWindow.isDestroyed()) updateGlobalShortcuts(newKeybinds, mainWindow); });
    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) return { success: false, error: 'Window has been destroyed' };
            if (mainWindow.isVisible()) mainWindow.hide(); else mainWindow.showInactive();
            return { success: true };
        } catch (error) { return { success: false, error: error.message }; }
    });
    ipcMain.handle('update-sizes', async event => { return { success: true }; });

    // Companion Chat
    let companionChatWindow = null;
    ipcMain.on('open-companion-window', (event, data) => {
        if (!companionChatWindow || companionChatWindow.isDestroyed()) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;
            companionChatWindow = new BrowserWindow({
                width: 340, height: height, frame: false, transparent: true, alwaysOnTop: true, hasShadow: false, skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            companionChatWindow.setContentProtection(true);
            const htmlContent = `<html><head><script src="https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js"></script><style>body { margin:0; padding:12px; background:rgba(20,20,20,0.8); color:white; font-family:'Inter', -apple-system, sans-serif; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; border-left:1px solid #444; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; } .msg-box { background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; line-height: 1.4; word-wrap: break-word; }</style></head><body><div style="-webkit-app-region:drag; font-size:12px; font-weight:bold; color:#00cc66; margin-bottom:10px; display:flex; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid #333;"><span>🟢 Linked with ${data.name}</span><span style="-webkit-app-region:no-drag; cursor: default !important; color:#f14c4c; font-size:14px;" onclick="require('electron').ipcRenderer.send('close-companion-chat')">X</span></div><div id="msgs" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;"></div><script>require('electron').ipcRenderer.on('new-msg', (e, d) => { const div = document.createElement('div'); div.className = 'msg-box'; div.style.borderLeft = '2px solid ' + (d.name.includes('You') ? '#00cc66' : '#a142f4'); div.innerHTML = '<strong style="color:' + (d.name.includes('You') ? '#00cc66' : '#a142f4') + '; display:block; margin-bottom:4px;">' + d.name + '</strong>' + marked.parse(d.message); document.getElementById('msgs').appendChild(div); document.getElementById('msgs').scrollTop = document.getElementById('msgs').scrollHeight; }); require('electron').ipcRenderer.on('sync-opacity', (e, opacity) => { document.body.style.background = \`rgba(20,20,20,\${opacity})\`; });</script></body></html>`;
            companionChatWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
            companionChatWindow.setPosition(width - 340, 0);
        }
        setTimeout(() => { if (companionChatWindow && !companionChatWindow.isDestroyed()) { companionChatWindow.webContents.send('new-msg', data); companionChatWindow.showInactive(); } }, 300);
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