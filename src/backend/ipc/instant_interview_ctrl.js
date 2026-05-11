const { BrowserWindow, desktopCapturer, screen, clipboard, nativeImage } = require('electron');
const storage = require('../storage');

const AI_CONFIGS = [
    { name: 'ChatGPT', url: 'https://chatgpt.com' },
    { name: 'Gemini', url: 'https://gemini.google.com/app' },
    { name: 'Grok', url: 'https://grok.com' }
];

let transcriptVault = "";
let codeVault = "";
let scrapingInterval = null;

let codeWin = null;
let voiceWin = null;
let isSwapped = false;
let isHidden = false; 
let activeLoadout = {};

let isHardStealthLocked = false;
let cornerRadarInterval = null;
let dwellTimer = null;

// 🟢 Audio Hijack
const injectAudioHijack = async (win) => {
    if (!win || win.isDestroyed()) return;
    
    const prefs = storage.getPreferences();
    const mode = prefs.audioMode || 'speaker_only';
    const micId = prefs.selectedMic || 'default';
    
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        if (!sources || sources.length === 0) return;
        const sourceId = sources[0].id;

        const hijackScript = `
            if (!window.__micHijacked) {
                window.__micHijacked = true;
                const mode = '${mode}';
                const micId = '${micId}';
                const sourceId = '${sourceId}';
                const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia ? navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices) : null;
                
                navigator.mediaDevices.getUserMedia = async (constraints) => {
                    if (constraints && constraints.audio) {
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            if (ctx.state === 'suspended') await ctx.resume();
                            const dest = ctx.createMediaStreamDestination();
                            
                            if (mode === 'speaker_only' || mode === 'both') {
                                try {
                                    let sysStream;
                                    try {
                                        sysStream = await originalGetUserMedia({ 
                                            audio: { mandatory: { chromeMediaSource: 'desktop' } }, 
                                            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } 
                                        });
                                    } catch (err1) {
                                        if (originalGetDisplayMedia) sysStream = await originalGetDisplayMedia({ audio: true, video: true });
                                    }
                                    if (sysStream) {
                                        const sysAudioTrack = sysStream.getAudioTracks()[0];
                                        if (sysAudioTrack) {
                                            const sysSource = ctx.createMediaStreamSource(new MediaStream([sysAudioTrack]));
                                            sysSource.connect(dest);
                                        }
                                        sysStream.getVideoTracks().forEach(t => t.stop());
                                    }
                                } catch(e) { }
                            }

                            if (mode === 'mic_only' || mode === 'both') {
                                try {
                                    const audioConstraints = micId && micId !== 'default' 
                                        ? { deviceId: { exact: micId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
                                        : { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

                                    const micStream = await originalGetUserMedia({ audio: audioConstraints });
                                    const micTrack = micStream.getAudioTracks()[0];
                                    if (micTrack) {
                                        const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                                        micSource.connect(dest);
                                    }
                                } catch(e) { }
                            }
                            return dest.stream;
                        } catch (err) { return originalGetUserMedia(constraints); }
                    }
                    return originalGetUserMedia(constraints);
                };
            }
            true;
        `;
        await win.webContents.executeJavaScript(hijackScript);
    } catch (e) {}
};

const applyWindowBounds = () => {
    if (!codeWin || !voiceWin || codeWin.isDestroyed() || voiceWin.isDestroyed()) return;
    const prefs = storage.getPreferences();
    
    // Fallback defaults if they haven't set them yet
    const ii = prefs.instantInterview || {
        codeW: 48, codeH: 85, codeX: 1, codeY: 7,
        voiceW: 48, voiceH: 85, voiceX: 51, voiceY: 7
    };
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;

    // Flip configurations if the user swapped the panes!
    const cConf = isSwapped ? {w: ii.voiceW, h: ii.voiceH, x: ii.voiceX, y: ii.voiceY} : {w: ii.codeW, h: ii.codeH, x: ii.codeX, y: ii.codeY};
    const vConf = isSwapped ? {w: ii.codeW, h: ii.codeH, x: ii.codeX, y: ii.codeY} : {w: ii.voiceW, h: ii.voiceH, x: ii.voiceX, y: ii.voiceY};

    codeWin.setBounds({
        x: Math.floor(sw * (cConf.x / 100)),
        y: Math.floor(sh * (cConf.y / 100)),
        width: Math.floor(sw * (cConf.w / 100)),
        height: Math.floor(sh * (cConf.h / 100))
    });
    voiceWin.setBounds({
        x: Math.floor(sw * (vConf.x / 100)),
        y: Math.floor(sh * (vConf.y / 100)),
        width: Math.floor(sw * (vConf.w / 100)),
        height: Math.floor(sh * (vConf.h / 100))
    });
};

