if (require('electron-squirrel-startup')) {
    process.exit(0);
}

// const { app, BrowserWindow, shell, ipcMain, globalShortcut, session, desktopCapturer } = require('electron');
const { app, BrowserWindow, shell, ipcMain, globalShortcut, session, desktopCapturer, clipboard, nativeImage, dialog } = require('electron');

// 🛑 RED FLAG PREVENTION: Permanently mute all native OS error popups
dialog.showErrorBox = function(title, content) {
    console.log(`[SILENT ERROR BOX DUMPED] ${title}: ${content}`);
};
process.on('uncaughtException', (error) => {
    console.error('[SILENT CRASH PREVENTED] Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[SILENT CRASH PREVENTED] Unhandled Rejection:', reason);
});

// ==========================================================
// STEALTH RADIO: Bypass Chromium Audio/Mic Security Blocks
// ==========================================================
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const storage = require('./storage');
const fs = require('fs');
const path = require('path');
const os = require('os'); // 🐛 NEW: Needed for temp directory
const { spawn } = require('child_process'); // 🐛 NEW: Needed for the ghost typist
const PROMPTS = require('./utils/prompts');
let mainWindow = null;
let widgetWindow = null;
let voiceWebWindow = null;
let codeWebWindow = null;
let currentBrainMode = 'fast';
let activeLoadout = { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };
let accumulatedScreenshots = [];
let scrapingInterval = null;
let micSpyInterval = null;
let isAppQuitting = false;

// ==========================================================
// OA GLOBAL PROMPTS
// ==========================================================

// NEW: Universal AI Configurations
const AI_CONFIGS = [
    { name: 'ChatGPT', url: 'https://chatgpt.com', msgSelector: 'div[data-message-author-role="assistant"]' },
    { name: 'Gemini', url: 'https://gemini.google.com/app', msgSelector: 'model-response' },
    { name: 'Grok', url: 'https://grok.com', msgSelector: '.prose' }
];

function startUniversalAIBridge() {
    launchDualBrains();
}

function launchDualBrains() {
    const { BrowserWindow } = require('electron');
    const storage = require('./storage');
    const prefs = storage.getPreferences();
    const loadouts = prefs.dualBrainLoadouts || [];
    activeLoadout = loadouts.find(l => l.id === (prefs.activeLoadoutId || 'loadout_1')) || 
                    { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };

    const voiceProvider = AI_CONFIGS[activeLoadout.voiceEngine];
    const codeProvider = AI_CONFIGS[activeLoadout.codeEngine];

    // --- 🗣️ 1. VOICE BRAIN ---
    if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.destroy();
    voiceWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `🗣️ Voice Brain: ${voiceProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.voiceProfileId}` }
    });
    voiceWebWindow.setContentProtection(true);
    voiceWebWindow.webContents.setAudioMuted(true);

    if (process.platform === 'win32') voiceWebWindow.setAlwaysOnTop(true, 'screen-saver', 0);
    voiceWebWindow.loadURL(voiceProvider.url);
    
    // Voice WebRTC Injection (Keeps Mic Alive)
    // Voice WebRTC Injection (Keeps Mic Alive & Captures System Audio)
    voiceWebWindow.webContents.on('dom-ready', async () => {
        voiceWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        
        try {
            // Grab the native OS Screen ID from the backend
            const { desktopCapturer } = require('electron');
            const sources = await desktopCapturer.getSources({ types: ['screen'] });
            if (!sources || sources.length === 0) return;
            const screenSourceId = sources[0].id;

            // 🟢 THE WEBRTC HIJACK V3: Native Electron Loopback Bypass
            const hijackScript = `
                if (!window.__micHijacked) {
                    window.__micHijacked = true;
                    
                    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                    navigator.mediaDevices.getUserMedia = async (constraints) => {
                        if (constraints && constraints.audio) {
                            try {
                                console.log("🕵️‍♂️ Hardware Mic Blocked. Routing System Audio directly...");
                                
                                // Use Electron's native desktop source to bypass the "User Gesture" block!
                                const stream = await originalGetUserMedia({
                                    audio: { mandatory: { chromeMediaSource: 'desktop' } },
                                    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: '${screenSourceId}' } }
                                });
                                
                                const audioTrack = stream.getAudioTracks()[0];
                                const videoTrack = stream.getVideoTracks()[0];
                                if (videoTrack) videoTrack.stop(); // Destroy the video feed
                                
                                return new MediaStream([audioTrack]);
                            } catch (e) {
                                console.error('🔥 Loopback Hijack Failed:', e);
                                // 🛑 ABSOLUTE SECURITY OVERRIDE: 
                                // Return DEAD AIR. Mathematically guarantee the physical mic is never leaked!
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                const dest = ctx.createMediaStreamDestination();
                                return dest.stream; 
                            }
                        }
                        return originalGetUserMedia(constraints);
                    };
                }
                true;
            `;
            
            await voiceWebWindow.webContents.executeJavaScript(hijackScript);
        } catch (err) {
            console.error('Failed to inject WebRTC Hijack:', err);
        }
    });

    // --- 💻 2. CODE BRAIN ---
    if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.destroy();
    codeWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `💻 Code Brain: ${codeProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.codeProfileId}` }
    });
    codeWebWindow.setContentProtection(true);
    codeWebWindow.webContents.setAudioMuted(true); // 🟢 STRICTLY MUTED
    if (process.platform === 'win32') codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 0);
    codeWebWindow.loadURL(codeProvider.url);
    codeWebWindow.webContents.on('dom-ready', async () => {
        codeWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        // 🟢 HARD BLOCK MIC FOR CODE ENGINE
        await codeWebWindow.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked"));`);
    });

    // Prevent deaths
    const preventDeath = (win) => {
        win.on('close', (event) => {
            if (!isAppQuitting) { event.preventDefault(); win.hide(); }
        });
    };
    preventDeath(voiceWebWindow);
    preventDeath(codeWebWindow);

    startDualScrapers(voiceProvider, codeProvider);
}

