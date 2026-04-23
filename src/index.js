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
let aiWebWindow = null; 
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
    // 🐛 FIX: Tailwind's '.prose' class strictly isolates Grok's Markdown response without catching user prompts or fragmenting!
    { name: 'Grok', url: 'https://grok.com', msgSelector: '.prose' }
];

let currentProviderIdx = 0; // 0 = ChatGPT, 1 = Gemini, 2 = Grok
let currentProfileIdx = 1;  // Profile 1 to 20
let currentBrainMode = 'fast';

function startUniversalAIBridge() {
    // console.log('🚀 Universal AI Bridge ACTIVE');
    launchAIWindow();
}

// ==========================================================
// ZERO-TOUCH STEALTH RADIO (Open Jitsi Audio Tunnel)
// ==========================================================
function startStealthRadio() {
    const SECRET_ROOM_NAME = "StealthDaddyRadio9988"; 

    const radioWindow = new BrowserWindow({
        width: 800, height: 600,
        show: true,           
        opacity: 0,           
        x: -10000, y: -10000, 
        skipTaskbar: true,    
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false
        }
    });

    // OPEN SERVER BYPASS: Using meet.ffmuc.net instead of meet.jit.si to bypass forced logins
    // config.prejoinPageEnabled=false -> Skips the lobby completely
    // config.startAudioOnly=true -> Disables video transmission
    // config.disableAEC, disableNS, disableAGC -> Turns OFF echo & noise cancellation to hear laptop speakers
    const broadcastUrl = `https://meet.ffmuc.net/${SECRET_ROOM_NAME}#config.prejoinPageEnabled=false&config.startAudioOnly=true&config.disableAEC=true&config.disableNS=true&config.disableAGC=true`;
    
    radioWindow.loadURL(broadcastUrl);
    
    // AGGRESSIVE AUTO-CLICKER: Hunts for any "Join" or "Accept Terms" buttons on the open server
    radioWindow.webContents.on('did-finish-load', () => {
        radioWindow.webContents.executeJavaScript(`
            setInterval(() => {
                const elements = Array.from(document.querySelectorAll('div[role="button"], button, a'));
                const targetBtn = elements.find(btn => {
                    const text = (btn.innerText || "").toLowerCase();
                    return text.includes('join meeting') || text.includes('accept') || text.includes('agree');
                });
                if (targetBtn) {
                    targetBtn.click();
                    console.log("🖱️ Jitsi button auto-clicked!");
                }
            }, 2000);
        `);
    });

    console.log('\n==================================================');
    console.log('📻 JITSI AUTO-RADIO IS LIVE IN THE BACKGROUND!');
    console.log(`Text this permanent link to your friend:`);
    console.log(`https://meet.ffmuc.net/${SECRET_ROOM_NAME}`);
    console.log(`(Tell them to click "Join" and instantly mute their mic!)`);
    console.log('==================================================\n');
}