// 🟢 FIX: Aggressive 1.5s Background Scraper (Creates the Transcription and Stores it)
const startVaultScrapers = () => {
    if (scrapingInterval) clearInterval(scrapingInterval);
    
    scrapingInterval = setInterval(async () => {
        if (voiceWin && !voiceWin.isDestroyed()) {
            const voiceScript = `
                (() => {
                    try {
                        let msgs = [];
                        if (window.location.hostname.includes('grok')) {
                            msgs = Array.from(document.querySelectorAll('.message-row, div.items-end > div')).filter(el => !el.querySelector('.prose') && !el.classList.contains('prose'));
                        } else if (window.location.hostname.includes('chatgpt')) {
                            msgs = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
                        } else {
                            msgs = Array.from(document.querySelectorAll('user-query, [data-testid="user-message"], .user-message'));
                        }
                        let texts = msgs.map(el => (el.innerText || '').trim()).filter(t => t.length > 0 && !t.includes('SYSTEM DIRECTIVE') && !t.includes('TRACKER DIRECTIVE'));
                        return texts.slice(-3).join('\\n\\n');
                    } catch(e) { return ""; }
                })();
            `;
            const vText = await voiceWin.webContents.executeJavaScript(voiceScript).catch(()=>"");
            if (vText && vText.trim() !== "") transcriptVault = vText;
        }

        if (codeWin && !codeWin.isDestroyed()) {
            const codeScript = `
                (() => {
                    try {
                        const sel = window.location.hostname.includes('chatgpt') ? 'div[data-message-author-role="assistant"]' :
                                    window.location.hostname.includes('grok') ? '.prose' : 'model-response';
                        const msgs = Array.from(document.querySelectorAll(sel));
                        if(msgs.length === 0) return "";
                        const lastMsg = msgs[msgs.length - 1].innerText || "";
                        
                        if(lastMsg.includes('[CODE_START]') && lastMsg.includes('[CODE_END]')) {
                            return lastMsg.split('[CODE_START]')[1].split('[CODE_END]')[0].trim();
                        }
                        if(lastMsg.includes('\`\`\`')) {
                            return lastMsg.split('\`\`\`')[1].trim();
                        }
                        return lastMsg.trim(); 
                    } catch(e) { return ""; }
                })();
            `;
            const cText = await codeWin.webContents.executeJavaScript(codeScript).catch(()=>"");
            if (cText && cText.trim() !== "") codeVault = cText;
        }
    }, 1500); // Runs incredibly fast in the background
};