function startDualScrapers(voiceProvider, codeProvider) {
    if (scrapingInterval) clearInterval(scrapingInterval);
    
    let lastVoiceMsg = { count: 0, text: "" };
    let lastCodeMsg = { count: 0, text: "" };
    let lastMicState = null; // 🟢 RESTORED: Track Mic Truth
    let lastVoiceTranscript = ''; // 🆕 Feature 6.5: Track last interviewer transcription

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

        // 🟢 VOICE BRAIN ROUTER (Splits "New" vs "Update")
        const vData = await scrape(voiceWebWindow, voiceProvider).catch(() => null);
        if (vData && typeof vData.text === 'string') {
            const safeVText = String(vData.text);
            if (vData.count > lastVoiceMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) try { w.webContents.send('voice-new-message', safeVText); } catch(e) {}
                });
            } else if (vData.count === lastVoiceMsg.count && safeVText !== lastVoiceMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) try { w.webContents.send('voice-update-message', safeVText); } catch(e) {}
                });
            }
            lastVoiceMsg = { count: vData.count, text: safeVText };
        }

        // 🟢 CODE BRAIN ROUTER (Splits "New" vs "Update")
        const cData = await scrape(codeWebWindow, codeProvider).catch(() => null);
        if (cData && typeof cData.text === 'string') {
            const safeCText = String(cData.text);
            if (cData.count > lastCodeMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) try { w.webContents.send('code-new-message', safeCText); } catch(e) {}
                });
            } else if (cData.count === lastCodeMsg.count && safeCText !== lastCodeMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) try { w.webContents.send('code-update-message', safeCText); } catch(e) {}
                });
            }
            lastCodeMsg = { count: cData.count, text: safeCText };
        }

        // 🟢 CONTINUOUS DOM MIC SPY
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
            
            voiceWebWindow.webContents.executeJavaScript(spyScript)
                .then((isMicActive) => {
                    if (isMicActive !== lastMicState) {
                        lastMicState = isMicActive;
                        BrowserWindow.getAllWindows().forEach(w => {
                            if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) {
                                w.webContents.send('sync-mic-state', !!isMicActive);
                            }
                        });
                    }
                })
                .catch(() => { /* Ignore errors silently */ });

            // 🆕 Feature 6.5: Scrape interviewer transcription (user-turn messages)
            const transcriptScript = `
                (function() {
                    try {
                        var userMsgs = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
                        if (userMsgs.length === 0) return '';
                        var lastMsg = userMsgs[userMsgs.length - 1];
                        return (lastMsg.innerText || lastMsg.textContent || '').trim().substring(0, 500);
                    } catch(e) { return ''; }
                })();
            `;
            voiceWebWindow.webContents.executeJavaScript(transcriptScript)
                .then((transcript) => {
                    if (typeof transcript === 'string' && transcript.length > 0 && transcript !== lastVoiceTranscript) {
                        lastVoiceTranscript = transcript;
                        BrowserWindow.getAllWindows().forEach(w => {
                            if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) {
                                try { w.webContents.send('voice-transcription-update', String(transcript)); } catch(e) {}
                            }
                        });
                    }
                })
                .catch(() => {});
        }
    }, 1000);
}