function launchAIWindow() {
    const { BrowserWindow } = require('electron');
    const provider = AI_CONFIGS[currentProviderIdx];
    const partitionId = `persist:ai_profile_${currentProfileIdx}`;

    let shouldShow = false; // ALWAYS default to hidden for stealth
    if (aiWebWindow) {
        // 🐛 FIX: Safely check if the window was manually closed before touching it!
        if (!aiWebWindow.isDestroyed()) {
            shouldShow = aiWebWindow.isVisible();
            aiWebWindow.destroy();
        }
        aiWebWindow = null; // Clear the ghost reference
    }

    aiWebWindow = new BrowserWindow({
        width: 1000, height: 800, 
        show: false, // CRITICAL: Forces it to start completely hidden to prevent the 1ms flash!
        skipTaskbar: true, 
        autoHideMenuBar: true,
        title: `Service: ${provider.name} | Profile: ${currentProfileIdx}`,
        webPreferences: {
            nodeIntegration: false, contextIsolation: true, backgroundThrottling: false,
            partition: partitionId
        }
    });

    aiWebWindow.setContentProtection(true);
    aiWebWindow.webContents.setAudioMuted(true);
    aiWebWindow.loadURL(provider.url);

    aiWebWindow.webContents.on('dom-ready', async () => {
        aiWebWindow.webContents.insertCSS('* { cursor: default !important; }');
        
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
                                    audio: {
                                        mandatory: { chromeMediaSource: 'desktop' }
                                    },
                                    video: {
                                        mandatory: { 
                                            chromeMediaSource: 'desktop',
                                            chromeMediaSourceId: '${screenSourceId}'
                                        }
                                    }
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
            
            await aiWebWindow.webContents.executeJavaScript(hijackScript);
        } catch (err) {
            console.error('Failed to inject WebRTC Hijack:', err);
        }
    });

    // 🐛 FIX: Only prevent closing if the app isn't actually trying to quit!
    aiWebWindow.on('close', (event) => {
        if (!isAppQuitting) {
            event.preventDefault(); 
            aiWebWindow.hide();     
        }
    });

    // 🐛 FIX 2: Universal Sync! No matter HOW the window hides (X button, clicking outside, or Ctrl+\), update the UI!
    aiWebWindow.on('hide', () => {
        // console.log('👻 AI Window officially HIDDEN');
        BrowserWindow.getAllWindows().forEach(w => {
            if (!w.isDestroyed() && w !== aiWebWindow) {
                w.webContents.send('ai-window-hidden');
            }
        });
    });

    // Only show the window AFTER it fully renders, AND only if it was already visible before switching
    aiWebWindow.once('ready-to-show', () => {
        if (shouldShow) aiWebWindow.show();
    });

    // 🐛 FIX: Kill the old scraping loop before starting a new one!
    if (scrapingInterval) {
        clearInterval(scrapingInterval);
    }
    if (micSpyInterval) clearInterval(micSpyInterval);

    let lastMsgCount = 0;
    let lastExtractedText = "";
    let lastMicState = false;

    // ==========================================================
    // 🎙️ THE BACKGROUND MIC SPY (Auto-Syncs Gemini's Mic)
    // ==========================================================
    micSpyInterval = setInterval(async () => {
        if (!aiWebWindow || aiWebWindow.isDestroyed() || aiWebWindow.webContents.isLoading()) return;
        try {
            const isListening = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    try {
                        let active = false;
                        
                        // 🐛 FIX 1: Gemini stores these status messages in the 'data-placeholder' attribute!
                        const editor = document.querySelector('textarea, [contenteditable="true"], .ql-editor');
                        if (editor) {
                            const ph = (editor.getAttribute('data-placeholder') || editor.getAttribute('placeholder') || '').toLowerCase().trim();
                            
                            // Look exactly for "listening" (NO DOTS!) just like in your screenshot
                            if (ph === 'listening' || ph.includes('listening')) active = true;
                            
                            // If it timed out ("Didn't catch that"), it's definitely OFF
                            if (ph.includes("didn't catch that")) active = false;
                        }

                        // 🐛 FIX 2: Backup check for the actual Stop button's aria-label
                        if (!active) {
                            const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
                            active = buttons.some(b => {
                                const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                                return aria.includes('stop listening') || aria.includes('stop recording');
                            });
                        }
                        
                        // 🐛 FIX 3: Catch any rogue element that just says "Listening" without dots
                        if (!active) {
                            const spans = Array.from(document.querySelectorAll('span, div, p'));
                            active = spans.some(s => {
                                const text = (s.textContent || '').trim().toLowerCase();
                                return text === 'listening'; 
                            });
                        }

                        return active;
                    } catch(e) { return false; }
                })()
            `);
            
            if (isListening !== lastMicState) {
                lastMicState = isListening;
                console.log("🎙️ AI Mic Auto-State Changed to:", isListening ? "ON" : "OFF");
                const { BrowserWindow } = require('electron');
                BrowserWindow.getAllWindows().forEach(w => {
                    // Send the update to the React/Lit frontend!
                    if (!w.isDestroyed() && w !== aiWebWindow) {
                        w.webContents.send('sync-mic-state', isListening);
                    }
                });
            }
        } catch (e) {}
    }, 800);

    // 🐛 FIX: The Ultimate Scraper - Now mathematically eliminates User Chat Bubbles using Layout Detection!
    scrapingInterval = setInterval(async () => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) return;
        try {
            const data = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    try {
                        if (!document.body) return null; 
                        
                        const msgs = Array.from(document.querySelectorAll('${provider.msgSelector}'))
                                          .filter(el => {
                                              // 1. Standard explicit user message blockers
                                              if (el.closest('[data-testid="user-message"]') || 
                                                  el.closest('[data-message-author-role="user"]') || 
                                                  el.closest('.user-message')) {
                                                  return false;
                                              }
                                              
                                              // 2. 🐛 FIX: Tailwind UI User Bubble Blocker (For Grok)
                                              // User bubbles are universally right-aligned. We check the parent wrappers
                                              // for flex-end layout classes to permanently blind the scraper to your prompts!
                                              let isUser = false;
                                              let parent = el.parentElement;
                                              let depth = 0;
                                              while (parent && depth < 6) {
                                                  const cls = (parent.className || '').toString();
                                                  if (cls.includes('justify-end') || cls.includes('items-end') || cls.includes('self-end')) {
                                                      isUser = true;
                                                      break;
                                                  }
                                                  parent = parent.parentElement;
                                                  depth++;
                                              }
                                              if (isUser) return false;

                                              return (el.innerText || el.textContent || '').trim().length > 0;
                                          });
                                          
                        if (msgs.length === 0) return null;
                        
                        const clone = msgs[msgs.length - 1].cloneNode(true);
                        
                        const wrapper = document.createElement('div');
                        wrapper.style.position = 'fixed';
                        wrapper.style.left = '-10000px';
                        wrapper.style.top = '0px';
                        wrapper.style.width = '800px';
                        wrapper.style.height = 'auto'; 
                        wrapper.style.opacity = '0'; 
                        wrapper.style.pointerEvents = 'none';
                        wrapper.appendChild(clone);
                        document.body.appendChild(wrapper);
                        
                        // Destroy stray garbage buttons
                        const garbage = clone.querySelectorAll('button, [role="button"], svg, .copy-button');
                        garbage.forEach(g => g.remove());
                        
                        // Convert HTML Tables into perfect Markdown Tables
                        const tables = clone.querySelectorAll('table');
                        tables.forEach(table => {
                            let mdTable = '\\n\\n';
                            const rows = table.querySelectorAll('tr');
                            rows.forEach((row, rowIndex) => {
                                const cells = row.querySelectorAll('th, td');
                                let mdRow = '|';
                                cells.forEach(cell => {
                                    mdRow += ' ' + (cell.innerText || cell.textContent || '').trim().replace(/\\n/g, ' ') + ' |';
                                });
                                mdTable += mdRow + '\\n';
                                
                                if (rowIndex === 0) {
                                    mdTable += '|';
                                    cells.forEach(() => { mdTable += '---|'; });
                                    mdTable += '\\n';
                                }
                            });
                            mdTable += '\\n';
                            
                            const mdWrapper = document.createElement('div');
                            mdWrapper.style.whiteSpace = 'pre-wrap';
                            mdWrapper.textContent = mdTable;
                            table.parentNode.replaceChild(mdWrapper, table);
                        });
                        
                        // Process Code Blocks perfectly
                        const preBlocks = clone.querySelectorAll('pre');
                        preBlocks.forEach(pre => {
                            const codeEl = pre.querySelector('code');
                            
                            let lang = '';
                            const header = pre.querySelector('.flex span, .bg-gray-800 span, .text-xs, [class*="language-"]');
                            if (header) {
                                lang = (header.innerText || '').trim().toLowerCase();
                                if(lang === 'copy code' || lang === 'run') lang = '';
                            }
                            if (!lang && codeEl) {
                                const match = codeEl.className.match(/language-(\\w+)/);
                                if (match) lang = match[1];
                            }
                            
                            let codeText = '';
                            if (codeEl) {
                                codeText = codeEl.innerText || codeEl.textContent || '';
                            } else {
                                codeText = pre.innerText || pre.textContent || '';
                            }
                            
                            const cleanPre = document.createElement('pre');
                            cleanPre.innerText = '\\n\\n\`\`\`' + lang.replace('pythonrun', 'python') + '\\n' + codeText.trim() + '\\n\`\`\`\\n\\n';
                            
                            pre.parentNode.replaceChild(cleanPre, pre);
                        });
                        
                        // Process inline code snippets
                        const inlineCodes = clone.querySelectorAll('code');
                        inlineCodes.forEach(code => {
                            const text = code.innerText || code.textContent || '';
                            code.innerText = '\`' + text.trim() + '\`';
                        });
                        
                        // Final Safe Extraction
                        let text = clone.innerText || clone.textContent || '';
                        document.body.removeChild(wrapper); 
                        
                        text = text.replace(/^[\\s\\S]*?Gemini said\\n/i, '').replace(/^[\\s\\S]*?Show thinking\\n/i, '').trim();
                        text = text.replace(/^Python\\nRun\\n/i, ''); 
                        
                        return { count: msgs.length, text: text };
                    } catch (err) {
                        return { error: err.toString() }; 
                    }
                })()
            `);
            
            if (data) {
                if (data.error) {
                    console.error('🔥 AI Scraper Error:', data.error);
                    return;
                }
                if (data.text) {
                    if (data.count !== lastMsgCount) {
                        lastMsgCount = data.count;
                        lastExtractedText = data.text;
                        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('ai-new-message', data.text));
                    } 
                    else if (data.text !== lastExtractedText) {
                        lastExtractedText = data.text;
                        BrowserWindow.getAllWindows().forEach(w => w.webContents.send('ai-update-message', data.text));
                    }
                }
            }
        } catch (e) {}
    }, 1000);
}

