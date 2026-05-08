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
    const iiPrefs = prefs.instantInterview || { width: 45, gap: 2 };
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: sw, height: sh } = primaryDisplay.workAreaSize;

    const boxWidth = Math.floor(sw * (iiPrefs.width / 100));
    const gapWidth = Math.floor(sw * (iiPrefs.gap / 100));
    const boxHeight = Math.floor(sh * 0.85); 
    const yPos = Math.floor((sh - boxHeight) / 2);

    const leftX = Math.floor((sw / 2) - (gapWidth / 2) - boxWidth);
    const rightX = Math.floor((sw / 2) + (gapWidth / 2));

    const codeX = isSwapped ? rightX : leftX;
    const voiceX = isSwapped ? leftX : rightX;

    codeWin.setBounds({ x: codeX, y: yPos, width: boxWidth, height: boxHeight });
    voiceWin.setBounds({ x: voiceX, y: yPos, width: boxWidth, height: boxHeight });
};

// 🟢 FIX: Aggressive 1.5s Background Scraper (Creates the Transcription and Stores it)
const startVaultScrapers = () => {
    if (scrapingInterval) clearInterval(scrapingInterval);
    
    scrapingInterval = setInterval(async () => {
        if (voiceWin && !voiceWin.isDestroyed()) {
            const voiceScript = `
                (() => {
                    try {
                        const msgs = Array.from(document.querySelectorAll('[data-testid="user-message"], .message, .user-message, user-query, .prose'));
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

// 🟢 Native Paster Engine (Upgraded Grok Textarea Handler)
const fireNativePayload = async (win, text, images = [], modeTag = null, autoSubmit = true) => {
    if (!win || win.isDestroyed()) return false;
    
    const isGrok = win.webContents.getURL().includes('grok.com');
    const providerName = isGrok ? 'Grok' : (win.webContents.getURL().includes('gemini') ? 'Gemini' : 'ChatGPT');

    const selector = 'textarea[placeholder*="Ask Grok"], textarea[placeholder*="How can Grok help"], textarea[placeholder*="Grok"], textarea[placeholder*="Ask Gemini"], rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor';

    const isBoxReady = await win.webContents.executeJavaScript(`(() => { try { const el = document.querySelector('${selector}'); if (el) { el.focus(); return true; } return false; } catch(e) { return false; } })()`);
    if (!isBoxReady) return false;

    const modifier = process.platform === 'darwin' ? 'meta' : 'control';

    const focusAndMoveToEnd = async () => {
        await win.webContents.executeJavaScript(`(() => { 
            try { 
                const box = document.querySelector('${selector}'); 
                if (box) { 
                    box.focus(); 
                    
                    // 🟢 FIX: Standard <textarea> logic (Grok) vs ContentEditable logic (ChatGPT/Gemini)
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

    // 1. Paste Images First
    if (images && images.length > 0) {
        for (let imgData of images) {
            try {
                if (isGrok) {
                    await win.webContents.executeJavaScript(`
                        (async () => {
                            try {
                                const res = await fetch("${imgData}");
                                const blob = await res.blob();
                                const file = new File([blob], "screenshot.png", { type: blob.type });
                                const dt = new DataTransfer(); dt.items.add(file);
                                const fileInput = document.querySelector('input[type="file"]');
                                if (fileInput) { fileInput.files = dt.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); }
                                const el = document.querySelector('${selector}');
                                if (el) { el.focus(); const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }); el.dispatchEvent(pasteEvent); }
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
                await new Promise(r => setTimeout(r, 800)); 
                await focusAndMoveToEnd(); 
            } catch(e) { console.log("Screenshot failed"); }
        }
    }

    // 2. Paste Text Second
    if (text) {
        await focusAndMoveToEnd();
        clipboard.writeText(text);
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: [modifier], keyCode: 'V' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: [modifier], keyCode: 'V' });
        await new Promise(r => setTimeout(r, 400));
        await focusAndMoveToEnd();
    }

    // 3. Typewriter Effect for @Pro and @Fast
    if (modeTag && providerName === 'Gemini') {
        await focusAndMoveToEnd();
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
        await new Promise(r => setTimeout(r, 100));
        
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['shift'], keyCode: 'Enter' });
        
        win.webContents.insertText(' @');
        await new Promise(r => setTimeout(r, 800)); 
        
        for (let i = 0; i < modeTag.length; i++) {
            win.webContents.insertText(modeTag[i]);
            await new Promise(r => setTimeout(r, 200)); 
        }
        
        await new Promise(r => setTimeout(r, 800)); 
        
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' }); 
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' }); 
        await new Promise(r => setTimeout(r, 300));
        
        win.webContents.insertText(' ');
        await new Promise(r => setTimeout(r, 400)); 
    }

    // 4. Submit
    if (autoSubmit) {
        if (images && images.length > 0 && providerName === 'Gemini') {
            await new Promise(r => setTimeout(r, 2500)); 
        }

        if (isGrok) {
            await new Promise(r => setTimeout(r, 200));
            // 🟢 FIX: Grok often ignores the button click if the React state isn't updated. Force Enter key directly.
            await focusAndMoveToEnd();
            win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
            win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
        } else {
            const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Enter" i]';
            let isReady = false, attempts = 0;
            while (!isReady && attempts < 10) {
                isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
                if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
            }
            await new Promise(r => setTimeout(r, 400)); 
            const sent = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) { btn.click(); return true; } return false; } catch(e) { return false; } })()`);
            if (!sent) {
                await focusAndMoveToEnd();
                win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); 
                win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }
    }
    return true;
};

global.executeInstantAction = async (action) => {
    if (!codeWin || !voiceWin || codeWin.isDestroyed() || voiceWin.isDestroyed()) return;
    
    const PROMPTS = global.PROMPTS || {};
    const mainWin = BrowserWindow.getAllWindows().find(w => w.webContents && w.webContents.getURL().includes('index.html'));

    console.log("[Instant Interview] Executing:", action);

    switch(action) {
        case 'hide_unhide':
            try {
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
            // 🟢 FIX: Instant Memory Dump - Swipe Left
            try {
                if (!transcriptVault || transcriptVault.trim() === "") {
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '⚠️ NO TRANSCRIPT READY');
                    return;
                }
                const v2cPrompt = `SYSTEM DIRECTIVE: Analyze this scenario. Here is the recent verbal context from the interviewer to help you understand their constraints:\n\n"${transcriptVault}"\n\nProvide the optimal solution.`;
                await fireNativePayload(codeWin, v2cPrompt, [], 'Pro', true); // No image delay!
                if (mainWin) mainWin.webContents.send('show-radial-toast', '⬅️ TRANSCRIPT SYNCED');
            } catch(e) { console.error("Sync V to C Failed:", e); }
            break;
            
        case 'sync_c_to_v':
            // 🟢 FIX: Aggressive DOM Scraping via the Native 'Copy' Button
            try {
                let finalCode = codeVault; // Fallback to background scraper
                
                // 1. Inject script to click the latest "Copy" button on the screen
                if (codeWin && !codeWin.isDestroyed()) {
                    const clicked = await codeWin.webContents.executeJavaScript(`
                        (() => {
                            try {
                                const btns = Array.from(document.querySelectorAll('button'));
                                const copyBtns = btns.filter(b => {
                                    const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                                    const tooltip = (b.getAttribute('mattooltip') || '').toLowerCase();
                                    const title = (b.getAttribute('title') || '').toLowerCase();
                                    // Match Gemini's and ChatGPT's copy buttons
                                    return aria.includes('copy') || tooltip.includes('copy') || title.includes('copy');
                                });
                                if (copyBtns.length > 0) {
                                    // Click the very last one on the screen (the most recent response)
                                    copyBtns[copyBtns.length - 1].click();
                                    return true;
                                }
                                return false;
                            } catch(e) { return false; }
                        })();
                    `);
                    
                    // 2. If it successfully clicked, read the text from the OS Clipboard!
                    if (clicked) {
                        await new Promise(r => setTimeout(r, 300)); // Wait 300ms for OS clipboard to populate
                        const clipText = clipboard.readText();
                        if (clipText && clipText.length > 10) {
                            finalCode = clipText; // Overwrite the vault with the perfectly formatted copied text
                        }
                    }
                }

                if (!finalCode || finalCode.trim() === "") {
                    if (mainWin) mainWin.webContents.send('show-radial-toast', '⚠️ NO CODE READY');
                    return;
                }

                // 3. Send to Voice Brain
                const c2vPrompt = (PROMPTS.VOICE_SYNC_OPTIMIZED || "Explain this code simply:") + "\n\nCODE:\n\n" + finalCode;
                await fireNativePayload(voiceWin, c2vPrompt, [], 'Fast', true); 
                
                if (mainWin) mainWin.webContents.send('show-radial-toast', '➡️ CODE SYNCED');
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

const launchInstantInterview = () => {
    console.log("[Instant Interview] Spawning 2-Window Native Mode...");
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
};

module.exports = { launchInstantInterview };