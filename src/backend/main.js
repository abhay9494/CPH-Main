if (require('electron-squirrel-startup')) process.exit(0);

const PROMPTS = {
    // 🟢 OA PROMPTS
    OA_AUTOMATION: (language) => `Output ONLY functional code in ${language || 'c++'}. CRITICAL RULES:\n
    - Do NOT output any greetings, explanations, or comments.\n
    - Use single letter variable names.\n
    - Give me code with a main function so that I can run locally.\n
    - Don't change the function signature given in the image. See function signature and test cases from the image.\n
    - Give me test cases to be put in cph extension of vs code (only those test cases which are visible in the image) like this:\n
    test case1\n
    input\n
    expected output\n
    - Format code using standard Markdown backticks (e.g., \`\`\`cpp ... \`\`\`).`,

    REFACTOR: `Refactor the above code. Output ONLY functional code. Do NOT output any greetings, explanations, or comments. Replace long switch statements or if-else chains with a Map/Array lookup. Extract complex conditions into variables with semantic names. Do not use classes. Format code using standard Markdown backticks.`,

    FIX_ERROR: `Look at the code written by me in the code editor of the screenshot attached and see the compiler error present. Output ONLY the fully corrected functional code. Do NOT output any greetings or extra text. Format code using standard Markdown backticks.`,
    
    // 🟢 LIVE INTERVIEW PROMPTS (1st Person, Shadow Optimization & Strict Formatting)
    INTERVIEW_BRUTE_FORCE: `Output a working brute-force coding solution for the attached image. 
    CRITICAL RULES:\n
    - Examine the screenshot carefully for a programming language selector dropdown, file extension, or existing boilerplate code (e.g., 'C++' or 'Java'). You MUST write your solution in that exact language. If absolutely no language is visible, default to C++.\n
    - Speak entirely in the 1st person ("I", "my", "me"). Act as a software engineering candidate.\n
    - Provide line-by-line comments explaining the logic.\n
    - Use highly descriptive variable names and DO NOT change them midway through the interview.\n
    - Provide Time and Space Complexity for EVERY single loop and an overall complexity at the end.\n
    - Output code ready to run locally with a main function.\n
    - Provide a dry-run explanation with test cases.\n
    - CRITICAL FORMATTING: You MUST use Markdown headers (###) for sections. You MUST use bolding (**text**) for emphasis. Do NOT use LaTeX math formatting (like $O(N)$ or $t$), use plain text (like O(N) and t).`,

    INTERVIEW_OPTIMIZED: `Now, I need to optimize my previous solution. Provide a highly optimal solution with better Time/Space complexity. CRITICAL RULES:\n
    - Speak entirely in the 1st person ("I", "my", "me"). Act as a software engineering candidate.\n
    - Provide line-by-line comments explaining the logic.\n
    - Keep core variable names consistent with the previous solution.\n
    - Provide Time and Space Complexity for EVERY single loop and an overall complexity at the end.\n
    - Explain the new logic, provide line-by-line comments, and the new time/space complexity per loop.\n
    - Output code ready to run locally with a main function.\n
    - Provide a dry-run explanation with test cases.\n
    - CRITICAL FORMATTING: You MUST use Markdown headers (###) for sections. You MUST use bolding (**text**) for emphasis. Do NOT use LaTeX math formatting (like $O(N)$ or $t$), use plain text (like O(N) and t).`,
    
    // 🟢 VOICE BRAIN METHOD ACTING
    VOICE_INITIAL_CONTEXT: `SYSTEM DIRECTIVE: You are roleplaying as ME, the candidate taking a technical interview. Every single explanation, thought process, and answer you give MUST be strictly in the 1st person ('I', 'me', 'my'). Never break character. Never refer to 'the candidate' or 'the user'.\n\nSILENT DIRECTIVE: Read the attached coding problem. Do NOT output a solution. Just acknowledge you understand the constraints. Be prepared to act as my conversational partner to discuss brute-force vs optimal approaches.`,
    VOICE_SYNC_BRUTE_FORCE: `SYSTEM DIRECTIVE: You are roleplaying as ME, the candidate taking a technical interview. Every single explanation, thought process, and answer you give MUST be strictly in the 1st person ('I', 'me', 'my'). Never break character. Never refer to 'the candidate' or 'the user'.\n\nI just wrote this brute-force code. Acknowledge silently. Base your initial conversational explanations strictly on this exact logic:\n\n`,
    VOICE_SYNC_OPTIMIZED: `SYSTEM DIRECTIVE: You are roleplaying as ME, the candidate taking a technical interview. Every single explanation, thought process, and answer you give MUST be strictly in the 1st person ('I', 'me', 'my'). Never break character. Never refer to 'the candidate' or 'the user'.\n\nI have just presented a highly optimized approach to the interviewer. Acknowledge this silently. Base all future explanations strictly on this new logic:\n\n`
};