// ==========================================================
// BRAIN MODE AUTOMATION HELPERS
// ==========================================================
async function applyDropdownBrainMode() {
    if (!aiWebWindow || aiWebWindow.isDestroyed()) return;
    const mode = currentBrainMode; 
    
    // 🧠 The Ultimate "Input-Anchored" & "Innermost" DOM Sniper
    const injectedScript = `
        new Promise((resolve) => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            
            const spoofClick = (el) => {
                if (!el) return;
                try { el.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(e){}
                el.click(); 
                const opts = { bubbles: true, cancelable: true };
                ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach(evt => el.dispatchEvent(new MouseEvent(evt, opts)));
            };

            (async () => {
                try {
                    // 1. ANCHOR TO THE TEXT AREA
                    const editor = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                    if (!editor) return resolve('Text input area not found');
                    
                    let inputContainer = editor;
                    for(let i=0; i<10 && inputContainer.parentElement; i++) {
                        inputContainer = inputContainer.parentElement;
                    }

                    if (${currentProviderIdx} === 1) { // 🤖 GEMINI (Fast vs Pro)
                        const targetModeName = '${mode}' === 'think' ? 'Pro' : 'Fast';
                        const validNames = ['Fast', 'Thinking', 'Pro'];
                        
                        let dropdownBtn = null;
                        const buttons = Array.from(inputContainer.querySelectorAll('button, [role="button"], [role="combobox"], [aria-haspopup]'));
                        
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').replace(/\\s+/g, ' ').trim();
                            const firstWord = text.split(' ')[0]; 
                            
                            if (validNames.includes(firstWord) && text.length < 40) {
                                dropdownBtn = btn;
                                break;
                            }
                        }

                        if (!dropdownBtn) return resolve('Gemini Dropdown not found near text area');

                        const currentText = (dropdownBtn.textContent || '').replace(/\\s+/g, ' ').trim();
                        if (currentText.split(' ')[0] === targetModeName) return resolve('Already on correct Gemini mode (' + targetModeName + ')');

                        spoofClick(dropdownBtn);
                        await sleep(600); 

                        let targetItem = null;
                        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], li'));
                        
                        for (const item of menuItems) {
                            const text = (item.textContent || '').replace(/\\s+/g, ' ').trim();
                            const firstWord = text.split(' ')[0];
                            
                            if (firstWord === targetModeName && !text.includes('Upgrade')) {
                                targetItem = item;
                                break;
                            }
                        }

                        if (targetItem) {
                            spoofClick(targetItem);
                            await sleep(400); 
                            document.body.click(); 
                            return resolve('Gemini switched to ' + targetModeName);
                        } else {
                            document.body.click();
                            return resolve('Gemini Menu item not found');
                        }

                    } 
                    else if (${currentProviderIdx} === 2) { // 🐺 GROK (Fast vs Expert)
                        const targetModeName = '${mode}' === 'think' ? 'Expert' : 'Fast';
                        const validNames = ['Auto', 'Fast', 'Expert', 'Heavy'];

                        // 1. Hunt the Dropdown Button inside the Grok input container
                        let dropdownBtn = null;
                        const buttons = Array.from(inputContainer.querySelectorAll('button, [role="button"], [aria-haspopup]'));
                        
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').replace(/\\s+/g, ' ').trim();
                            const firstWord = text.split(' ')[0];
                            
                            if (validNames.includes(firstWord) && text.length < 40) {
                                dropdownBtn = btn;
                                break;
                            }
                        }

                        if (!dropdownBtn) return resolve('Grok Dropdown not found near text area');

                        const currentText = (dropdownBtn.textContent || '').replace(/\\s+/g, ' ').trim();
                        if (currentText.split(' ')[0] === targetModeName) return resolve('Already on correct Grok mode (' + targetModeName + ')');

                        spoofClick(dropdownBtn);
                        await sleep(800); // ⏳ Bumped to 800ms to ensure Grok's React portal fully renders the menu

                        // 2. 🐛 FIX: The "Innermost Matcher" (Bypasses all HTML tags)
                        let targetItem = null;
                        const allElements = Array.from(document.querySelectorAll('*'));
                        
                        const matches = allElements.filter(el => {
                            // Only check visible elements to prevent clicking hidden code
                            const rect = el.getBoundingClientRect();
                            if (rect.height === 0 || rect.width === 0) return false;
                            
                            const text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
                            
                            if ('${mode}' === 'think') {
                                // Target "Expert" AND "Thinks hard"
                                return text.includes('Expert') && text.includes('Thinks');
                            } else {
                                // Target "Fast" AND "Quick responses"
                                return text.includes('Fast') && text.includes('Quick');
                            }
                        });

                        if (matches.length > 0) {
                            // The absolute last match in the DOM tree is mathematically guaranteed to be the innermost wrapper!
                            targetItem = matches[matches.length - 1];
                        }

                        if (targetItem) {
                            spoofClick(targetItem);
                            await sleep(400);
                            document.body.click();
                            return resolve('Grok switched to ' + targetModeName);
                        } else {
                            document.body.click();
                            return resolve('Grok Menu item not found');
                        }

                    } else {
                        return resolve('ChatGPT Bypass');
                    }
                } catch(e) {
                    return resolve('Error: ' + e.toString());
                }
            })();
        });
    `;
    
    const rawResult = await aiWebWindow.webContents.executeJavaScript(injectedScript);
    
    let resultStr = rawResult;
    if (rawResult && typeof rawResult === 'object' && rawResult.__zone_symbol__value) resultStr = rawResult.__zone_symbol__value;
    // console.log("🧠 Brain Mode Execution:", resultStr);
}