// 🟢 ASYNC DOM HELPER FOR SENDING MESSAGES (Crash-Proof)
async function sendPayloadToWindow(win, customText, images = []) {
    if (!win || win.isDestroyed()) return;
    const { clipboard, nativeImage } = require('electron');
    
    // 🟢 PREVENT REACT CRASH: Check if the textbox actually exists and is visible before pasting!
    const isBoxReady = await win.webContents.executeJavaScript(`(() => { 
        try {
            const el = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); 
            if (el && el.offsetParent !== null) { 
                el.focus(); 
                return true; 
            }
            return false;
        } catch(e) { return false; }
    })()`);
    
    if (!isBoxReady) {
        console.log("🛑 Aborted Paste: Textbox is hidden (AI is currently in Voice Mode).");
        return;
    }
    
    for (let imgData of images) {
        const img = nativeImage.createFromDataURL(imgData);
        clipboard.writeImage(img);
        win.webContents.paste();
        await new Promise(r => setTimeout(r, 400));
    }
    
    if (customText) {
        clipboard.writeText(customText);
        win.webContents.paste();
    }

    const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 40) {
        // 🟢 FIX: Strict boolean return prevents "Object cannot be cloned" IPC crashes
        isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
        if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
    }
    
    await new Promise(r => setTimeout(r, 200));
    await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) btn.click(); return true; } catch(e) { return false; } })()`);
    setTimeout(() => { if (!win.isDestroyed()) win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); }, 200);
}

function createMainWindow() {
    mainWindow = createWindow(null, null);

    mainWindow.on('hide', () => {
        if (voiceWebWindow && !voiceWebWindow.isDestroyed() && voiceWebWindow.isVisible()) voiceWebWindow.hide();
        if (codeWebWindow && !codeWebWindow.isDestroyed() && codeWebWindow.isVisible()) codeWebWindow.hide();
    });

    mainWindow.on('show', () => {
        let m = mainWindow;
        m.focus();
        m.setOpacity(0.99);
        setTimeout(() => { m.setOpacity(1); }, 50);
        if (m.webContents) {
            m.webContents.send('app-made-visible');
        }
    });
    return mainWindow;
}

// ==========================================================
// ⌨️ OA GHOST TYPIST ENGINE (V5: Live Highlighter Tracking)
// ==========================================================
let autoTyperProcess = null;

ipcMain.on('start-auto-type', (event, rawCode, wpmSpeed, mistakeChance) => {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', true));
    let cleanCode = rawCode.replace(/^(c\+\+|python|java|javascript|js)\s*\n/i, '');
    const b64Code = Buffer.from(cleanCode).toString('base64');
    const ps1Path = path.join(os.tmpdir(), 'cptyper.ps1');
    
    // 🟢 NEW: Powershell script now accepts the exact Mistake Chance percentage!
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
            # 🟢 DRUNK TYPER: Mathematically applies your settings slider
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
    
    // Spawn with the new parameter
    autoTyperProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', ps1Path, b64Code, wpmSpeed, mistakeChance]);
    
    autoTyperProcess.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split(/[\r\n]+/);
        lines.forEach(l => {
            if (l.startsWith('LINE_')) {
                const idx = parseInt(l.replace('LINE_', ''));
                if (!isNaN(idx)) BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-progress', idx));
            }
        });
    });
    autoTyperProcess.on('close', () => {
        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', false));
    });
});

ipcMain.on('stop-auto-type', (event) => {
    if (autoTyperProcess) {
        try { autoTyperProcess.kill(); } catch(e){}
        autoTyperProcess = null;
    }
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', false));
});

app.whenReady().then(async () => {
    const { session, desktopCapturer } = require('electron');
    
    // ==========================================================
    // 1. AUTO-GRANT PERMISSIONS ACROSS ALL AI PROFILES
    // ==========================================================
    
    // 🟢 FIX: Ensure partitioned profiles (Profile 1-20) inherit the Stealth Audio Rules!
    app.on('session-created', (sess) => {
        sess.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
        sess.setPermissionCheckHandler(() => true);
        sess.setDisplayMediaRequestHandler(
            (request, callback) => {
                desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                    callback({ video: sources[0], audio: 'loopback' });
                });
            },
            { useSystemPicker: false } // 🟢 CRITICAL FIX: Must be FALSE for silent background capture!
        );
    });

    // Failsafe for the default session
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: false } // 🟢 CRITICAL FIX: Must be FALSE for silent background capture!
    );

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    storage.initializeStorage();

    createMainWindow();
    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();

    // START THE NEW UNIVERSAL BRIDGE
    startUniversalAIBridge();

    // START THE BACKGROUND RADIO
    // startStealthRadio();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isAppQuitting = true; // 🐛 FIX: Tell all windows they are allowed to die now
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ LIMITS ============
    ipcMain.handle('storage:get-today-limits', async () => {
        try {
            return { success: true, data: storage.getTodayLimits() };
        } catch (error) {
            console.error('Error getting today limits:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            
            // 🐛 FIX: Physically wipe all cookies, cache, and logins from ALL 20 Chromium Profiles!
            const { session } = require('electron');
            await session.defaultSession.clearStorageData();
            for (let i = 1; i <= 20; i++) {
                const part = session.fromPartition(`persist:ai_profile_${i}`);
                await part.clearStorageData();
            }
            
            console.log("🧨 ALL PROFILES AND LOGINS NUKED!");
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupGeneralIpcHandlers() {
    // ==========================================================
    // PROFILE LOGIN WINDOW (Visible Manual Login)
    // ==========================================================
    ipcMain.handle('open-login-window', async (event, profileId, aiIndex) => {
        const provider = AI_CONFIGS[aiIndex];
        const partitionId = `persist:ai_profile_${profileId}`;
        
        return new Promise((resolve) => {
            const loginWin = new BrowserWindow({
                width: 1000, height: 800,
                show: true, autoHideMenuBar: true,
                title: `Login to ${provider.name}`,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: partitionId
                }
            });
            
            loginWin.loadURL(provider.url);
            
            // When the user finishes logging in and closes the window, resolve the promise!
            loginWin.on('closed', () => {
                resolve(true);
            });
        });
    });

    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant') {
            // 🟢 FIX: Bulletproof backend state reset!
            global.currentSessionMode = 'main';
            global.isLiveInterviewMode = false;
            global.isClickThroughState = false; // 🐛 BUG 4 FIX: Force click-through OFF
            
            isGhostHidden = false;
            global.isGhostHidden = false;
            wasAiVisibleBeforeGhost = false;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setOpacity(1);
                mainWindow.setIgnoreMouseEvents(false); // 🐛 BUG 4 FIX: Explicit reset
            }

            // 🟢 DUAL BRAIN FIX: Hide BOTH AI windows and cure the 0-opacity lock bug!
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                voiceWebWindow.hide();
                voiceWebWindow.setOpacity(1);
                voiceWebWindow.setIgnoreMouseEvents(false);
            }
            if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                codeWebWindow.hide();
                codeWebWindow.setOpacity(1);
                codeWebWindow.setIgnoreMouseEvents(false);
            }

            // 🐛 BUG 6 FIX: Destroy radial HUD completely when leaving assistant
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.destroy();
                global.radialHudWindow = null;
            }
        } else if (!mainWindow.isDestroyed()) {
            // Restore clicks if we enter the assistant naturally
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('quit-application', async event => {
        try {
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, null, null);
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });

    // ==========================================================
    // VISION MODE: IMAGE ACCUMULATION & SENDING
    // ==========================================================
    ipcMain.handle('capture-screenshot', async () => {
        try {
            // Take the screenshot
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
            const screenImage = sources[0].thumbnail.toDataURL(); 

            // Save to D:/Files folder
            const saveDir = 'D:/Files';
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }
            const filePath = path.join(saveDir, `screenshot_${Date.now()}.png`);
            const base64Data = screenImage.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(filePath, base64Data, 'base64');

            // Add to the Accumulator Queue
            accumulatedScreenshots.push(screenImage);
            console.log(`📸 Captured! Queue size: ${accumulatedScreenshots.length}`);
            return accumulatedScreenshots.length;
        } catch (err) {
            console.error('Capture failed:', err);
            return accumulatedScreenshots.length;
        }
    });

    ipcMain.handle('clear-screenshots', async () => {
        accumulatedScreenshots = [];
        console.log('🗑️ Screenshot queue cleared.');
        return 0;
    });

    ipcMain.handle('get-screenshots', async () => {
        return accumulatedScreenshots;
    });

    ipcMain.handle('send-screenshots-to-ai', async (event, customPrompt) => {
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = customPrompt || PROMPTS.OA_AUTOMATION('C++');
        const voicePrompt = PROMPTS.VOICE_CONTEXT;

        // Fire to Code Brain
        await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
        
        // 1-Second Throttle to protect CPU/Rate limits, then Fire to Voice Brain
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    // ==========================================================
    // ZERO-TOUCH NEW CHAT (Silent Background Wipe)
    // ==========================================================
    ipcMain.handle('new-chat', async () => {
        if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.loadURL(AI_CONFIGS[activeLoadout.voiceEngine].url);
        if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.loadURL(AI_CONFIGS[activeLoadout.codeEngine].url);
        return true;
    });

    ipcMain.on('set-session-mode', (event, mode) => {
        global.currentSessionMode = mode;
    });

    // ==========================================================
    // MANUAL MIC TOGGLE (Crash-Proof DOM Sniper)
    // ==========================================================
    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) return false;
        
        // 🟢 STRICT ES5 IIFE: Returns ONLY a primitive boolean to prevent "Object cannot be cloned" IPC crash!
        const script = `
            (function() {
                try { 
                    var btns = Array.from(document.querySelectorAll('button, div[role="button"]')); 
                    var targetBtn = btns.find(function(b) { 
                        var txt = (b.textContent || '').trim().toLowerCase(); 
                        var aria = (b.getAttribute('aria-label') || '').toLowerCase(); 
                        var testid = (b.getAttribute('data-testid') || '').toLowerCase(); 
                        var isTurnOn = ${isTurningOn};
                        if (isTurnOn) {
                            return aria.includes('voice') || aria.includes('microphone') || testid.includes('voice') || txt.includes('start voice');
                        } else {
                            return txt === 'stop' || txt === 'end' || txt.includes('end call') || aria.includes('stop') || aria.includes('end') || testid.includes('end') || testid.includes('stop');
                        }
                    }); 
                    if (targetBtn) { targetBtn.click(); return true; }
                    return false;
                } catch(e) { return false; }
            })();
        `;
            
        try {
            const result = await voiceWebWindow.webContents.executeJavaScript(script);
            return result === true;
        } catch (err) {
            return false;
        }
    });

    // ==========================================================
    // EXPLICIT ENGINE SWITCHER (ChatGPT=0, Gemini=1, Grok=2)
    // ==========================================================
    ipcMain.handle('set-ai-provider', async (event, targetIdx) => {
        return AI_CONFIGS[targetIdx].name;
    });

    ipcMain.handle('check-active-ai', () => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) {
            return { name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: "" };
        }
        return {name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: voiceWebWindow.webContents.getURL() };
    });

    ipcMain.handle('send-oa-automation', async (event, language) => {
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = PROMPTS.OA_AUTOMATION(language);
        // 🆕 Feature 1: Different prompt per brain in interview mode
        const voicePrompt = global.currentSessionMode === 'proctored_live_interview' 
            ? PROMPTS.VOICE_SCREENSHOT_CONTEXT 
            : PROMPTS.VOICE_CONTEXT;
        await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-refactor', async () => {
        await sendPayloadToWindow(codeWebWindow, PROMPTS.REFACTOR, []);
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, PROMPTS.VOICE_CONTEXT, []);
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        if (accumulatedScreenshots.length === 0) return false;
        await sendPayloadToWindow(codeWebWindow, PROMPTS.FIX_ERROR, accumulatedScreenshots);
        // 🆕 Feature 8: Voice Brain gets read-only context for fix errors too
        const voiceFixPrompt = global.currentSessionMode === 'proctored_live_interview'
            ? PROMPTS.VOICE_SCREENSHOT_CONTEXT
            : PROMPTS.VOICE_CONTEXT;
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, voiceFixPrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-regenerate', async (event, target) => {
        // 🆕 Feature 11: Cursor-aware regenerate — target = 'voice', 'code', or undefined (both)
        const script = `(() => { try { const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').toLowerCase().includes('regenerate') || (b.getAttribute('aria-label')||'').toLowerCase().includes('regenerate')); if(btn) { btn.click(); return true; } return false; } catch(e) { return false; } })();`;
        if (target === 'voice') {
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        } else if (target === 'code') {
            if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        } else {
            if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.webContents.executeJavaScript(script).catch(()=>{});
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        }
        return true;
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        if (!text) return;
        await sendPayloadToWindow(voiceWebWindow, text, []);
    });

    // ==========================================================
    // 🆕 Phase 3: CODE→VOICE BRAIN SYNC (Silent Context Injection)
    // ==========================================================
    ipcMain.handle('sync-code-to-voice', async (event, codeText) => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed() || !codeText) return false;
        if (global.currentSessionMode !== 'proctored_live_interview') return false;
        const syncPrompt = PROMPTS.CODE_TO_VOICE_SYNC(String(codeText));
        await sendPayloadToWindow(voiceWebWindow, syncPrompt, []);
        return true;
    });

    // ==========================================================
    // 🆕 Phase 3: SESSION HANDOFF (Account Rotation Context Transfer)
    // ==========================================================
    ipcMain.handle('generate-session-handoff', async (event, handoffData) => {
        const { problemDesc, lastCode, conversationSummary, status } = handoffData || {};
        const handoffPrompt = PROMPTS.SESSION_HANDOFF(
            String(problemDesc || ''),
            String(lastCode || ''),
            String(conversationSummary || ''),
            String(status || 'In progress')
        );
        // Reload both brains with new loadout first
        launchDualBrains();
        // Wait for DOM ready, then inject context
        setTimeout(async () => {
            await sendPayloadToWindow(codeWebWindow, handoffPrompt, []);
            setTimeout(async () => {
                await sendPayloadToWindow(voiceWebWindow, handoffPrompt, []);
            }, 2000);
        }, 5000);
        return true;
    });

    // ==========================================================
    // DYNAMIC MODEL SWITCHER (Fast vs. Think)
    // ==========================================================
    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => {
        currentBrainMode = mode;
        return true;
    });

    // ==========================================================
    // BACKGROUND SPY: READ THE ACTUAL BROWSER STATE
    // ==========================================================
    ipcMain.handle('get-current-ai-mode', async () => {
        return currentBrainMode;
    });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        launchDualBrains();
        return targetProfileId;
    });

    // ==========================================================
    // SPLIT-SCREEN AI VISIBILITY (Mode Aware)
    // ==========================================================
    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        if (!codeWebWindow) return false;

        const isVisible = codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0;
        const targetVisible = forceShow !== undefined ? forceShow : !isVisible;

        if (targetVisible) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            if (global.currentSessionMode === 'proctored_oa') {
                // 🟢 SINGLE BRAIN (Centered)
                const safeWidth = Math.max(800, Math.floor(width * 0.7));
                const safeHeight = Math.max(600, Math.floor(height * 0.8));
                const x = Math.floor((width - safeWidth) / 2);
                const y = Math.floor((height - safeHeight) / 2);

                if (!codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1);
                    codeWebWindow.setIgnoreMouseEvents(false);
                    codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    codeWebWindow.setBounds({ x, y, width: safeWidth, height: safeHeight });
                    codeWebWindow.showInactive();
                }
                
                // 🟢 STRICT FIX: Force Voice Brain to hide so it doesn't leak into OA!
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.hide();
                }
            } else {
                // 🟢 DUAL BRAIN (50/50 Split)
                const halfWidth = Math.floor(width / 2);
                if (!codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1);
                    codeWebWindow.setIgnoreMouseEvents(false);
                    codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    codeWebWindow.setBounds({ x: 0, y: 0, width: halfWidth, height: height });
                    codeWebWindow.showInactive();
                }
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(1);
                    voiceWebWindow.setIgnoreMouseEvents(false);
                    voiceWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    voiceWebWindow.setBounds({ x: halfWidth, y: 0, width: halfWidth, height: height });
                    voiceWebWindow.showInactive();
                }
            }

            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                global.radialHudWindow.moveTop();
            }
            return true;
        } else {
            if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.hide();
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.hide();
            return false;
        }
    });
    
    // --- ADD THIS AT THE VERY BOTTOM OF SETUP IPC HANDLERS ---
    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            // { forward: true } lets the mouse click through to the browser underneath, 
            // but keeps tracking movement so we can turn it back off!
            win.setIgnoreMouseEvents(ignore, { forward: true });
        }
    });

    // ==========================================================
    // MINI WIDGET MANAGER
    // ==========================================================
    ipcMain.handle('show-widget', async () => {
        if (global.isOAModeActive) return false;
        if (!widgetWindow || widgetWindow.isDestroyed()) {
            const { screen } = require('electron');
            const primaryDisplay = screen.getPrimaryDisplay();
            const { height } = primaryDisplay.workAreaSize;

            widgetWindow = new BrowserWindow({
                width: 160,
                height: 180,
                x: 170, // Left edge
                y: Math.floor(height / 2) - 50, // Centered vertically
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                resizable: false,
                skipTaskbar: true,
                webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            if (process.platform === 'darwin') {
                widgetWindow.setHiddenInMissionControl(true);
            }
            widgetWindow.setContentProtection(true);
            // if (process.platform === 'win32') widgetWindow.setDisplayAffinity('exclude_from_capture');
            widgetWindow.loadFile('src/widget.html');
        } else {
            // 🟢 FIX: Restore Opacity and Mouse Clicks when returning from Ghost state!
            widgetWindow.setOpacity(1);
            widgetWindow.setIgnoreMouseEvents(false);
            widgetWindow.showInactive(); // Shows it without stealing your keyboard focus
        }
    });

    ipcMain.handle('hide-widget', () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
    });

    ipcMain.handle('sync-widget', (event, state) => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
            widgetWindow.webContents.send('sync-widget-state', state);
        }
        
        // 🟢 Also route the transparency sync to the companion chat window
        const { getCompanionWindow } = require('./utils/window');
        const cWindow = getCompanionWindow();
        if (cWindow && !cWindow.isDestroyed() && state.transparency !== undefined) {
            cWindow.webContents.send('sync-opacity', state.transparency);
        }
    });

    // ==========================================================
    // GLOBAL OVERLAY SYNC
    // ==========================================================
    ipcMain.handle('hide-all-overlays', () => {
        BrowserWindow.getAllWindows().forEach(w => {
            if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) {
                w.setOpacity(0);
                w.setIgnoreMouseEvents(true, { forward: true });
            }
        });

        // 🟢 DUAL BRAIN FIX
        if (voiceWebWindow && !voiceWebWindow.isDestroyed() && voiceWebWindow.isVisible()) {
            voiceWebWindow.setOpacity(0);
            voiceWebWindow.setIgnoreMouseEvents(true, { forward: true });
        }
        if (codeWebWindow && !codeWebWindow.isDestroyed() && codeWebWindow.isVisible()) {
            codeWebWindow.setOpacity(0);
            codeWebWindow.setIgnoreMouseEvents(true, { forward: true });
        }
    });

    // Route Widget clicks to the Main UI
    ipcMain.on('widget-action', (event, action) => {
        if (action === 'hide-app') {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== voiceWebWindow && w !== codeWebWindow) w.hide();
            });

            // 🟢 DUAL BRAIN FIX
            if (voiceWebWindow && !voiceWebWindow.isDestroyed() && voiceWebWindow.isVisible()) voiceWebWindow.hide();
            if (codeWebWindow && !codeWebWindow.isDestroyed() && codeWebWindow.isVisible()) codeWebWindow.hide();
            
        } else {
            // Tell the main React/Lit window to trigger the capture/clear/send functions
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== widgetWindow && w !== voiceWebWindow && w !== codeWebWindow) {
                    w.webContents.send('execute-widget-action', action);
                }
            });
        }
    });

    // ==========================================================
    // 🎯 GHOST NINJA V2: 16-ZONE TELEMETRY (Hover Streaming)
    // ==========================================================
    let hotCornerInterval = null;
    let currentDwellZone = null;

    ipcMain.on('start-hot-corners', (event, bounds) => {
        if (hotCornerInterval) return;
        const { screen } = require('electron');
        
        // Default Boundaries if none set in settings
        const b = bounds || { cornerSize: 15, centerX: 40, centerY: 40 };

        hotCornerInterval = setInterval(() => {
            const point = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint(point);
            const { x: dx, y: dy, width: w, height: h } = display.bounds;
            const x = point.x - dx;
            const y = point.y - dy;
            
            const edge = 15; // Physical pixel tolerance
            let isTop = y <= edge;
            let isBottom = y >= h - edge;
            let isLeft = x <= edge;
            let isRight = x >= w - edge;

            const xPct = (x / w) * 100;
            const yPct = (y / h) * 100;

            // Math to slice edges into 5 segments based on custom sliders
            const getSeg = (pct, centerSize, cornerSize) => {
                if (pct <= cornerSize) return '1'; // Corner 1
                if (pct >= 100 - cornerSize) return '5'; // Corner 2
                const midStart = 50 - (centerSize / 2);
                const midEnd = 50 + (centerSize / 2);
                if (pct >= midStart && pct <= midEnd) return '3'; // Center
                if (pct > cornerSize && pct < midStart) return '2'; // Mid 1
                return '4'; // Mid 2
            };

            let activeZone = null;
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

            // Stream the exact zone to the frontend every 50ms for smooth UI drawing
            if (activeZone !== currentDwellZone) {
                currentDwellZone = activeZone;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('hot-corner-hover', currentDwellZone);
                }
            }
        }, 50);
    });

    ipcMain.on('stop-hot-corners', () => {
        if (hotCornerInterval) {
            clearInterval(hotCornerInterval);
            hotCornerInterval = null;
        }
    });

    // 🟢 SAFE HIDE VARIABLES (Moved UP so the Ping system can read them!)
    let isGhostHidden = false;
    global.isGhostHidden = false;
    let wasAiVisibleBeforeGhost = false;

    // 🟢 NEW: SILENT PING (ASUS Hardware WMI Backlight Flasher V2)
    ipcMain.on('ai-generation-complete', () => {
        // 🚨 STRICT VISIBILITY CHECK: If the overlay is hidden, do absolutely nothing.
        if (isGhostHidden || !mainWindow || mainWindow.getOpacity() === 0) {
            console.log("🔕 AI Complete - Overlay is hidden, suppressing backlight ping.");
            return;
        }

        console.log("🔔 AI Generation Complete - Firing ASUS Keyboard Backlight Ping!");
        
        // 🟢 THE BACKLIGHT PULSE: Taps directly into the ASUS Motherboard WMI (ACPI) Layer!
        const flashBacklightScript = `
            $namespace = "root/wmi"
            
            # Hunt for BOTH known Asus ACPI chips
            $wmi = Get-CimInstance -Namespace $namespace -ClassName "AsusAtkWmi_WMNB" -ErrorAction SilentlyContinue
            if (!$wmi) { $wmi = Get-CimInstance -Namespace $namespace -ClassName "AsusAtkWmi" -ErrorAction SilentlyContinue }
            
            $dev = [uint32]327713  # 0x00050021 (ASUS Device ID for Keyboard Backlight)
            
            if ($wmi) {
                for ($i=0; $i -lt 3; $i++) {
                    # Force OFF (Try both raw 0 and ASUS bitmask 128)
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]128} -ErrorAction SilentlyContinue | Out-Null
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]0} -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 200
                    
                    # Force ON / High (Try both raw 3 and ASUS bitmask 131)
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]131} -ErrorAction SilentlyContinue | Out-Null
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]3} -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 250
                }
                # Restore to medium
                Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]129} -ErrorAction SilentlyContinue | Out-Null
            } else {
                # Hardware Fallback: If still blocked by Windows, flash Caps Lock
                $wsh = New-Object -ComObject WScript.Shell
                for ($i=0; $i -lt 3; $i++) {
                    $wsh.SendKeys('{CAPSLOCK}'); Start-Sleep -Milliseconds 200
                    $wsh.SendKeys('{CAPSLOCK}'); Start-Sleep -Milliseconds 250
                }
            }
        `;
        
        spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', flashBacklightScript]);
    });

    // 🟢 THE MASTER STEALTH TOGGLE (United for both Mouse and Keyboard!)
    let stealthToggleLock = false;
    global.toggleStealthMode = () => {
        if (stealthToggleLock) return; // 🐛 Debounce guard against double-fire race condition
        stealthToggleLock = true;
        setTimeout(() => { stealthToggleLock = false; }, 300); // 300ms lockout

        if (mainWindow && !mainWindow.isDestroyed()) {
            isGhostHidden = !isGhostHidden;
            global.isGhostHidden = isGhostHidden;

            if (isGhostHidden) {
                mainWindow.webContents.send('app-made-hidden');
                
                // 🟢 SYNC FRONTEND: Check if EITHER brain was visible
                wasAiVisibleBeforeGhost = (voiceWebWindow && voiceWebWindow.isVisible() && voiceWebWindow.getOpacity() !== 0) || 
                                          (codeWebWindow && codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0);

                mainWindow.setOpacity(0);
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
                
                // 🟢 DUAL BRAIN FIX
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(0);
                    voiceWebWindow.setIgnoreMouseEvents(true, { forward: true });
                }
                if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(0);
                    codeWebWindow.setIgnoreMouseEvents(true, { forward: true });
                }
                
                // 🐛 FIX: Use OPACITY instead of hide() so radial still receives IPC (red dot!)
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                    global.radialHudWindow.setOpacity(0);
                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: true });
                }
                
            } else {
            mainWindow.webContents.send('app-made-visible');
            
            // 🟢 SYNC FRONTEND
            mainWindow.setOpacity(1);
            mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });
            
            if (wasAiVisibleBeforeGhost) {
                // 🟢 DUAL BRAIN FIX
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(1);
                    voiceWebWindow.setIgnoreMouseEvents(false);
                }
                if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1);
                    codeWebWindow.setIgnoreMouseEvents(false);
                }
            }
            
            // 🐛 FIX: Restore radial from opacity=0 (not from hide) if still in interview mode
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                global.radialHudWindow.setOpacity(1);
                global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
            }

            // 🟢 THE Z-INDEX RESTACKER
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                setTimeout(() => {
                    if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                        global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 3);
                        global.radialHudWindow.moveTop();
                    }
                }, 100);
            }
        }
        }
    };

    ipcMain.handle('trigger-ghost-hide', () => {
        global.toggleStealthMode();
    });
}