// 🟢 NEW: The Panic Corner Radar (With 16-Zone Geometry & Zero-Lag CPU Fix)
const startCornerRadar = () => {
    if (cornerRadarInterval) clearInterval(cornerRadarInterval);
    let isDwelling = false;
    let waitForExit = false; 
    let tickCounter = 0; // 🟢 FIX: Used to throttle disk reads
    let cachedPrefs = storage.getPreferences().instantInterview || {};
    
    cornerRadarInterval = setInterval(() => {
        if (!codeWin || !voiceWin || codeWin.isDestroyed() || voiceWin.isDestroyed()) return;
        
        // 🟢 FIX: Only read the hard drive once every 1 second (20 ticks) instead of every 50ms!
        tickCounter++;
        if (tickCounter % 20 === 0) {
            cachedPrefs = storage.getPreferences().instantInterview || {};
        }

        const delaySec = cachedPrefs.unhideDelay !== undefined ? cachedPrefs.unhideDelay : 5;
        const panicZone = cachedPrefs.panicZone || 'top_right';
        const delayMs = delaySec * 1000;
        
        if (panicZone === 'none') return; 
        
        const point = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(point);
        if (!display) return;
        
        const { x: dx, y: dy, width: w, height: h } = display.bounds;
        const relativeX = point.x - dx;
        const relativeY = point.y - dy;
        
        // 🟢 16-Zone Calculation Engine
        const getActiveZone = (x, y, w, h) => {
            const edge = 15; 
            const cornerSize = 15; 
            const centerX = 40; 
            const centerY = 40; 

            let isTop = y <= edge;
            let isBottom = y >= h - edge;
            let isLeft = x <= edge;
            let isRight = x >= w - edge;

            if (!isTop && !isBottom && !isLeft && !isRight) return 'none';

            const xPct = (x / w) * 100;
            const yPct = (y / h) * 100;

            const getSeg = (pct, centerSize, cSize) => {
                if (pct <= cSize) return '1';
                if (pct >= 100 - cSize) return '5';
                const midStart = 50 - (centerSize / 2);
                const midEnd = 50 + (centerSize / 2);
                if (pct >= midStart && pct <= midEnd) return '3';
                if (pct > cSize && pct < midStart) return '2';
                return '4';
            };

            if (isTop) {
                const s = getSeg(xPct, centerX, cornerSize);
                return s === '1' ? 'top_left' : s === '2' ? 'top_mid_left' : s === '3' ? 'top_center' : s === '4' ? 'top_mid_right' : 'top_right';
            } else if (isBottom) {
                const s = getSeg(xPct, centerX, cornerSize);
                return s === '1' ? 'bottom_left' : s === '2' ? 'bottom_mid_left' : s === '3' ? 'bottom_center' : s === '4' ? 'bottom_mid_right' : 'bottom_right';
            } else if (isLeft) {
                const s = getSeg(yPct, centerY, cornerSize);
                return s === '1' ? 'top_left' : s === '2' ? 'left_mid_top' : s === '3' ? 'middle_left' : s === '4' ? 'left_mid_bottom' : 'bottom_left';
            } else if (isRight) {
                const s = getSeg(yPct, centerY, cornerSize);
                return s === '1' ? 'top_right' : s === '2' ? 'right_mid_top' : s === '3' ? 'middle_right' : s === '4' ? 'right_mid_bottom' : 'bottom_right';
            }
            return 'none';
        };

        const currentZone = getActiveZone(relativeX, relativeY, w, h);
        const isInPanicZone = currentZone === panicZone;
        
        if (isInPanicZone) {
            if (waitForExit) return; 

            if (!isHidden) {
                isHidden = true;
                isHardStealthLocked = true;
                
                codeWin.setOpacity(0);
                codeWin.setIgnoreMouseEvents(true, { forward: true });
                voiceWin.setOpacity(0);
                voiceWin.setIgnoreMouseEvents(true, { forward: true });
                
                const mainWin = BrowserWindow.getAllWindows().find(win => win.webContents && win.webContents.getURL().includes('index.html'));
                if (mainWin) mainWin.webContents.send('show-radial-toast', '🔒 PANIC HIDE ENGAGED');
                
            } else if (isHardStealthLocked && !isDwelling) {
                isDwelling = true;
                dwellTimer = setTimeout(() => {
                    isHidden = false;
                    isHardStealthLocked = false;
                    isDwelling = false;
                    waitForExit = true; 
                    
                    codeWin.setOpacity(1);
                    codeWin.setIgnoreMouseEvents(false, { forward: true });
                    voiceWin.setOpacity(1);
                    voiceWin.setIgnoreMouseEvents(false, { forward: true });
                    codeWin.showInactive();
                    voiceWin.showInactive();
                    
                    const mainWin = BrowserWindow.getAllWindows().find(win => win.webContents && win.webContents.getURL().includes('index.html'));
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '🔓 STEALTH UNLOCKED');
                }, delayMs);
            }
        } else {
            waitForExit = false; 
            if (isDwelling) {
                isDwelling = false;
                if (dwellTimer) {
                    clearTimeout(dwellTimer);
                    dwellTimer = null;
                }
            }
        }
    }, 50);
};