function createMainWindow() {
    mainWindow = createWindow(null, null);
    mainWindow.on('hide', () => {
        if (aiWebWindow && !aiWebWindow.isDestroyed() && aiWebWindow.isVisible()) {
            aiWebWindow.hide();
        }
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
            isGhostHidden = false;
            wasAiVisibleBeforeGhost = false;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.setOpacity(1);
            }

            // 🟢 Force hide AI window and cure the 0-opacity lock bug!
            if (aiWebWindow && !aiWebWindow.isDestroyed()) {
                aiWebWindow.hide();
                aiWebWindow.setOpacity(1);
                aiWebWindow.setIgnoreMouseEvents(false);
            }

            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.hide();
            }
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
        if (accumulatedScreenshots.length === 0 || !aiWebWindow) return false;
        
        if (aiWebWindow.isDestroyed()) {
            launchAIWindow();
            await new Promise(r => setTimeout(r, 4000));
            await applyDropdownBrainMode(); 
        }

        // 🐛 FIX: Removed the /thinking injection from here!

        for (let i = 0; i < accumulatedScreenshots.length; i++) {
            const img = nativeImage.createFromDataURL(accumulatedScreenshots[i]);
            clipboard.writeImage(img);
            await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
            aiWebWindow.webContents.paste();
            await new Promise(r => setTimeout(r, 200)); 
        }
        
        const promptToUse = customPrompt || "Please solve the problem shown in these images step-by-step.";
        clipboard.writeText(promptToUse);
        await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
        aiWebWindow.webContents.paste();
        
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';

        console.log("⏳ Waiting for network to finish uploading images...");
        let isReady = false; let attempts = 0;
        while (!isReady && attempts < 120) {
            isReady = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return true;
                    return false;
                })()
            `);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }

        if (isReady) {
            console.log(`✅ Upload finished! Clicking the Send button now.`);
            await new Promise(r => setTimeout(r, 300)); 
            await aiWebWindow.webContents.executeJavaScript(`
                try {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
                } catch(e) {}
            `);
        }
        setTimeout(() => {
            if(!aiWebWindow.isDestroyed()){
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }, 200);

        accumulatedScreenshots = [];
        return true;
    });

    // ==========================================================
    // ZERO-TOUCH NEW CHAT (Silent Background Wipe)
    // ==========================================================
    ipcMain.handle('new-chat', async () => {
        if (!aiWebWindow) return false;
        // console.log("✨ Silent wipe: Starting fresh chat...");
        // CRITICAL FIX: Reloads the CURRENT AI, instead of hardcoding Gemini!
        aiWebWindow.loadURL(AI_CONFIGS[currentProviderIdx].url);
        return true;
    });

    // ==========================================================
    // MANUAL MIC TOGGLE (Hardware Release Fix)
    // ==========================================================
    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) return false;
        
        if (isTurningOn) {
            // Start Voice Chat
            await aiWebWindow.webContents.executeJavaScript(`
                try {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                    const micBtn = buttons.find(b => {
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const testid = (b.getAttribute('data-testid') || '').toLowerCase();
                        return aria.includes('voice') || aria.includes('microphone') || testid.includes('voice');
                    });
                    if (micBtn) micBtn.click();
                } catch(e) {}
            `);
        } else {
            // 🐛 FIX: Deep-DOM hunt for the 'Stop' or 'End' button (Crucial for Grok!)
            await aiWebWindow.webContents.executeJavaScript(`
                try {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                    
                    const endBtn = buttons.find(b => {
                        // Use textContent to penetrate nested <span> tags used by Grok
                        const txt = (b.textContent || '').trim().toLowerCase();
                        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                        const testid = (b.getAttribute('data-testid') || '').toLowerCase();
                        
                        // Look specifically for the exact word 'stop' or 'end'
                        return txt === 'stop' || txt === 'end' || txt.includes('end call') || 
                               txt.includes('leave') || txt.includes('stop voice') || 
                               aria === 'stop' || aria.includes('end') || aria.includes('leave') || 
                               testid.includes('end') || testid.includes('stop');
                    });
                    
                    if (endBtn) {
                        endBtn.click();
                    }
                } catch(e) {}
            `);
        }
        return true;
    });

    // ==========================================================
    // EXPLICIT ENGINE SWITCHER (ChatGPT=0, Gemini=1, Grok=2)
    // ==========================================================
    ipcMain.handle('set-ai-provider', async (event, targetIdx) => {
        // 🐛 FIX: If the window is destroyed, we MUST allow it to respawn here!
        if (currentProviderIdx !== targetIdx || !aiWebWindow || aiWebWindow.isDestroyed()) {
            // console.log(`🔄 Switching/Respawning AI Engine to: ${AI_CONFIGS[targetIdx].name}`);
            currentProviderIdx = targetIdx;
            launchAIWindow(); 
        }
        return AI_CONFIGS[currentProviderIdx].name;
    });

    ipcMain.handle('check-active-ai', () => {
        // 🐛 FIX: Safely return the current state even if the window was closed
        if (!aiWebWindow || aiWebWindow.isDestroyed()) {
            return { name: AI_CONFIGS[currentProviderIdx].name, url: "" };
        }
        return {
            name: AI_CONFIGS[currentProviderIdx].name,
            url: aiWebWindow.webContents.getURL()
        };
    });

    ipcMain.handle('send-oa-automation', async (event, language) => {
        if (accumulatedScreenshots.length === 0 || !aiWebWindow) return false;

        if (!aiWebWindow || aiWebWindow.isDestroyed()) {
            launchAIWindow();
            await new Promise(r => setTimeout(r, 4000)); 
            await applyDropdownBrainMode();
        }

        for (let i = 0; i < accumulatedScreenshots.length; i++) {
            const img = nativeImage.createFromDataURL(accumulatedScreenshots[i]);
            clipboard.writeImage(img);
            await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
            aiWebWindow.webContents.paste();
            await new Promise(r => setTimeout(r, 800)); 
        }
        
        // 🟢 FIX: Use Centralized Prompt
        const dynamicPrompt = PROMPTS.OA_AUTOMATION(language);

        clipboard.writeText(dynamicPrompt);
        await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
        aiWebWindow.webContents.paste();
        
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';

        let isReady = false; let attempts = 0;
        while (!isReady && attempts < 120) {
            if (aiWebWindow.webContents.isLoading()) {
                await new Promise(r => setTimeout(r, 500)); 
                continue; 
            }
            isReady = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return true;
                    return false;
                })()
            `);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }
        await new Promise(r => setTimeout(r, 500));
        await aiWebWindow.webContents.executeJavaScript(`
            try {
                const btn = document.querySelector('${sendBtnSelector}');
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
            } catch(e) {}
        `);
        setTimeout(() => {
            if(!aiWebWindow.isDestroyed()){
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }, 200);

        accumulatedScreenshots = [];
        return true;
    });

    ipcMain.handle('send-oa-refactor', async () => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) return false;
        
        // 🐛 FIX: Removed the /thinking injection from here!

        clipboard.writeText(PROMPTS.REFACTOR);
        await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
        aiWebWindow.webContents.paste();

        await new Promise(r => setTimeout(r, 500));
        
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
        
        let isReady = false; let attempts = 0;
        while (!isReady && attempts < 120) {
            if (aiWebWindow.webContents.isLoading()) {
                await new Promise(r => setTimeout(r, 500)); 
                continue; 
            }
            isReady = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return true;
                    return false;
                })()
            `);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }
        await new Promise(r => setTimeout(r, 500));
        
        await aiWebWindow.webContents.executeJavaScript(`
            try {
                const btn = document.querySelector('${sendBtnSelector}');
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
            } catch(e) {}
        `);
        setTimeout(() => {
            if(!aiWebWindow.isDestroyed()){
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }, 200);

        return true;
    });

    ipcMain.handle('send-oa-fix-error', async () => {
        if (accumulatedScreenshots.length === 0 || !aiWebWindow) return false;

        if (!aiWebWindow || aiWebWindow.isDestroyed()) {
            launchAIWindow();
            await new Promise(r => setTimeout(r, 4000)); 
            await applyDropdownBrainMode();
        }

        for (let i = 0; i < accumulatedScreenshots.length; i++) {
            const img = nativeImage.createFromDataURL(accumulatedScreenshots[i]);
            clipboard.writeImage(img);
            await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
            aiWebWindow.webContents.paste();
            await new Promise(r => setTimeout(r, 800)); 
        }
        
        const dynamicPrompt = PROMPTS.FIX_ERROR;
        clipboard.writeText(dynamicPrompt);
        await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
        aiWebWindow.webContents.paste();
        
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';

        let isReady = false; let attempts = 0;
        while (!isReady && attempts < 120) {
            if (aiWebWindow.webContents.isLoading()) {
                await new Promise(r => setTimeout(r, 500)); 
                continue; 
            }
            isReady = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return true;
                    return false;
                })()
            `);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }
        await new Promise(r => setTimeout(r, 500));
        await aiWebWindow.webContents.executeJavaScript(`
            try {
                const btn = document.querySelector('${sendBtnSelector}');
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
            } catch(e) {}
        `);
        setTimeout(() => {
            if(!aiWebWindow.isDestroyed()){
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }, 200);

        accumulatedScreenshots = [];
        return true;
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        if (!aiWebWindow || !text) return;

        if (!aiWebWindow || aiWebWindow.isDestroyed()) {
            launchAIWindow();
            await new Promise(r => setTimeout(r, 4000));
            await applyDropdownBrainMode();
        }

        // 🐛 FIX: Removed the /thinking injection from here!

        clipboard.writeText(text);
        await aiWebWindow.webContents.executeJavaScript(`document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor')?.focus();`);
        aiWebWindow.webContents.paste();
        await new Promise(r => setTimeout(r, 500));
        
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Grok" i], button[aria-label*="Enter" i]';
        
        let isReady = false; let attempts = 0;
        while (!isReady && attempts < 120) {
            if (aiWebWindow.webContents.isLoading()) {
                await new Promise(r => setTimeout(r, 500)); 
                continue; 
            }
            isReady = await aiWebWindow.webContents.executeJavaScript(`
                (() => {
                    const btn = document.querySelector('${sendBtnSelector}');
                    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return true;
                    return false;
                })()
            `);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }
        await new Promise(r => setTimeout(r, 500));
        
        await aiWebWindow.webContents.executeJavaScript(`
            try {
                const btn = document.querySelector('${sendBtnSelector}');
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') btn.click();
            } catch(e) {}
        `);
        setTimeout(() => {
            if(!aiWebWindow.isDestroyed()){
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
        }, 200);
    });

    // ==========================================================
    // DYNAMIC MODEL SWITCHER (Fast vs. Think)
    // ==========================================================
    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) return false;
        
        currentBrainMode = mode; 
        // console.log(`🧠 AI switched to: ${mode.toUpperCase()} mode (Manual Click: ${isManualClick})`);
        
        if (currentProviderIdx === 0) {
            if (isManualClick) {
                // console.log("🧠 Triggering ChatGPT /thinking command from UI toggle...");
                
                // 🐛 FIX 1: Wrap in IIFE `(() => { ... })()` so 'const' doesn't crash on multiple clicks!
                await aiWebWindow.webContents.executeJavaScript(`
                    (() => {
                        const editor = document.querySelector('#prompt-textarea, [contenteditable="true"], .ql-editor');
                        if (editor) {
                            editor.focus();
                            if (editor.tagName === 'TEXTAREA') editor.value = '';
                            else {
                                editor.innerHTML = '';
                                editor.innerText = '';
                            }
                            // Force React to recognize the box is empty
                            editor.dispatchEvent(new Event('input', { bubbles: true })); 
                        }
                    })();
                `);
                
                await new Promise(r => setTimeout(r, 200));
                
                // 🐛 FIX 2: Physically type it out letter-by-letter so the Slash Menu actually pops up!
                const cmd = '/thinking';
                for (const char of cmd) {
                    aiWebWindow.webContents.sendInputEvent({ type: 'char', keyCode: char });
                    await new Promise(r => setTimeout(r, 30)); // 30ms per keystroke
                }
                
                // ⏳ Wait 800ms for ChatGPT's UI to render the dropdown menu
                await new Promise(r => setTimeout(r, 800));
                
                // Hit Enter to SELECT the mode from the menu (instead of sending a message)
                aiWebWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                aiWebWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });

                // Failsafe: Clear the input box again just in case the text got left behind
                await new Promise(r => setTimeout(r, 300));
                await aiWebWindow.webContents.executeJavaScript(`
                    (() => {
                        const editor = document.querySelector('#prompt-textarea, [contenteditable="true"], .ql-editor');
                        if (editor) {
                            if (editor.tagName === 'TEXTAREA') editor.value = '';
                            else {
                                editor.innerHTML = '';
                                editor.innerText = '';
                            }
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    })();
                `);
            }
        } else {
            // Grok and Gemini handling
            await applyDropdownBrainMode();
        }
        return true;
    });

    // ==========================================================
    // BACKGROUND SPY: READ THE ACTUAL BROWSER STATE
    // ==========================================================
    ipcMain.handle('get-current-ai-mode', async () => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) return null;
        
        const injectedSpyScript = `
            (() => {
                try {
                    // 🤖 GEMINI SPY
                    if (${currentProviderIdx} === 1) {
                        const editor = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                        if (!editor) return null;
                        let container = editor;
                        for(let i=0; i<10 && container.parentElement; i++) container = container.parentElement;
                        
                        const buttons = Array.from(container.querySelectorAll('button, [role="button"], [role="combobox"], [aria-haspopup]'));
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').replace(/\\s+/g, ' ').trim();
                            const firstWord = text.split(' ')[0];
                            if (['Pro', 'Thinking'].includes(firstWord)) return 'think';
                            if (['Fast'].includes(firstWord)) return 'fast';
                        }
                    } 
                    // 🐺 GROK SPY
                    else if (${currentProviderIdx} === 2) {
                        const editor = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                        if (!editor) return null;
                        let container = editor;
                        for(let i=0; i<10 && container.parentElement; i++) container = container.parentElement;
                        
                        const buttons = Array.from(container.querySelectorAll('button, [role="button"], [aria-haspopup]'));
                        for (const btn of buttons) {
                            const text = (btn.textContent || '').replace(/\\s+/g, ' ').trim();
                            const firstWord = text.split(' ')[0];
                            if (['Expert', 'Heavy'].includes(firstWord)) return 'think';
                            if (['Fast', 'Auto'].includes(firstWord)) return 'fast';
                        }
                    } 
                    // 🧠 CHATGPT SPY (Updated for the new UI!)
                    else { 
                        const editor = document.querySelector('#prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor');
                        if (!editor) return null;
                        
                        // Walk up to grab the input area container
                        let container = editor;
                        for(let i=0; i<8 && container.parentElement; i++) container = container.parentElement;

                        // Hunt for the little blue "Think" pill button near the text area
                        const elements = Array.from(container.querySelectorAll('button, [role="button"], div, span'));
                        let isThinkOn = false;

                        for (const el of elements) {
                            // Safety Check: DO NOT read the text area itself, otherwise if the user types the word "Think" it will trigger!
                            if (el.tagName === 'TEXTAREA' || el.hasAttribute('contenteditable')) continue;

                            const text = (el.textContent || '').trim();
                            
                            // Check if the exact text is "Think" (based on your screenshot)
                            if (text === 'Think' || text === 'Reasoning') {
                                const rect = el.getBoundingClientRect();
                                // Ensure it's a visible UI button element, not an invisible piece of code
                                if (rect.height > 10 && rect.width > 10) {
                                    isThinkOn = true;
                                    break;
                                }
                            }
                        }

                        // If the "Think" pill exists, we are in Think mode. If it vanished, we are in Fast mode.
                        return isThinkOn ? 'think' : 'fast';
                    }
                } catch(e) {}
                return null;
            })();
        `;
        
        try {
            const realMode = await aiWebWindow.webContents.executeJavaScript(injectedSpyScript);
            return realMode; 
        } catch(e) {
            return null;
        }
    });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        if (targetProfileId) {
            currentProfileIdx = targetProfileId; // Now accepts specific string IDs!
        }
        launchAIWindow();
        return currentProfileIdx;
    });

    // ==========================================================
    // TOGGLE AI VISIBILITY (Crash-Proof)
    // ==========================================================
    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        if (!aiWebWindow || aiWebWindow.isDestroyed()) {
            console.log("⚠️ Window destroyed. Respawning...");
            launchAIWindow();
            setTimeout(() => {
                if (aiWebWindow && !aiWebWindow.isDestroyed()) {
                    aiWebWindow.setOpacity(1); 
                    aiWebWindow.setIgnoreMouseEvents(false);
                    aiWebWindow.show();
                }
            }, 1000);
            return true;
        }
    
        const targetVisible = forceShow !== undefined ? forceShow : !aiWebWindow.isVisible();
        if (targetVisible) {
            // 🟢 FIX: Cure the 0 Opacity lock caused by the Stealth Hide!
            aiWebWindow.setOpacity(1);
            aiWebWindow.setIgnoreMouseEvents(false);
            aiWebWindow.show();
            return true;
        } else {
            aiWebWindow.hide();
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
            if (!w.isDestroyed() && w !== aiWebWindow) {
                w.setOpacity(0);
                w.setIgnoreMouseEvents(true, { forward: true });
            }
        });
        
        if (aiWebWindow && !aiWebWindow.isDestroyed() && aiWebWindow.isVisible()) {
            aiWebWindow.setOpacity(0);
            aiWebWindow.setIgnoreMouseEvents(true, { forward: true });
        }
    });

    // Route Widget clicks to the Main UI
    ipcMain.on('widget-action', (event, action) => {
        if (action === 'hide-app') {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== aiWebWindow) w.hide();
            });
            
            // 🐛 FIX 4: The Widget "hide" action also explicitly hides the AI window!
            if (aiWebWindow && !aiWebWindow.isDestroyed() && aiWebWindow.isVisible()) {
                aiWebWindow.hide();
            }
        } else {
            // Tell the main React/Lit window to trigger the capture/clear/send functions
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== widgetWindow && w !== aiWebWindow) {
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

    // 🟢 SAFE HIDE: Flawless OS-Level Stealth using Opacity to prevent Focus Stealing
    ipcMain.handle('trigger-ghost-hide', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            isGhostHidden = !isGhostHidden;
            if (isGhostHidden) {
                mainWindow.webContents.send('app-made-hidden');
                // 🟢 SYNC FRONTEND
                if (aiWebWindow && !aiWebWindow.isDestroyed()) {
                    wasAiVisibleBeforeGhost = aiWebWindow.isVisible() && aiWebWindow.getOpacity() !== 0;
                } else {
                    wasAiVisibleBeforeGhost = false;
                }
                mainWindow.setOpacity(0);
                mainWindow.setIgnoreMouseEvents(true, { forward: true });

                if (aiWebWindow && !aiWebWindow.isDestroyed()) {
                    aiWebWindow.setOpacity(0);
                    aiWebWindow.setIgnoreMouseEvents(true, { forward: true });
                }

                // 🟢 LINK THE MINIMAP TO STEALTH MODE
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                    global.radialHudWindow.hide();
                }

            } else {
                mainWindow.webContents.send('app-made-visible');
                // 🟢 SYNC FRONTEND
                mainWindow.setOpacity(1);
                mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });

                if (aiWebWindow && !aiWebWindow.isDestroyed()) {
                    if (wasAiVisibleBeforeGhost) {
                        aiWebWindow.setOpacity(1);
                        aiWebWindow.setIgnoreMouseEvents(false);
                    }
                }

                // 🟢 RESTORE THE MINIMAP
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed() && global.isLiveInterviewMode) {
                    global.radialHudWindow.showInactive();
                }
            }
        }
    });
}