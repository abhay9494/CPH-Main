if (require('electron-squirrel-startup')) {
    process.exit(0);
}

// ==========================================================
// OA GLOBAL PROMPTS (Embedded to avoid missing files)
// ==========================================================
const PROMPTS = {
    OA_AUTOMATION: (language) => `Output ONLY functional code in ${language || 'c++'}. CRITICAL RULES:
- Do NOT output any greetings, explanations, or comments.
- Use single letter variable names.
- Give me code with a main function so that I can run locally.
- Don't change the function signature given in the image. See function signature and test cases from the image.
- Give me test cases to be put in cph extension of vs code (only those test cases which are visible in the image) like this:
test case1
input
expected output
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    REFACTOR: `Refactor the above code. Output ONLY functional code. CRITICAL RULES:
- Do NOT output any greetings, explanations, or comments.
- If the original code uses a for loop, see if a while loop or a higher-order function (like map or filter) fits better.
- Break large functions into smaller helper functions.
- If specific independent tasks happen in a sequence, change the order of initialization if it doesn't affect the output.
- Structurally invert nested if statements by checking for invalid conditions and returning early.
- Replace long switch statements or if-else chains with a Map (Dictionary) or Array lookup.
- Algorithms often iterate forward (0 to N). Change this to backward iteration (N to 0) or use recursion.
- Extract complex conditions into variables with semantic names.
- Do not use classes.
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    FIX_ERROR: `Look at the code written by me in the code editor of the screenshot attached and see the compiler error or wrong answer present. CRITICAL RULES:
- Output ONLY the fully corrected functional code.
- Do NOT output any greetings, general explanations, or extra text.
- Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    VOICE_CONTEXT: `Read the attached problem or code. Do NOT output the solution or read it out loud. Just ingest the context silently. Be prepared to answer verbal questions about its logic, approach, or time complexity if I ask you through the microphone. Reply with a short confirmation that you understand.`
};

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

const { createWindow, updateGlobalShortcuts } = require('./windowManager'); // 🟢 FIX: Path corrected!
const storage = require('./storage'); // 🟢 FIX: Path corrected!
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow = null;
let widgetWindow = null;
let voiceWebWindow = null;
let codeWebWindow = null;
let currentBrainMode = 'fast';
let activeLoadout = { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };
let accumulatedScreenshots = [];
let scrapingInterval = null;
let isAppQuitting = false;

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
    voiceWebWindow.webContents.on('dom-ready', async () => {
        voiceWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        
        try {
            const { desktopCapturer } = require('electron');
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
                                console.log("🕵️‍♂️ Hardware Mic Blocked. Routing System Audio directly...");
                                
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
    codeWebWindow.webContents.setAudioMuted(true);
    if (process.platform === 'win32') codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 0);
    codeWebWindow.loadURL(codeProvider.url);
    codeWebWindow.webContents.on('dom-ready', async () => {
        codeWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        await codeWebWindow.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked")); true;`).catch(() => {});
    });

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
    let lastMicState = null;

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
            if (vData.count > lastVoiceMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) w.webContents.send('voice-new-message', vData.text);
                });
            } else if (vData.count === lastVoiceMsg.count && vData.text !== lastVoiceMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) w.webContents.send('voice-update-message', vData.text);
                });
            }
            lastVoiceMsg = vData;
        }

        const cData = await scrape(codeWebWindow, codeProvider).catch(() => null);
        if (cData) {
            if (cData.count > lastCodeMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) w.webContents.send('code-new-message', cData.text);
                });
            } else if (cData.count === lastCodeMsg.count && cData.text !== lastCodeMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => {
                    if (!w.isDestroyed()) w.webContents.send('code-update-message', cData.text);
                });
            }
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
                .catch(() => { });
        }
    }, 1000);
}