const { app, BrowserWindow, shell, ipcMain, session, desktopCapturer, clipboard, nativeImage, dialog, screen } = require('electron');

dialog.showErrorBox = function(title, content) { console.log(`[SILENT ERROR] ${title}: ${content}`); };
process.on('uncaughtException', (error) => { console.error('[CRASH PREVENTED]:', error); });
process.on('unhandledRejection', (reason, promise) => { console.error('[CRASH PREVENTED]:', reason); });

app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'Autofill,AutofillServerCommunication,PasswordGeneration,PasswordManager');

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
let activeLoadout = { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };
let accumulatedScreenshots = [];
let scrapingInterval = null;
let isAppQuitting = false;
let wasAiVisibleBeforeGhost = false;

global.radialHudWindow = null; 
global.activeRadialLabels = Array(16).fill('—');
global.isOAModeActive = false;
global.isGhostHidden = false; 
global.isThinkModeActive = false; 

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
        
        ipcRenderer.on('update-bg-alpha', (e, alpha) => {
            container.style.background = \`rgba(30,30,30,\${alpha})\`;
        });
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
    // 🟢 BUG FIX: Look for exact ID, fallback to the first saved loadout, then fallback to ChatGPT default
    activeLoadout = loadouts.find(l => l.id === (prefs.activeLoadoutId || 'loadout_1')) || 
                    loadouts[0] ||
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

    if (process.platform === 'win32') voiceWebWindow.setAlwaysOnTop(true, 'floating', 1);
    voiceWebWindow.loadURL(voiceProvider.url);
    
    voiceWebWindow.webContents.on('dom-ready', async () => {
        voiceWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        try {
            // 🟢 1. Read user preferences for the Virtual Mixer
            const currentPrefs = storage.getPreferences();
            const targetAudioMode = currentPrefs.audioMode || 'speaker_only';

            // 🟢 2. Securely fetch Screen ID BEFORE injecting WebRTC script to eliminate race conditions
            const sources = await desktopCapturer.getSources({ types: ['screen'] });
            if (!sources || sources.length === 0) return;
            const screenSourceId = sources[0].id;

            // 🟢 3. The Ultimate Virtual Audio Mixer (Double-Fallback Architecture)
            const hijackScript = `
                if (!window.__micHijacked) {
                    window.__micHijacked = true;
                    const mode = '${targetAudioMode}';
                    const sourceId = '${screenSourceId}';
                    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia ? navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices) : null;
                    
                    navigator.mediaDevices.getUserMedia = async (constraints) => {
                        if (constraints && constraints.audio) {
                            try {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                // WAKE UP the audio context in case Chromium suspended it due to lack of human clicking
                                if (ctx.state === 'suspended') await ctx.resume();
                                const dest = ctx.createMediaStreamDestination();
                                
                                // Route 1: Desktop / System Audio (Speaker)
                                if (mode === 'speaker_only' || mode === 'both') {
                                    try {
                                        let sysStream;
                                        try {
                                            // Primary: High-privilege Electron Desktop Capture
                                            sysStream = await originalGetUserMedia({ 
                                                audio: { mandatory: { chromeMediaSource: 'desktop' } }, 
                                                video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } 
                                            });
                                        } catch (err1) {
                                            console.warn('[VirtualMixer] Legacy capture failed, falling back to getDisplayMedia...', err1);
                                            // Fallback: Modern DisplayMedia API natively intercepted by backend loopback handler!
                                            if (originalGetDisplayMedia) {
                                                sysStream = await originalGetDisplayMedia({ audio: true, video: true });
                                            }
                                        }

                                        if (sysStream) {
                                            const sysAudioTrack = sysStream.getAudioTracks()[0];
                                            if (sysAudioTrack) {
                                                const sysSource = ctx.createMediaStreamSource(new MediaStream([sysAudioTrack]));
                                                sysSource.connect(dest);
                                            }
                                            // Instantly stop video track to save CPU/Bandwidth
                                            sysStream.getVideoTracks().forEach(t => t.stop());
                                        }
                                    } catch(e) { console.error('[VirtualMixer] Desktop audio capture completely failed:', e); }
                                }

                                // Route 2: Physical Hardware Microphone
                                if (mode === 'mic_only' || mode === 'both') {
                                    try {
                                        const micStream = await originalGetUserMedia({ audio: true });
                                        const micTrack = micStream.getAudioTracks()[0];
                                        if (micTrack) {
                                            const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                                            micSource.connect(dest);
                                        }
                                    } catch(e) { console.error('[VirtualMixer] Hardware Mic failed:', e); }
                                }
                                
                                // Route 3: Anti-Silence Keepalive (20kHz sine wave)
                                const osc = ctx.createOscillator();
                                osc.frequency.value = 20000; 
                                const gain = ctx.createGain();
                                gain.gain.value = 0.01; 
                                osc.connect(gain);
                                gain.connect(dest);
                                osc.start();
                                
                                return dest.stream;
                            } catch (err) {
                                console.error('[VirtualMixer] Core mixer failure, returning raw mic:', err);
                                return originalGetUserMedia(constraints);
                            }
                        }
                        return originalGetUserMedia(constraints);
                    };
                }
                true;
            `;
            
            await voiceWebWindow.webContents.executeJavaScript(hijackScript);

            // 🟢 4. ChatGPT Popup Assassin
            const assassinScript = `
                setInterval(() => {
                    try {
                        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
                        const badBtns = btns.filter(b => {
                            const txt = (b.innerText || '').toLowerCase();
                            return txt.includes('keep talking') || txt.includes('continue') || txt === 'x' || txt === 'close' || txt.includes('stay logged in');
                        });
                        badBtns.forEach(b => b.click());
                    } catch(e) {}
                }, 3000);
            `;
            voiceWebWindow.webContents.executeJavaScript(assassinScript).catch(()=>{});
            
        } catch (err) { console.error('Failed to init Voice WebRTC:', err); }
    });

    if (codeWebWindow && !codeWebWindow.isDestroyed()) codeWebWindow.destroy();
    codeWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        title: `💻 Code Brain: ${codeProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.codeProfileId}` }
    });
    codeWebWindow.setContentProtection(true);
    codeWebWindow.webContents.setAudioMuted(true);

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
    let codeStableTicks = 0; 
    global.bruteForceSyncPending = false; // 🟢 ONE-SHOT LOCK: Prevents the 2nd response from auto-syncing!

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
                        
                        // 🟢 BUG 1 FIX: Smart Text Extractor (Preserves <pre>, <p>, and <br>!)
                        let targetMsg = msgs[msgs.length - 1].cloneNode(true);
                        
                        // 1. Preserve Code Blocks
                        const codeBlocks = targetMsg.querySelectorAll('pre');
                        codeBlocks.forEach(block => {
                            const codeText = block.innerText || block.textContent || '';
                            const textNode = document.createTextNode('\\n\`\`\`\\n' + codeText.trim() + '\\n\`\`\`\\n');
                            block.parentNode.replaceChild(textNode, block);
                        });

                        // 2. Preserve Paragraphs and Line Breaks
                        const paragraphs = targetMsg.querySelectorAll('p');
                        paragraphs.forEach(p => { p.appendChild(document.createTextNode('\\n\\n')); });
                        const breaks = targetMsg.querySelectorAll('br');
                        breaks.forEach(br => { br.parentNode.replaceChild(document.createTextNode('\\n'), br); });
                        
                        // Clean up excess newlines
                        let finalText = (targetMsg.textContent || '').trim().replace(/\\n{3,}/g, '\\n\\n');
                        return { count: msgs.length, text: finalText };
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
            if (cData.count > lastCodeMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-new-message', cData.text); });
                codeStableTicks = 0; // Reset tracker for new message
            } 
            else if (cData.count === lastCodeMsg.count && cData.text !== lastCodeMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-update-message', cData.text); });
                codeStableTicks = 0; // Reset tracker because it's actively typing
            }
            else if (cData.count === lastCodeMsg.count && cData.text === lastCodeMsg.text && cData.text.length > 50) {
                // 🟢 The Code Brain has stopped typing. Wait ~3 seconds (3 ticks) then Auto-Sync!
                codeStableTicks++;
                if (codeStableTicks === 3 && global.currentSessionMode === 'proctored_live_interview' && global.bruteForceSyncPending) {
                    global.bruteForceSyncPending = false; // 🟢 SNAP THE LOCK SHUT! The 2nd response will no longer auto-sync.
                    
                    let syncPrompt = PROMPTS.VOICE_SYNC_BRUTE_FORCE + cData.text;
                    if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') syncPrompt = '@Fast ' + syncPrompt;
                    
                    // Beam the finalized Brute-Force code to the Voice Brain
                    sendPayloadToWindow(voiceWebWindow, syncPrompt, []).catch(()=>{});
                }
            }
            lastCodeMsg = cData;
        }

        if (voiceWebWindow && !voiceWebWindow.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
            // 🟢 BUG 3 FIX: Scrape the actual Mute/Unmute microphone icon state!
            const spyScript = `
                (function() {
                    try {
                        let btns = Array.from(document.querySelectorAll('button, div[role="button"]')); 
                        
                        // If it says "Turn off microphone", it means it is currently ON and listening
                        let micOnBtn = btns.find(b => {
                            let a = (b.getAttribute('aria-label') || '').toLowerCase();
                            let t = (b.getAttribute('title') || '').toLowerCase();
                            return a.includes('turn off microphone') || t.includes('turn off microphone');
                        });
                        if (micOnBtn) return true;

                        // If it says "Turn on microphone", the call is active but the mic is OFF
                        let micOffBtn = btns.find(b => {
                            let a = (b.getAttribute('aria-label') || '').toLowerCase();
                            let t = (b.getAttribute('title') || '').toLowerCase();
                            return a.includes('turn on microphone') || t.includes('turn on microphone');
                        });
                        if (micOffBtn) return false;

                        return false;
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

// 🟢 NEW: Smart Voice & Mic Helper (Slash Command + 45s Unmute Hunter)
async function ensureVoiceAndMic(win) {
    if (!win || win.isDestroyed()) return;

    // 1. Check if the call is already active
    const isCallActive = await win.webContents.executeJavaScript(`(() => {
        let stopBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
            let t = (b.textContent||'').toLowerCase(); 
            let a = (b.getAttribute('aria-label')||'').toLowerCase();
            return t === 'stop' || t === 'end' || t.includes('end call') || a.includes('stop') || a.includes('end') || a.includes('leave call');
        });
        return !!stopBtn;
    })()`).catch(() => false);

    if (!isCallActive) {
        // Step 1: Intelligent Model Selection using the /thinking slash command!
        const isThinkingMode = await win.webContents.executeJavaScript(`(() => {
            // Look for the text 'Thinking' near the model dropdown area
            let indicator = Array.from(document.querySelectorAll('*')).find(el => {
                let txt = (el.textContent || '').trim().toLowerCase();
                return txt === 'thinking' && el.children.length === 0;
            });
            if (indicator) return true;

            // Fallback check on popup buttons
            let btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.getAttribute('aria-haspopup'));
            if (btn && (btn.textContent || '').toLowerCase().includes('thinking')) return true;

            return false;
        })()`).catch(() => false);

        if (isThinkingMode) {
            // Focus the chat box
            await win.webContents.executeJavaScript(`(() => {
                const el = document.querySelector('rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                if (el) el.focus();
            })()`).catch(()=>{});

            // Type the slash command to toggle Thinking OFF (switching to Instant)
            win.webContents.insertText('/thinking');
            await new Promise(r => setTimeout(r, 600)); // Wait for popup
            win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
            win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            await new Promise(r => setTimeout(r, 800)); // Let UI settle into Instant mode
        }

        // Step 2: Trigger Voice Call (Ctrl+Alt+V + fallback)
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['ctrl', 'alt'], keyCode: 'V' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['ctrl', 'alt'], keyCode: 'V' });
        await win.webContents.executeJavaScript(`(() => {
            let btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
                let a = (b.getAttribute('aria-label')||'').toLowerCase();
                let d = (b.getAttribute('data-testid')||'').toLowerCase();
                return a.includes('voice') || a.includes('start voice') || d.includes('voice');
            });
            if(btn) btn.click();
        })()`).catch(()=>{});

        await new Promise(r => setTimeout(r, 2500)); // Wait for connection
    }

    // Step 3: Robust Retry-Loop Unmute (Fixes Issue 2 - Post Prompt Auto-Unmute)
    // ChatGPT can process/speak for a long time. We poll for up to 45 seconds to ensure it unmutes!
    await win.webContents.executeJavaScript(`(async () => {
        let attempts = 0;
        while(attempts < 90) { // 90 * 500ms = 45 seconds
            let unmute = Array.from(document.querySelectorAll('button')).find(b => {
                let a = (b.getAttribute('aria-label')||'').toLowerCase();
                let t = (b.getAttribute('title')||'').toLowerCase();
                return a.includes('turn on microphone') || t.includes('turn on microphone') || a === 'unmute';
            });
            if(unmute) {
                unmute.style.boxShadow = '0 0 10px #00cc66'; // Visual cue so you know it fired
                setTimeout(() => unmute.click(), 200);
                break;
            }
            attempts++;
            await new Promise(r => setTimeout(r, 500));
        }
    })()`).catch(()=>{});
}

// 🟢 NEW: Synchronized Typing Simulator to ensure @Pro and @Fast chips register perfectly
async function sendPayloadToWindow(win, customText, images = []) {
    if (!win || win.isDestroyed()) return;
    const isBoxReady = await win.webContents.executeJavaScript(`(() => { try { const el = document.querySelector('rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); if (el && el.offsetParent !== null) { el.focus(); return true; } return false; } catch(e) { return false; } })()`);
    if (!isBoxReady) return;

    let modeTag = null;
    let textToPaste = customText || '';

    if (textToPaste.startsWith('@Pro ') || textToPaste.startsWith('@Fast ')) {
        modeTag = textToPaste.startsWith('@Pro ') ? 'Pro' : 'Fast';
        textToPaste = textToPaste.substring(modeTag === 'Pro' ? 5 : 6); 
    }

    // 1. Paste the massive prompt text FIRST
    if (textToPaste) {
        clipboard.writeText(textToPaste); 
        win.webContents.paste(); 
        await new Promise(r => setTimeout(r, 400));
    }

    // 2. Inject the @Fast / @Pro macro safely with Human Typing Simulation
    if (modeTag) {
        // Deselect text
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
        await new Promise(r => setTimeout(r, 100));

        // 🟢 FIXED: Fire a physical Shift+Enter keystroke to drop to a new line safely
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['shift'], keyCode: 'Enter' });
        await new Promise(r => setTimeout(r, 100));

        // Type the @ symbol
        win.webContents.insertText('@');
        await new Promise(r => setTimeout(r, 600)); 
        
        // Type the word manually so event listeners catch it!
        for (let i = 0; i < modeTag.length; i++) {
            win.webContents.insertText(modeTag[i]);
            await new Promise(r => setTimeout(r, 150)); // Human typing delay
        }
        await new Promise(r => setTimeout(r, 400)); 
        
        // Hit Space to lock the blue chip
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' }); 
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' }); 
        await new Promise(r => setTimeout(r, 300));
    }

    // 3. Paste Images LAST
    for (let imgData of images) {
        const img = nativeImage.createFromDataURL(imgData);
        clipboard.writeImage(img);
        win.webContents.paste();
        await new Promise(r => setTimeout(r, 400));
    }

    const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
    let isReady = false, attempts = 0;
    while (!isReady && attempts < 40) {
        isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
        if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
    }
    
    await new Promise(r => setTimeout(r, 200));
    await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) btn.click(); return true; } catch(e) { return false; } })()`);
    
    setTimeout(() => { 
        if (!win.isDestroyed()) { win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); }
        
        // 🟢 BUG 2 FIX: Universal Post-Prompt Auto-Unmute
        if (win === voiceWebWindow) {
            setTimeout(async () => {
                await ensureVoiceAndMic(win);
            }, 3500);
        }
    }, 200);
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
    mainWindow = createWindow(); 

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

    ipcMain.on('update-radial-alpha', (event, alpha) => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('update-bg-alpha', alpha);
        }
    });

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

    // 🟢 SECURED: The Minimap leak is fixed. It is explicitly forced off via ghostMode payload
    ipcMain.on('sync-radial-labels', (event, labels) => {
        global.activeRadialLabels = labels || Array(16).fill('—');
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: global.isRadialModeActive || false, ghostMode: global.isGhostHidden === true });
        }
    });

    ipcMain.on('preview-radial-hud', (event, isPreview) => {
        global.isPreviewingRadial = isPreview;
        if (isPreview) {
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) { global.radialHudWindow.destroy(); global.radialHudWindow = null; }
            global.createRadialWindow();
            global.radialHudWindow.showInactive();
            global.radialHudWindow.setIgnoreMouseEvents(true, { forward: true });
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: true, ghostMode: false });
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
            global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: global.isPreviewingRadial, ghostMode: global.isGhostHidden === true });
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

                bgmiTrackerProcess.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (let output of lines) {
                        output = output.trim();
                        if (output === 'CTRL_DOWN') {
                            if (global.isGhostHidden) return;
                            
                            // 🟢 NEW: Instantly drop the click-through wall to catch the scroll!
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.setIgnoreMouseEvents(false);
                            }
                            
                            if (global.ctrlHoldTimer) clearTimeout(global.ctrlHoldTimer);

                            const prefs = storage.getPreferences();
                            const rs = prefs.radialSettings || {};
                            const holdDelayMs = rs.holdDelay ?? 2000;

                            global.ctrlHoldTimer = setTimeout(() => {
                                global.isRadialModeActive = true;
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

                        if (output === 'CTRL_UP') {
                            // 🟢 NEW: Restore the stealth click-through wall instantly!
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });
                            }

                            if (global.ctrlHoldTimer) { clearTimeout(global.ctrlHoldTimer); global.ctrlHoldTimer = null; }
                            
                            if (global.isRadialModeActive) {
                                if (radialTelemetryLoop) { clearInterval(radialTelemetryLoop); radialTelemetryLoop = null; }

                                if (currentRadialSlice !== null && mainWindow && !mainWindow.isDestroyed()) {
                                    mainWindow.webContents.send('execute-radial-hud', currentRadialSlice);
                                }

                                currentRadialSlice = null;
                                global.isRadialModeActive = false;

                                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                                    global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: global.isGhostHidden === true });
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

    const getModePrefix = () => global.isThinkModeActive ? '@Pro ' : '@Fast ';

    // 🟢 FIXED: Properly handle the 'send-oa-automation' IPC route and Language string
    ipcMain.handle('send-oa-automation', async (event, language) => {
        try {
            if (accumulatedScreenshots.length === 0) return false;

            if (global.currentSessionMode === 'proctored_live_interview') {
                // 🟢 STAGE 1: BRUTE FORCE (Fast Mode)
                global.isThinkModeActive = false;
                global.bruteForceSyncPending = true; // 🟢 OPEN THE LOCK: Allow the 1st response to auto-sync!
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('sync-ai-mode', false); });

                // 🟢 Visual Language Detection enforced via prompt rules now
                let codePrompt1 = PROMPTS.INTERVIEW_BRUTE_FORCE;
                let voicePrompt = PROMPTS.VOICE_INITIAL_CONTEXT;

                if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') codePrompt1 = '@Fast ' + codePrompt1;
                if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') voicePrompt = '@Fast ' + voicePrompt;

                await sendPayloadToWindow(codeWebWindow, codePrompt1, accumulatedScreenshots);
                setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots); }, 1500);

                // 🟢 STAGE 2: SHADOW OPTIMIZATION (Think Mode) after 30 seconds
                setTimeout(async () => {
                    if (global.currentSessionMode !== 'proctored_live_interview') return; // Cancel if exited
                    
                    global.isThinkModeActive = true;
                    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('sync-ai-mode', true); });

                    let codePrompt2 = PROMPTS.INTERVIEW_OPTIMIZED;
                    if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') codePrompt2 = '@Pro ' + codePrompt2;

                    // Send silently to Code Brain again (using the SAME screenshots)
                    await sendPayloadToWindow(codeWebWindow, codePrompt2, accumulatedScreenshots);
                    accumulatedScreenshots = []; // Clear them after the 2nd payload fires
                }, 30000); 

            } else {
                // 🟢 STANDARD OA LOGIC
                let codePrompt = PROMPTS.OA_AUTOMATION(language); // Fixed the language injection!
                let voicePrompt = PROMPTS.VOICE_CONTEXT;
                if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') codePrompt = getModePrefix() + codePrompt;
                if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') voicePrompt = getModePrefix() + voicePrompt;

                await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
                setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots); accumulatedScreenshots = []; }, 1500);
            }
            return true;
        } catch(e) { return false; }
    });

    // 🟢 NEW: Sync Optimized Code to Voice Brain
    ipcMain.handle('sync-optimized-to-voice', async (event, optimizedCodeText) => {
        try {
            let finalPrompt = PROMPTS.VOICE_SYNC_OPTIMIZED + optimizedCodeText;
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') finalPrompt = '@Fast ' + finalPrompt; // Ensure voice stays fast
            await sendPayloadToWindow(voiceWebWindow, finalPrompt, []);
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
        
        if (isTurningOn) {
            // 🟢 Use the universal Smart Helper for the Radial trigger!
            await ensureVoiceAndMic(voiceWebWindow);
            return true;
        } else {
            // Simply click the "Turn off microphone" button to mute
            await voiceWebWindow.webContents.executeJavaScript(`(() => {
                let mute = Array.from(document.querySelectorAll('button')).find(b => {
                    let a = (b.getAttribute('aria-label')||'').toLowerCase();
                    let t = (b.getAttribute('title')||'').toLowerCase();
                    return a.includes('turn off microphone') || t.includes('turn off microphone') || a === 'mute';
                });
                if (mute) mute.click();
            })()`).catch(()=>{});
            return true;
        }
    });

    // 🟢 THE NATIVE TEXT-INJECTOR TYPING SEQUENCE
    ipcMain.handle('toggle-ai-mode', async () => {
        try {
            global.isThinkModeActive = !global.isThinkModeActive;
            const modeWord = global.isThinkModeActive ? 'Pro' : 'Fast';

            // Sync the UI instantly so Radial Minimap updates
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) w.webContents.send('sync-ai-mode', global.isThinkModeActive);
            });

            const injectModeNative = async (win) => {
                if (!win || win.isDestroyed()) return;
                
                await win.webContents.executeJavaScript(`
                    (() => {
                        const box = document.querySelector('rich-textarea p, p.text-input-field-paragraph, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                        if (box) {
                            box.focus();
                            // Shift cursor to the end
                            if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                                const range = document.createRange();
                                range.selectNodeContents(box);
                                range.collapse(false);
                                const sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                        }
                    })();
                `);

                // 1. Type '@'
                win.webContents.insertText('@');
                
                // 2. Wait 600ms for Gemini to process the '@' and pop up the menu
                await new Promise(r => setTimeout(r, 600)); 
                
                // 3. Type the word ('Pro' or 'Fast')
                win.webContents.insertText(modeWord);
                
                // 4. Wait 400ms for options to filter in the menu
                await new Promise(r => setTimeout(r, 400));
                
                // 5. Press Enter to lock it into the Blue UI Chip!
                win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            };

            // Execute on Gemini windows
            if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') await injectModeNative(codeWebWindow);
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') await injectModeNative(voiceWebWindow);

            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('set-ai-provider', async (event, targetIdx) => { return AI_CONFIGS[targetIdx].name; });

    ipcMain.handle('check-active-ai', () => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) { return { name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: "" }; }
        return {name: AI_CONFIGS[activeLoadout.voiceEngine].name, url: voiceWebWindow.webContents.getURL() };
    });

    ipcMain.handle('send-oa-refactor', async () => {
        try {
            let codePrompt = PROMPTS.REFACTOR;
            let voicePrompt = PROMPTS.VOICE_CONTEXT;
            
            if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') codePrompt = getModePrefix() + codePrompt;
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') voicePrompt = getModePrefix() + voicePrompt;

            await sendPayloadToWindow(codeWebWindow, codePrompt, []);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, []); }, 1500);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        try {
            if (accumulatedScreenshots.length === 0) return false;
            let codePrompt = PROMPTS.FIX_ERROR;
            let voicePrompt = PROMPTS.VOICE_CONTEXT;
            
            if (AI_CONFIGS[activeLoadout.codeEngine].name === 'Gemini') codePrompt = getModePrefix() + codePrompt;
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') voicePrompt = getModePrefix() + voicePrompt;

            await sendPayloadToWindow(codeWebWindow, codePrompt, accumulatedScreenshots);
            setTimeout(async () => { await sendPayloadToWindow(voiceWebWindow, voicePrompt, accumulatedScreenshots); accumulatedScreenshots = []; }, 1500);
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
        try { 
            if (!text) return; 
            let finalPrompt = text;
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') finalPrompt = getModePrefix() + text;
            await sendPayloadToWindow(voiceWebWindow, finalPrompt, []); 
            return true; 
        } catch(e) { return false; }
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