const { BrowserWindow, ipcMain } = require('electron');
const storage = require('../storage');

let scrapingInterval = null;

const AI_CONFIGS = [
    { name: 'ChatGPT', url: 'https://chatgpt.com', msgSelector: 'div[data-message-author-role="assistant"]' },
    { name: 'Gemini', url: 'https://gemini.google.com/app', msgSelector: 'model-response' },
    { name: 'Grok', url: 'https://grok.com', msgSelector: '.prose' }
];

function startDualScrapers(appState, voiceProvider, codeProvider) {
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

        const vData = await scrape(appState.voiceWebWindow, voiceProvider).catch(() => null);
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

        const cData = await scrape(appState.codeWebWindow, codeProvider).catch(() => null);
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

        if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
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
            
            appState.voiceWebWindow.webContents.executeJavaScript(spyScript)
                .then((isMicActive) => {
                    if (isMicActive !== lastMicState) {
                        lastMicState = isMicActive;
                        BrowserWindow.getAllWindows().forEach(w => {
                            if (!w.isDestroyed() && w !== appState.voiceWebWindow && w !== appState.codeWebWindow) {
                                w.webContents.send('sync-mic-state', !!isMicActive);
                            }
                        });
                    }
                })
                .catch(() => { });
        }
    }, 1000);
}

function launchDualBrains(appState) {
    const prefs = storage.getPreferences();
    const loadouts = prefs.dualBrainLoadouts || [];
    appState.activeLoadout = loadouts.find(l => l.id === (prefs.activeLoadoutId || 'loadout_1')) || 
                    { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };

    const voiceProvider = AI_CONFIGS[appState.activeLoadout.voiceEngine];
    const codeProvider = AI_CONFIGS[appState.activeLoadout.codeEngine];

    // --- 🗣️ 1. VOICE BRAIN ---
    if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) appState.voiceWebWindow.destroy();
    appState.voiceWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `🗣️ Voice Brain: ${voiceProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${appState.activeLoadout.voiceProfileId}` }
    });
    appState.voiceWebWindow.setContentProtection(true);
    appState.voiceWebWindow.webContents.setAudioMuted(true);

    if (process.platform === 'win32') appState.voiceWebWindow.setAlwaysOnTop(true, 'screen-saver', 0);
    appState.voiceWebWindow.loadURL(voiceProvider.url);
    
    appState.voiceWebWindow.webContents.on('dom-ready', async () => {
        appState.voiceWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        
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
                                if (videoTrack) videoTrack.stop(); 
                                
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
            
            await appState.voiceWebWindow.webContents.executeJavaScript(hijackScript);
        } catch (err) { console.error('Failed to inject WebRTC Hijack:', err); }
    });

    // --- 💻 2. CODE BRAIN ---
    if (appState.codeWebWindow && !appState.codeWebWindow.isDestroyed()) appState.codeWebWindow.destroy();
    appState.codeWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `💻 Code Brain: ${codeProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${appState.activeLoadout.codeProfileId}` }
    });
    appState.codeWebWindow.setContentProtection(true);
    appState.codeWebWindow.webContents.setAudioMuted(true);
    if (process.platform === 'win32') appState.codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 0);
    appState.codeWebWindow.loadURL(codeProvider.url);
    appState.codeWebWindow.webContents.on('dom-ready', async () => {
        appState.codeWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        await appState.codeWebWindow.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked")); true;`).catch(() => {});
    });

    const preventDeath = (win) => {
        win.on('close', (event) => {
            if (!appState.isAppQuitting) { event.preventDefault(); win.hide(); }
        });
    };
    preventDeath(appState.voiceWebWindow);
    preventDeath(appState.codeWebWindow);

    startDualScrapers(appState, voiceProvider, codeProvider);
}

function setupInterviewController(appState) {
    ipcMain.handle('new-chat', async () => {
        if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) appState.voiceWebWindow.loadURL(AI_CONFIGS[appState.activeLoadout.voiceEngine].url);
        if (appState.codeWebWindow && !appState.codeWebWindow.isDestroyed()) appState.codeWebWindow.loadURL(AI_CONFIGS[appState.activeLoadout.codeEngine].url);
        return true;
    });

    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!appState.voiceWebWindow || appState.voiceWebWindow.isDestroyed()) return false;
        
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
            const result = await appState.voiceWebWindow.webContents.executeJavaScript(script);
            return result === true;
        } catch (err) { return false; }
    });

    ipcMain.handle('set-ai-provider', async (event, targetIdx) => { return AI_CONFIGS[targetIdx].name; });

    ipcMain.handle('check-active-ai', () => {
        if (!appState.voiceWebWindow || appState.voiceWebWindow.isDestroyed()) {
            return { name: AI_CONFIGS[appState.activeLoadout.voiceEngine].name, url: "" };
        }
        return {name: AI_CONFIGS[appState.activeLoadout.voiceEngine].name, url: appState.voiceWebWindow.webContents.getURL() };
    });

    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => {
        appState.currentBrainMode = mode; return true;
    });

    ipcMain.handle('get-current-ai-mode', async () => { return appState.currentBrainMode; });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        launchDualBrains(appState); return targetProfileId;
    });

    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        if (!appState.codeWebWindow) return false;
        const isVisible = appState.codeWebWindow.isVisible() && appState.codeWebWindow.getOpacity() !== 0;
        const targetVisible = forceShow !== undefined ? forceShow : !isVisible;

        if (targetVisible) {
            const { screen } = require('electron');
            const { width, height } = screen.getPrimaryDisplay().workAreaSize;

            if (global.currentSessionMode === 'proctored_oa') {
                const safeWidth = Math.max(800, Math.floor(width * 0.7));
                const safeHeight = Math.max(600, Math.floor(height * 0.8));
                const x = Math.floor((width - safeWidth) / 2);
                const y = Math.floor((height - safeHeight) / 2);

                if (!appState.codeWebWindow.isDestroyed()) {
                    appState.codeWebWindow.setOpacity(1); appState.codeWebWindow.setIgnoreMouseEvents(false);
                    appState.codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    appState.codeWebWindow.setBounds({ x, y, width: safeWidth, height: safeHeight });
                    appState.codeWebWindow.showInactive();
                }
                if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) { appState.voiceWebWindow.hide(); }
            } else {
                const halfWidth = Math.floor(width / 2);
                if (!appState.codeWebWindow.isDestroyed()) {
                    appState.codeWebWindow.setOpacity(1); appState.codeWebWindow.setIgnoreMouseEvents(false);
                    appState.codeWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    appState.codeWebWindow.setBounds({ x: 0, y: 0, width: halfWidth, height: height });
                    appState.codeWebWindow.showInactive();
                }
                if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) {
                    appState.voiceWebWindow.setOpacity(1); appState.voiceWebWindow.setIgnoreMouseEvents(false);
                    appState.voiceWebWindow.setAlwaysOnTop(true, 'screen-saver', 1);
                    appState.voiceWebWindow.setBounds({ x: halfWidth, y: 0, width: halfWidth, height: height });
                    appState.voiceWebWindow.showInactive();
                }
            }

            if (appState.mainWindow && !appState.mainWindow.isDestroyed()) appState.mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
                global.radialHudWindow.moveTop();
            }
            return true;
        } else {
            if (appState.codeWebWindow && !appState.codeWebWindow.isDestroyed()) appState.codeWebWindow.hide();
            if (appState.voiceWebWindow && !appState.voiceWebWindow.isDestroyed()) appState.voiceWebWindow.hide();
            return false;
        }
    });
}

module.exports = { setupInterviewController, launchDualBrains, AI_CONFIGS };