async function sendPayloadToWindow(win, customText, images = []) {
    if (!win || win.isDestroyed()) return;
    const { clipboard, nativeImage } = require('electron');
    
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

let autoTyperProcess = null;

ipcMain.on('start-auto-type', (event, rawCode, wpmSpeed, mistakeChance) => {
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('typing-status', true));
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
    
    app.on('session-created', (sess) => {
        sess.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
        sess.setPermissionCheckHandler(() => true);
        sess.setDisplayMediaRequestHandler(
            (request, callback) => {
                desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                    callback({ video: sources[0], audio: 'loopback' });
                });
            },
            { useSystemPicker: false } 
        );
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: false }
    );

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    storage.initializeStorage();
    createMainWindow();
    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();
    startUniversalAIBridge();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isAppQuitting = true;
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

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
        const { session } = require('electron');
        await session.defaultSession.clearStorageData();
        for (let i = 1; i <= 20; i++) {
            const part = session.fromPartition(`persist:ai_profile_${i}`);
            await part.clearStorageData();
        }
        return { success: true };
    });
}

function setupGeneralIpcHandlers() {
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
            loginWin.on('closed', () => { resolve(true); });
        });
    });

    ipcMain.handle('get-app-version', async () => { return app.getVersion(); });

    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'assistant') {
            global.currentSessionMode = 'main';
            global.isLiveInterviewMode = false;
            
            let isGhostHidden = false;
            global.isGhostHidden = false;
            let wasAiVisibleBeforeGhost = false;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setOpacity(1);
                mainWindow.setIgnoreMouseEvents(false);
            }

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

            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.hide();
            }
        } else if (!mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(false);
        }
    });

    ipcMain.handle('quit-application', async event => {
        try { app.quit(); return { success: true }; } 
        catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try { await shell.openExternal(url); return { success: true }; } 
        catch (error) { return { success: false, error: error.message }; }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, null, null);
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
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = customPrompt || PROMPTS.OA_AUTOMATION('C++');
        const voicePrompt = PROMPTS.VOICE_CONTEXT;
        await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('new-chat', async () => {
        if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.loadURL(AI_CONFIGS[activeLoadout.voiceEngine].url);
        if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.loadURL(AI_CONFIGS[activeLoadout.codeEngine].url);
        return true;
    });

    ipcMain.on('set-session-mode', (event, mode) => { global.currentSessionMode = mode; });

    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) return false;
        
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
        } catch (err) { return false; }
    });

    ipcMain.handle('set-ai-provider', async (event, targetIdx) => { return AI_CONFIGS[targetIdx].name; });

    ipcMain.handle('check-active-ai', () => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) {
            return { name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: "" };
        }
        return {name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: voiceWebWindow.webContents.getURL() };
    });

    ipcMain.handle('send-oa-automation', async (event, language) => {
        if (accumulatedScreenshots.length === 0) return false;
        const codePrompt = PROMPTS.OA_AUTOMATION(language);
        const voicePrompt = PROMPTS.VOICE_CONTEXT;
        await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-refactor', async () => {
        await sendPayloadToWindow(codeWebWindow, PROMPTS.REFACTOR, []);
        setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, PROMPTS.VOICE_CONTEXT, []); }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        if (accumulatedScreenshots.length === 0) return false;
        await sendPayloadToWindow(codeWebWindow, PROMPTS.FIX_ERROR, accumulatedScreenshots);
        setTimeout(async () => {
            await sendPayloadToWindow(voiceWebWindow, PROMPTS.VOICE_CONTEXT, accumulatedScreenshots);
            accumulatedScreenshots = [];
        }, 1500);
        return true;
    });

    ipcMain.handle('send-oa-regenerate', async () => {
        const script = `(() => { try { const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').toLowerCase().includes('regenerate') || (b.getAttribute('aria-label')||'').toLowerCase().includes('regenerate')); if(btn) { btn.click(); return true; } return false; } catch(e) { return false; } })();`;
        if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        if (voiceWebWindow && !voiceWebWindow.isDestroyed()) voiceWebWindow.webContents.executeJavaScript(script).catch(()=>{});
        return true;
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        if (!text) return;
        await sendPayloadToWindow(voiceWebWindow, text, []);
    });

    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => {
        currentBrainMode = mode; return true;
    });

    ipcMain.handle('get-current-ai-mode', async () => { return currentBrainMode; });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        launchDualBrains(); return targetProfileId;
    });

    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        if (!codeWebWindow) return false;
        const isVisible = codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0;
        const targetVisible = forceShow !== undefined ? forceShow : !isVisible;

        if (targetVisible) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            if (global.currentSessionMode === 'proctored_oa') {
                const safeWidth = Math.max(800, Math.floor(width * 0.7));
                const safeHeight = Math.max(600, Math.floor(height * 0.8));
                const x = Math.floor((width - safeWidth) / 2);
                const y = Math.floor((height - safeHeight) / 2);

                if (!codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
                    codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    codeWebWindow.setBounds({ x, y, width: safeWidth, height: safeHeight });
                    codeWebWindow.showInactive();
                }
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) { voiceWebWindow.hide(); }
            } else {
                const halfWidth = Math.floor(width / 2);
                if (!codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
                    codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    codeWebWindow.setBounds({ x: 0, y: 0, width: halfWidth, height: height });
                    codeWebWindow.showInactive();
                }
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(1); voiceWebWindow.setIgnoreMouseEvents(false);
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

    ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
        global.isClickThroughState = ignore;
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setIgnoreMouseEvents(ignore, { forward: true });
            win.webContents.send('ghost-state-changed', ignore);
        }
    });

    ipcMain.handle('hide-all-overlays', () => {
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
    });

    ipcMain.on('ai-generation-complete', () => {
        if (global.isGhostHidden || !mainWindow || mainWindow.getOpacity() === 0) return;
        const flashBacklightScript = `
            $namespace = "root/wmi"
            $wmi = Get-CimInstance -Namespace $namespace -ClassName "AsusAtkWmi_WMNB" -ErrorAction SilentlyContinue
            if (!$wmi) { $wmi = Get-CimInstance -Namespace $namespace -ClassName "AsusAtkWmi" -ErrorAction SilentlyContinue }
            $dev = [uint32]327713  
            if ($wmi) {
                for ($i=0; $i -lt 3; $i++) {
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]128} -ErrorAction SilentlyContinue | Out-Null
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]0} -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 200
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]131} -ErrorAction SilentlyContinue | Out-Null
                    Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]3} -ErrorAction SilentlyContinue | Out-Null
                    Start-Sleep -Milliseconds 250
                }
                Invoke-CimMethod -InputObject $wmi -MethodName DEVS -Arguments @{Device_ID=$dev; Control_status=[uint32]129} -ErrorAction SilentlyContinue | Out-Null
            } else {
                $wsh = New-Object -ComObject WScript.Shell
                for ($i=0; $i -lt 3; $i++) {
                    $wsh.SendKeys('{CAPSLOCK}'); Start-Sleep -Milliseconds 200
                    $wsh.SendKeys('{CAPSLOCK}'); Start-Sleep -Milliseconds 250
                }
            }
        `;
        spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', flashBacklightScript]);
    });

    global.toggleStealthMode = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            global.isGhostHidden = !global.isGhostHidden;

            if (global.isGhostHidden) {
                mainWindow.webContents.send('app-made-hidden');
                wasAiVisibleBeforeGhost = (voiceWebWindow && voiceWebWindow.isVisible() && voiceWebWindow.getOpacity() !== 0) || 
                                          (codeWebWindow && codeWebWindow.isVisible() && codeWebWindow.getOpacity() !== 0);

                mainWindow.setOpacity(0);
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
                
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(0); voiceWebWindow.setIgnoreMouseEvents(true, { forward: true });
                }
                if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(0); codeWebWindow.setIgnoreMouseEvents(true, { forward: true });
                }
                
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: true });
                }
                
            } else {
            mainWindow.webContents.send('app-made-visible');
            mainWindow.setOpacity(1);
            mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });
            
            if (wasAiVisibleBeforeGhost) {
                if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                    voiceWebWindow.setOpacity(1); voiceWebWindow.setIgnoreMouseEvents(false);
                }
                if (codeWebWindow && !codeWebWindow.isDestroyed()) {
                    codeWebWindow.setOpacity(1); codeWebWindow.setIgnoreMouseEvents(false);
                }
            }
            
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                global.radialHudWindow.showInactive();
                global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
                global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: false });
            }

            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                setTimeout(() => { if (!global.radialHudWindow.isDestroyed()) global.radialHudWindow.moveTop(); }, 50);
            }
        }
        }
    };

    ipcMain.handle('trigger-ghost-hide', () => { global.toggleStealthMode(); });
}