// 🟢 Native Paster Engine (Upgraded for Gemini & Grok)
const fireNativePayload = async (win, text, images = [], modeTag = null, autoSubmit = true) => {
    if (!win || win.isDestroyed()) return false;
    const isGrok = win.webContents.getURL().includes('grok.com');
    const providerName = isGrok ? 'Grok' : (win.webContents.getURL().includes('gemini') ? 'Gemini' : 'ChatGPT');
    
    // 🟢 FIX: Define the OS modifier for pasting
    const modifier = process.platform === 'darwin' ? 'meta' : 'control';

    // 🟢 FIX: Bulletproof selectors for Grok (textarea) and Gemini (contenteditable)
    const selector = 'textarea, [contenteditable="true"][role="textbox"], rich-textarea p, #prompt-textarea, .ql-editor';

    const isBoxReady = await win.webContents.executeJavaScript(`(() => {
        try {
            const el = document.querySelector('${selector}');
            if (el) { el.focus(); return true; }
            return false;
        } catch(e) { return false; }
    })()`);

    if (!isBoxReady) return false;

    const focusAndMoveToEnd = async () => {
        await win.webContents.executeJavaScript(`(() => {
            try {
                const box = document.querySelector('${selector}');
                if (box) {
                    box.focus();
                    if (box.tagName === 'TEXTAREA' || box.tagName === 'INPUT') {
                        box.selectionStart = box.value.length;
                        box.selectionEnd = box.value.length;
                    } else if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                        const range = document.createRange();
                        range.selectNodeContents(box);
                        range.collapse(false);
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                }
            } catch(e) {}
        })();`);
    };

    // 🟢 1. PASTE IMAGES FIRST (This was missing!)
    if (images && images.length > 0) {
        for (let imgData of images) {
            if (providerName === 'Grok') {
                await win.webContents.executeJavaScript(`
                    (async () => {
                        try {
                            const res = await fetch("${imgData}");
                            const blob = await res.blob();
                            const file = new File([blob], "screenshot.png", { type: blob.type });
                            const dt = new DataTransfer();
                            dt.items.add(file);

                            const fileInput = document.querySelector('input[type="file"]');
                            if (fileInput) {
                                fileInput.files = dt.files;
                                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }

                            const el = document.querySelector('textarea[placeholder*="Grok"], textarea');
                            if (el) {
                                el.focus();
                                const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
                                el.dispatchEvent(pasteEvent);
                            }
                        } catch(e) {}
                    })();
                `);
            } else {
                const img = nativeImage.createFromDataURL(imgData);
                clipboard.writeImage(img);
                
                await focusAndMoveToEnd();
                
                win.webContents.sendInputEvent({ type: 'keyDown', modifiers: [modifier], keyCode: 'V' });
                win.webContents.sendInputEvent({ type: 'keyUp', modifiers: [modifier], keyCode: 'V' });
            }
            
            await new Promise(r => setTimeout(r, 600)); 
            await focusAndMoveToEnd(); // Explicitly deselect image by moving cursor to end
            await new Promise(r => setTimeout(r, 100));
        }
    }

    // 🟢 2. Paste Text Natively
    if (text) {
        await focusAndMoveToEnd();
        win.webContents.insertText(text); 
        await new Promise(r => setTimeout(r, 400));
        await focusAndMoveToEnd(); 
    }

    // 🟢 3. Typewriter Effect for @Pro and @Fast (Gemini Only)
    if (modeTag && providerName === 'Gemini') {
        await focusAndMoveToEnd();
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
        await new Promise(r => setTimeout(r, 100));
        
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['shift'], keyCode: 'Enter' });
        await new Promise(r => setTimeout(r, 100));

        // 1. Type @
        win.webContents.insertText('@');
        
        // 2. Wait for the dropdown to load
        await new Promise(r => setTimeout(r, 800));
        
        // 3. Type Pro or Fast
        for (let i = 0; i < modeTag.length; i++) {
            win.webContents.insertText(modeTag[i]);
            await new Promise(r => setTimeout(r, 150));
        }
        
        // 4. Wait for filtering
        await new Promise(r => setTimeout(r, 800));
        
        // 5. Hit Enter to lock the chip
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
        
        await new Promise(r => setTimeout(r, 400));
    }

    // 🟢 4. Submit
    if (autoSubmit) {
        await focusAndMoveToEnd();
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
    }
    return true;
};

global.executeInstantAction = async (action) => {
    if (!codeWin || !voiceWin || codeWin.isDestroyed() || voiceWin.isDestroyed()) return;
    
    // 🟢 FIX: Global Stealth Lock for Instant Interview
    if (isHidden && action !== 'hide_unhide') {
        console.log("[Instant Interview] Action blocked because windows are hidden!");
        return;
    }

    // 🟢 FIX: Direction-Aware Swiping
    if (action === 'sync_left_to_right') {
        action = isSwapped ? 'sync_v_to_c' : 'sync_c_to_v';
        return global.executeInstantAction(action);
    }
    if (action === 'sync_right_to_left') {
        action = isSwapped ? 'sync_c_to_v' : 'sync_v_to_c';
        return global.executeInstantAction(action);
    }

    const PROMPTS = global.PROMPTS || {};
    const mainWin = BrowserWindow.getAllWindows().find(w => w.webContents && w.webContents.getURL().includes('index.html'));
    console.log("[Instant Interview] Executing:", action);
    
    switch(action) {
        case 'hide_unhide':
            try {
                if (isHidden && isHardStealthLocked) {
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '🔒 CORNER LOCK ACTIVE');
                    return;
                }
                
                isHidden = !isHidden;
                const opacity = isHidden ? 0 : 1;
                codeWin.setOpacity(opacity); codeWin.setIgnoreMouseEvents(isHidden, { forward: true });
                voiceWin.setOpacity(opacity); voiceWin.setIgnoreMouseEvents(isHidden, { forward: true });
                if (!isHidden) { codeWin.showInactive(); voiceWin.showInactive(); }
            } catch(e) { console.error("Hide/Unhide Failed:", e); }
            break;
            
        case 'swap_windows':
            try {
                isSwapped = !isSwapped;
                applyWindowBounds();
                
                if (!isHidden) {
                    codeWin.showInactive();
                    voiceWin.showInactive();
                }
                
                if (mainWin) mainWin.webContents.send('show-radial-toast', '🔀 SWAPPED');
            } catch(e) { console.error("Swap Windows Failed:", e); }
            break;

        case 'capture':
            try {
                const src = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
                if (src && src.length > 0) {
                    const imgData = src[0].thumbnail.toDataURL();
                    await fireNativePayload(codeWin, "", [imgData], null, false);
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '📸 ATTACHED');
                }
            } catch(e) { console.log("[Instant] Capture failed, ignored."); }
            break;
            
        case 'send_pro':
            try {
                await fireNativePayload(codeWin, PROMPTS.INTERVIEW_OPTIMIZED || "Provide the optimal solution.", [], 'Pro', true);
            } catch(e) { console.error("Send Pro Failed:", e); }
            break;
        
        case 'sync_v_to_c':
            // 🟢 FIX: Ignore poisoned vault memory and force a fresh DOM scrape!
            try {
                let finalTranscript = await voiceWin.webContents.executeJavaScript(`
                    (() => {
                        try {
                            // 1. Target the exact chat bubbles
                            const nodes = Array.from(document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]'));
                            if (nodes.length === 0) return "";
                            
                            // 2. Grab the last two (Prompt + Response)
                            const lastTwo = nodes.slice(-2);
                            
                            return lastTwo.map(node => {
                                // 3. Clone to avoid breaking the real page
                                const clone = node.cloneNode(true);
                                
                                // 4. Violently delete ANY buttons inside the bubble just in case
                                clone.querySelectorAll('button, svg, [role="button"]').forEach(b => b.remove());
                                
                                return clone.innerText.trim();
                            }).filter(t => t.length > 0).join('\\n\\n[What I responded]:\\n');
                        } catch(e) { return ""; }
                    })();
                `).catch(()=>"");

                if (!finalTranscript || finalTranscript.trim() === "") {
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '⚠️ NO TRANSCRIPT READY');
                    return;
                }

                // 5. Build prompt and fire!
                const v2cPrompt = `SYSTEM DIRECTIVE: Analyze this scenario. Here is the recent verbal conversation between me and the interviewer:\n\nInterviewer:"${finalTranscript}"\n\nProvide the optimal solution(if he is asking for an optimal solution) or give me the response what should i say.`;
                
                await fireNativePayload(codeWin, v2cPrompt, [], 'Pro', true);
                if (mainWin) mainWin.webContents.send('show-radial-toast', '⬅️ TRANSCRIPT SYNCED');
            } catch(e) { console.error("Sync V to C Failed:", e); }
            break;

        case 'sync_c_to_v':
            // 🟢 FIX: Grab the ENTIRE response (Code + Explanations) directly from the DOM
            try {
                let finalCode = await codeWin.webContents.executeJavaScript(`
                    (() => {
                        try {
                            // 1. Multi-model selector (Works for Gemini, Grok, and ChatGPT)
                            const sel = window.location.hostname.includes('chatgpt') ? 'div[data-message-author-role="assistant"]' :
                                        window.location.hostname.includes('grok') ? '.prose' : 'model-response';
                            
                            const responses = Array.from(document.querySelectorAll(sel)).filter(el => {
                                if (el.closest('[data-testid="user-message"]') || el.closest('[data-message-author-role="user"]') || el.closest('.user-message')) return false;
                                return (el.innerText || '').trim().length > 0;
                            });
                            
                            if (responses.length === 0) return "";
                            
                            // 2. 🟢 Return the literal entire text block, NO splitting or cutting!
                            return responses[responses.length - 1].innerText.trim();
                        } catch(e) { return ""; }
                    })();
                `).catch(()=>"");

                if (!finalCode || finalCode.trim() === "") {
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '⚠️ NO CODE READY');
                    return;
                }

                // 3. Send the full payload to the Voice Brain
                const c2vPrompt = (PROMPTS.VOICE_SYNC_OPTIMIZED || "Explain this code simply:") + "\n\nFULL AI RESPONSE:\n\n" + finalCode;
                await fireNativePayload(voiceWin, c2vPrompt, [], 'Fast', true);
                if (mainWin) mainWin.webContents.send('show-radial-toast', '➡️ FULL RESPONSE SYNCED');
            } catch(e) { console.error("Sync C to V Failed:", e); }
            break;

        case 'on_the_go':
            try {
                if (!codeVault) return;
                const otgPrompt = (PROMPTS.ON_THE_GO_DICTATOR || "Break this code down for me to type out:") + '\n\n### THE CODE TO DICTATE:\n' + codeVault;
                await fireNativePayload(codeWin, otgPrompt, [], 'Pro', true);
            } catch(e) { console.error("OTG Failed:", e); }
            break;

        case 'dry_run':
            try {
                let images = [];
                try {
                    const srcDry = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
                    if (srcDry && srcDry.length > 0) images.push(srcDry[0].thumbnail.toDataURL());
                } catch(e) {}
                
                const dryRunPrompt = (PROMPTS.FUSION_DRY_RUN || "Do a dry run of this:") + '\n\n### RECENT TRANSCRIPT CONTEXT:\n' + transcriptVault;
                await fireNativePayload(codeWin, dryRunPrompt, images, 'Pro', true);
            } catch(e) { console.error("Dry Run Failed:", e); }
            break;
            
        case 'restart_voice':
            try {
                const currentUrl = voiceWin.webContents.getURL(); 
                voiceWin.loadURL(currentUrl);
                
                voiceWin.webContents.once('did-finish-load', () => {
                    injectAudioHijack(voiceWin);
                    setTimeout(async () => {
                        const recoveryPrompt = `SYSTEM DIRECTIVE: My browser refreshed. We are resuming the live interview. Here is the context of what we discussed so far:\n\n${transcriptVault || 'No prior context.'}\n\nHere is the code we currently have:\n\n${codeVault || 'No code yet.'}\n\nAcknowledge silently. Wait for me to ask for an explanation or dry run.`;
                        await fireNativePayload(voiceWin, recoveryPrompt, [], 'Fast', true);
                        if (mainWin) mainWin.webContents.send('show-radial-toast', '🔄 VOICE REFRESHED');
                    }, 5000); 
                });
            } catch(e) { console.error("Restart Voice Failed:", e); }
            break;
            
        case 'abort':
            try {
                if (scrapingInterval) clearInterval(scrapingInterval);
                if (cornerRadarInterval) clearInterval(cornerRadarInterval); // 🟢 Clean up radar
                if (dwellTimer) clearTimeout(dwellTimer); // 🟢 Clean up timer
                isHardStealthLocked = false;

                if (codeWin && !codeWin.isDestroyed()) codeWin.destroy();
                if (voiceWin && !voiceWin.isDestroyed()) voiceWin.destroy();
                
                if (mainWin) {
                    mainWin.show();
                    mainWin.setOpacity(1);
                    mainWin.setIgnoreMouseEvents(false);
                    mainWin.moveTop();
                    mainWin.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('return-to-main'));`).catch(()=>{});
                }
            } catch(e) { console.error("Abort Failed:", e); }
            break;
    }
};

const launchInstantInterview = (isPreview = false) => {
    console.log("[Instant Interview] Spawning 2-Window Native Mode...");
    
    if (!isPreview) {
        const mainWin = BrowserWindow.getAllWindows().find(w => w.webContents && w.webContents.getURL().includes('index.html'));
        if (mainWin) {
            mainWin.setOpacity(0);
            mainWin.setIgnoreMouseEvents(true);
        }
    }

    const prefs = storage.getPreferences();
    const iiPrefs = prefs.instantInterview || {};

    const cIdx = iiPrefs.codeEngine !== undefined ? parseInt(iiPrefs.codeEngine) : 1;
    const vIdx = iiPrefs.voiceEngine !== undefined ? parseInt(iiPrefs.voiceEngine) : 0;
    const cProfileId = iiPrefs.codeProfileId || '2';
    const vProfileId = iiPrefs.voiceProfileId || '1';
    
    activeLoadout = { codeEngine: cIdx, codeProfileId: cProfileId, voiceEngine: vIdx, voiceProfileId: vProfileId };

    const codeProvider = AI_CONFIGS[cIdx];
    const voiceProvider = AI_CONFIGS[vIdx];

    if (codeWin && !codeWin.isDestroyed()) codeWin.destroy();
    if (voiceWin && !voiceWin.isDestroyed()) voiceWin.destroy();

    const sharedOpts = { show: true, alwaysOnTop: true, skipTaskbar: true, frame: false, autoHideMenuBar: true, resizable: false };

    codeWin = new BrowserWindow({ ...sharedOpts, title: `⚡ Code Brain: ${codeProvider.name}`, webPreferences: { partition: `persist:ai_profile_${cProfileId}` }});
    codeWin.setContentProtection(true);
    codeWin.webContents.setAudioMuted(true);
    if (process.platform === 'win32') codeWin.setAlwaysOnTop(true, 'screen-saver', 1);
    codeWin.loadURL(codeProvider.url);
    
    codeWin.webContents.on('dom-ready', () => { codeWin.webContents.insertCSS('* { cursor: default !important; }'); });

    voiceWin = new BrowserWindow({ ...sharedOpts, title: `⚡ Voice Brain: ${voiceProvider.name}`, webPreferences: { partition: `persist:ai_profile_${vProfileId}` }});
    voiceWin.setContentProtection(true);
    voiceWin.webContents.setAudioMuted(true); 
    if (process.platform === 'win32') voiceWin.setAlwaysOnTop(true, 'screen-saver', 1);
    voiceWin.loadURL(voiceProvider.url);
    
    voiceWin.webContents.on('dom-ready', () => { 
        voiceWin.webContents.insertCSS('* { cursor: default !important; }');
        injectAudioHijack(voiceWin); 
    });

    applyWindowBounds();
    startVaultScrapers();
    startCornerRadar();
};

module.exports = { launchInstantInterview, applyWindowBounds };