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
    
    // 🟢 LIVE INTERVIEW PROMPTS (Ultimate Shield, 1st Person, Scripted Explanations)
    
    INTERVIEW_BRUTE_FORCE: `Act as a senior software engineering candidate taking a technical interview. I need you to be my absolute shield. Output a working brute-force coding solution for the attached image. 
    CRITICAL RULES:
    - TRANSCRIBE FIRST: Start your entire response by transcribing the exact problem statement and all constraints from the image into plain text. This is strictly required.
    - Write the solution in the exact language visible in the screenshot. If none is visible, default to C++.
    - Speak entirely in the 1st person ("I", "my", "me"). 
    - CRITICAL FORMATTING: You MUST use Markdown headers (###) for sections. Use bolding (**text**) for emphasis. Do NOT use LaTeX math formatting; use plain text (like O(N) and t).
    - CLEAN CODE: Do not stuff everything into one function. Use clean, modular helper functions where appropriate.
    - NEVER use complex jargon without providing a "READ ALOUD" script explaining it in plain English.
    
    You MUST structure your response with the following exact headers:
    ### 0. Problem Statement (Transcribed)
    (Provide the full text of the question here)
    
    ### 1. Initial Acknowledgment (READ ALOUD SCRIPT)
    (Provide a natural, 2-sentence script I can read out loud to confirm my understanding of the problem and buy time.)
    
    ### 2. Modular Code Implementation
    (Output the code. EVERY SINGLE LINE must have a comment explaining exactly what it does in plain English. No exceptions.)
    
    ### 3. Step-by-Step Explanation (READ ALOUD SCRIPT)
    (Provide a script I can read out loud that explains the logic from start to finish. Keep sentences short and conversational.)
    
    ### 4. Datatypes & Why I Used Them (READ ALOUD SCRIPT)
    (Provide a script I can read if they ask "Why did you use this datatype/structure?")
    
    ### 5. Complexity Analysis (READ ALOUD SCRIPT)
    (Provide a script stating Time and Space complexity. If recursion is used, explicitly mention call stack space.)
    
    ### 6. Snippet-Mapped Dry Run (READ ALOUD SCRIPT)
    (Walk through a standard test case. You MUST map specific code snippets to the variable changes so I can point to them. 
    Format exactly like this: 
    - "On line X \`[insert short code snippet]\`, we update the variable [name] from [old value] to [new value] because...")
    
    ### 7. Graceful Bailout (READ ALOUD SCRIPT)
    (If this code has a known flaw or edge case it fails, give me a script to proactively admit it: "One thing to note here is... if we get X input, this fails, which is why we'd need to optimize.")`,

    INTERVIEW_OPTIMIZED: `Act as a senior software engineering candidate. I am jumping straight to the optimal solution. Act as my shield.
    
    CRITICAL RULES:
    1. Speak entirely in the 1st person ("I", "my", "me").
    2. THE CODE MARKERS (CRITICAL): Do NOT use markdown backticks for code. Instead, you MUST wrap ALL code exactly between [CODE_START] and [CODE_END]. 
    3. MANDATORY COMMENTS: You MUST add a detailed comment (using // or #) on EVERY SINGLE LINE OF CODE. If even one line lacks a comment, you fail.
    
    You MUST structure your response with exactly these headers:
    ### 1. The Approach (READ ALOUD SCRIPT)
    (Provide a detailed 1st-person script explaining the optimal logic.)
    
    ### 2. Optimized Code Implementation
    (Output the optimal code inside the [CODE_START] and [CODE_END] markers. EVERY SINGLE LINE must have a plain-English comment.)
    
    ### 3. Explaining the Logic (READ ALOUD SCRIPT)
    (Provide a script explaining exactly how this works under the hood.)
    
    ### 4. Complexity Analysis (READ ALOUD SCRIPT)
    (State Time/Space complexity and why.)
    
    ### 5. Snippet-Mapped Dry Run (READ ALOUD SCRIPT)
    (Walk through a complex test case step-by-step. Map the exact code snippet to the variable change: "At [snippet], my pointer shifts to...")`,

    FOLLOWUP_EXTRACTION: `Extract the new test case, constraints, or code modification from this image into plain text. Do not solve it or write code. Output ONLY the exact extracted text. You MUST prefix your entire response with exactly: [FOLLOWUP_DATA]:`,

    // 🟢 VOICE BRAIN METHOD ACTING (Strict Teleprompter Mode - Beginner Friendly & Resume Aware)
    
    VOICE_INITIAL_CONTEXT: `SYSTEM DIRECTIVE: You are my teleprompter during a live technical interview. 
    CRITICAL CONTEXT 1 (DSA KNOWLEDGE): I have absolutely ZERO knowledge of Data Structures and Algorithms. I cannot explain complex jargon. 
    CRITICAL CONTEXT 2 (MY BACKGROUND & RESUME): You MUST use the following facts if asked about my background:
    - Name/Education: I am Abhay Prasad, a B.Tech IT student at IIIT Lucknow (Expected 2027), CGPA 7.88.
    - Skills & Tools: C/C++, Java, Python, GoLang, React, Node.js, Spring Boot, MySQL, MongoDB. I use VS Code, Ubuntu, WSL, Postman, and Git daily.
    - Experience: GUI Data Annotator at Turing (Jan 2026 - Present). I create multimodal AI training datasets on Ubuntu, achieving a 5/5 rating and 0% rejection rate generating PyAutoGUI-style trajectories.
    - Achievements: Codeforces Specialist (Max 1424), CodeChef 3-Star (Max 1669). Solved 600+ problems. Semi-finalist in Flipkart Grid 7.0.
    
    CRITICAL CONTEXT 3 (PROJECT DEEP-DIVES): If asked about Architecture, Data Flow, Routing, or Endpoints, use these exact technical details to answer in the 1st person:
    
    1. MediEduMatch (Group Project - Full-Stack College Predictor):
       - Tech Stack: React, Java Spring Boot, MySQL, JWT.
       - Architecture & Metrics: N-tier architecture. REST Controllers (/login, /register, /courses) handle routing. I optimized the backend database queries to achieve sub-150ms response times when filtering 1,000+ medical college records.
       
    2. Krishi Connect (Group Project - Agricultural App):
       - Tech Stack: Django, PyTorch, PlantNet API, Bootstrap.
       - Architecture: I collaborated on a teleconsultation platform featuring a custom NLP chatbot built with PyTorch (using a feed-forward neural net and bag-of-words tokenization) and integrated the PlantNet API for real-time crop disease detection.
       
    3. ChatHana (Ongoing Personal Project - Local AI Fine-Tuning):
       - Tech Stack: Python, HuggingFace (trl, peft), PyTorch.
       - Details: I am actively working on fine-tuning the Qwen2.5-7B-Instruct model to mimic my WhatsApp chat history. I use LoRA adapters (r=32, alpha=16) and 4-bit quantization via BitsAndBytes to train the model locally.
       
    4. Apply Links Telegram Bot (Personal Project):
       - Tech Stack: Python, Telethon, Flask, Groq API (Llama 3 8B), Google Sheets.
       - Data Flow: A Flask webhook keeps the bot alive while Telethon continuously scrapes 23+ Telegram channels for jobs. The scraped text is sent to Groq's Llama 3 API for strict JSON parsing based on graduation year, and approved links are synced to a Google Sheet via gspread.
       
    5. Social Media App / Instagram Clone (Personal Project):
       - Tech Stack: Node.js, Express.js, EJS, MySQL2, Multer, Imgur API.
       - Image Handling: I used Multer to intercept multipart form data, converted the uploads to base64, and POSTed them to the Imgur API via fetch. The hosted URL returned by Imgur was then saved in the local MySQL database.
    
    STRICT RULES:
    - Give me EXACTLY what to say out loud. Speak strictly in the 1st person ('I', 'me', 'my').
    - NEVER break character. NEVER output AI filler.
    - Keep sentences short so I don't stumble while speaking.
    - EXPLAINING CONCEPTS: If the interviewer asks basic questions like "What is the Approach?", "What is the Time Complexity?", or "What is the Space Complexity?", you MUST give me a script that explains the *why* and *how* in extremely simple layman's analogies. Never just say "It is O(N)" without explaining why in plain English.

    SILENT DIRECTIVE: Acknowledge these instructions. I am currently analyzing the problem statement. Reply ONLY with this exact sentence so I can read it to stall: "Give me just one moment to read through the constraints and wrap my head around the inputs."`,

    VOICE_SYNC_BRUTE_FORCE: `SYSTEM DIRECTIVE: You are my teleprompter. The microphone is hot. I just wrote the brute-force code.
    CRITICAL CONTEXT: I have ZERO DSA knowledge. Break down every concept as if teaching a beginner.
    
    STRICT RULES:
    - APPROACH: Explain the core idea using a real-world analogy.
    - COMPLEXITY: Explain *why* the Time/Space complexity is what it is.
    - STRICT DRY RUN: You MUST do the dry run ON THE CODE. Explain it line-by-line. Quote the exact code snippet for every step and state how the variables change. Format as a strict list: "Line X: \`[snippet]\` -> [Variable Changes]".
    - ERRORS: If I paste an ERROR, give me a script saying: "Ah, I see the bug. Let me fix that."
    
    Here is the code I wrote. Internalize it silently. Reply ONLY with: "Brute force synced. Feed me interviewer hints, errors, or ask for the snippet-mapped dry run."\n\nCODE: \n\n`,
    
    VOICE_SYNC_OPTIMIZED: `SYSTEM DIRECTIVE: You are my teleprompter. The microphone is hot. I just wrote the optimized code.
    CRITICAL CONTEXT: I have ZERO DSA knowledge. Keep explanations extremely detailed and analogy-based.
    
    STRICT RULES:
    - APPROACH: Explain the clever trick used to optimize it using a simple real-world analogy.
    - STRICT DRY RUN: You MUST do the dry run ON THE CODE. Explain it line-by-line. Quote the exact code snippet for every step and state how the variables change. Format as a strict list: "Line X: \`[snippet]\` -> [Variable Changes]".
    - QUESTIONS: Answer any counter-question instantly with a simple 1st-person script.
    
    Here is the optimized code. Internalize it silently. Reply ONLY with: "Optimized code synced. Feed me errors, hints, or questions."\n\nCODE: \n\n`,
    
    // 🟢 COMPANION BRAIN PROMPTS
    COMPANION_INITIAL_CONTEXT: `SYSTEM DIRECTIVE: You are my live copilot during a technical interview. You are NOT talking to the interviewer; you are secretly listening to my room's microphone to help ME. I will manually sync you with the code the interviewer sees. 
    CRITICAL RULES:
    1. When I ask you for help (e.g., "I am doing a dry run", "What do I say?", "Help me explain this"), you must give me EXACTLY what to say out loud to the interviewer.
    2. Speak strictly in the 1st person ("I", "my", "me").
    3. Keep sentences short so I don't stumble while reading.
    4. NEVER output AI filler or break character. 
    Acknowledge this silently by replying ONLY with: "🤝 Companion Brain Online. Listening to your mic..."`,

    COMPANION_SYNC_CODE: `SYSTEM DIRECTIVE: Here is the code I just wrote/pasted for the interviewer. Internalize it silently.
    If I pause, stumble, or ask you to explain it, give me a short, 1st-person script to read out loud. 
    If I ask for a dry run, explain it line-by-line mapping the exact code snippet to the variable changes.
    Reply ONLY with: "🤝 Code synced to Companion. I am listening..."\n\nCODE: \n\n`
};

const { app, BrowserWindow, shell, ipcMain, session, desktopCapturer, clipboard, nativeImage, dialog, screen } = require('electron');
require('events').EventEmitter.defaultMaxListeners = 25; // 🟢 FIX BUG 1: Stop MaxListeners Warning
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => { event.preventDefault(); callback(true); }); // 🟢 FIX BUG 1: Suppress SSL Drops

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
let voiceWebWindowPrimary = null;  // 🟢 NEW: Primary Voice
let voiceWebWindowSecondary = null; // 🟢 NEW: Backup Voice (Racer)
let currentVoiceWinner = 'primary'; // 🟢 NEW: Tracks the fastest AI
let companionWebWindow = null;
let codeWebWindow = null;
let codeWebWindowPrimary = null;
let codeWebWindowSecondary = null;
let currentCodeWinner = null;
let companionChatWindow = null;
let activeLoadout = { voiceEngine: 0, voiceProfileId: '1', codeEngine: 1, codeProfileId: '2' };
let accumulatedScreenshots = [];
let scrapingInterval = null;
let isAppQuitting = false;
let wasAiVisibleBeforeGhost = false;

global.zoomWindow = null;
global.isPanesSwapped = false;
global.radialHudWindow = null; 
global.activeRadialLabels = Array(16).fill('—');
global.isOAModeActive = false;
global.isGhostHidden = false; 
global.isThinkModeActive = false; 
global.isExtractingFollowup = false;
global.followupJustSent = false;

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
            resizable: false,
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

        let toastTimeout;
        ipcRenderer.on('update-hud-toast', (e, msg) => {
            centerText.innerText = msg;
            centerText.style.color = '#00cc66';
            centerText.style.borderColor = '#00cc66';
            centerText.style.boxShadow = '0 0 15px rgba(0,204,102,0.4)';
            
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                centerText.innerText = 'RADIAL MINIMAP';
                centerText.style.color = '#f14c4c';
                centerText.style.borderColor = '#f14c4c';
                centerText.style.boxShadow = 'none';
            }, 2500);
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
    
    // 🟢 STRONGER FALLBACK: Ensure all 4 brains have default IDs mapped if legacy settings exist
    activeLoadout = loadouts.find(l => l.id === (prefs.activeLoadoutId || 'loadout_1')) || 
                    loadouts[0] ||
                    { voiceEngine: 0, voiceProfileId: '1', voiceEngine2: 0, voiceProfile2Id: '3', codeEngine: 1, codeProfileId: '2', codeEngine2: 1, codeProfile2Id: '4' };

    // 🟢 BULLETPROOF INDICES: Force a valid integer even if the saved setting is completely undefined
    const v1Idx = activeLoadout.voiceEngine !== undefined ? activeLoadout.voiceEngine : 0;
    const v2Idx = activeLoadout.voiceEngine2 !== undefined ? activeLoadout.voiceEngine2 : 0;
    const c1Idx = activeLoadout.codeEngine !== undefined ? activeLoadout.codeEngine : 1;
    const c2Idx = activeLoadout.codeEngine2 !== undefined ? activeLoadout.codeEngine2 : 1;

    const voiceProviderPrimary = AI_CONFIGS[v1Idx];
    const voiceProviderSecondary = AI_CONFIGS[v2Idx];
    const codeProviderPrimary = AI_CONFIGS[c1Idx];
    const codeProviderSecondary = AI_CONFIGS[c2Idx];

    // 🟢 UNIVERSAL MIC INJECTOR HELPER
    const injectVoiceScripts = async (win, targetAudioMode) => {
        win.webContents.insertCSS('* { cursor: default !important; }');
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen'] });
            if (!sources || sources.length === 0) return;
            const screenSourceId = sources[0].id;

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
                                            sysStream.getVideoTracks().forEach(t => t.stop());
                                        }
                                    } catch(e) { }
                                }

                                if (mode === 'mic_only' || mode === 'both') {
                                    try {
                                        const micStream = await originalGetUserMedia({ audio: true });
                                        const micTrack = micStream.getAudioTracks()[0];
                                        if (micTrack) {
                                            const micSource = ctx.createMediaStreamSource(new MediaStream([micTrack]));
                                            micSource.connect(dest);
                                        }
                                    } catch(e) { }
                                }
                                
                                const osc = ctx.createOscillator();
                                osc.frequency.value = 20000; 
                                const gain = ctx.createGain();
                                gain.gain.value = 0.01; 
                                osc.connect(gain);
                                gain.connect(dest);
                                osc.start();
                                
                                setInterval(() => {
                                    try {
                                        if(ctx.state === 'suspended') ctx.resume();
                                        const burst = ctx.createOscillator();
                                        burst.frequency.value = 100; 
                                        const burstGain = ctx.createGain();
                                        burstGain.gain.setValueAtTime(0.01, ctx.currentTime);
                                        burstGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
                                        burst.connect(burstGain);
                                        burstGain.connect(dest);
                                        burst.start();
                                        burst.stop(ctx.currentTime + 0.2);
                                    } catch(e) {}
                                }, 15000);
                                
                                return dest.stream;
                            } catch (err) { return originalGetUserMedia(constraints); }
                        }
                        return originalGetUserMedia(constraints);
                    };
                }
                true;
            `;
            
            await win.webContents.executeJavaScript(hijackScript);

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
            win.webContents.executeJavaScript(assassinScript).catch(()=>{});
            
        } catch (err) { }
    };

    const targetAudioMode = prefs.audioMode || 'speaker_only';

    // 🟢 1. LAUNCH PRIMARY VOICE BRAIN
    if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) voiceWebWindowPrimary.destroy();
    voiceWebWindowPrimary = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        frame: false, resizable: false, maximizable: false, minimizable: false, closable: false,
        title: `🗣️ Voice Brain: ${voiceProviderPrimary.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.voiceProfileId || '1'}` }
    });
    voiceWebWindowPrimary.setContentProtection(true);
    voiceWebWindowPrimary.webContents.setAudioMuted(true);
    if (process.platform === 'win32') voiceWebWindowPrimary.setAlwaysOnTop(true, 'floating', 1);
    voiceWebWindowPrimary.loadURL(voiceProviderPrimary.url);
    voiceWebWindowPrimary.webContents.on('dom-ready', () => injectVoiceScripts(voiceWebWindowPrimary, targetAudioMode));

    voiceWebWindow = voiceWebWindowPrimary; // Alias default

    // 🟢 2. LAUNCH SECONDARY BACKUP VOICE BRAIN (THE RACER)
    if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) voiceWebWindowSecondary.destroy();
    voiceWebWindowSecondary = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        frame: false, resizable: false, maximizable: false, minimizable: false, closable: false,
        title: `🏎️ Backup Voice Brain: ${voiceProviderSecondary.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.voiceProfile2Id || '3'}` }
    });
    voiceWebWindowSecondary.setContentProtection(true);
    voiceWebWindowSecondary.webContents.setAudioMuted(true);
    if (process.platform === 'win32') voiceWebWindowSecondary.setAlwaysOnTop(true, 'floating', 1);
    voiceWebWindowSecondary.loadURL(voiceProviderSecondary.url);
    voiceWebWindowSecondary.webContents.on('dom-ready', () => injectVoiceScripts(voiceWebWindowSecondary, targetAudioMode));

    // 🟢 3. LAUNCH PRIMARY CODE BRAIN
    if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) codeWebWindowPrimary.destroy();
    codeWebWindowPrimary = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        frame: false, resizable: false, maximizable: false, minimizable: false, closable: false,
        title: `💻 Code Brain: ${codeProviderPrimary.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.codeProfileId || '2'}` }
    });
    codeWebWindowPrimary.setContentProtection(true);
    codeWebWindowPrimary.webContents.setAudioMuted(true);
    if (process.platform === 'win32') codeWebWindowPrimary.setAlwaysOnTop(true, 'floating', 1);
    codeWebWindowPrimary.loadURL(codeProviderPrimary.url);
    codeWebWindowPrimary.webContents.on('dom-ready', async () => {
        codeWebWindowPrimary.webContents.insertCSS('* { cursor: default !important; }');
        await codeWebWindowPrimary.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked")); true;`).catch(() => {});
    });

    codeWebWindow = codeWebWindowPrimary; // Alias default

    // 🟢 4. LAUNCH BACKUP CODE BRAIN (THE HIGHLANDER RACER)
    if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) codeWebWindowSecondary.destroy();
    codeWebWindowSecondary = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        frame: false, resizable: false, maximizable: false, minimizable: false, closable: false,
        title: `🏎️ Backup Code Brain: ${codeProviderSecondary.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.codeProfile2Id || '4'}` }
    });
    codeWebWindowSecondary.setContentProtection(true);
    codeWebWindowSecondary.webContents.setAudioMuted(true);
    if (process.platform === 'win32') codeWebWindowSecondary.setAlwaysOnTop(true, 'floating', 1);
    codeWebWindowSecondary.loadURL(codeProviderSecondary.url);
    codeWebWindowSecondary.webContents.on('dom-ready', async () => {
        codeWebWindowSecondary.webContents.insertCSS('* { cursor: default !important; }');
        await codeWebWindowSecondary.webContents.executeJavaScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Mic blocked")); true;`).catch(() => {});
    });

    // 🟢 5. LAUNCH COMPANION BRAIN (NO HIJACK SCRIPT - USES RAW MIC)
    const compProvider = AI_CONFIGS[activeLoadout.companionEngine !== undefined ? activeLoadout.companionEngine : 0];
    if (companionWebWindow && !companionWebWindow.isDestroyed()) companionWebWindow.destroy();
    companionWebWindow = new BrowserWindow({
        width: 1000, height: 800, show: false, skipTaskbar: true, autoHideMenuBar: true, alwaysOnTop: true,
        frame: false, resizable: false, maximizable: false, minimizable: false, closable: false,
        title: `🤝 Companion Brain: ${compProvider.name}`,
        webPreferences: { nodeIntegration: false, contextIsolation: true, backgroundThrottling: false, partition: `persist:ai_profile_${activeLoadout.companionProfileId || '5'}` }
    });
    companionWebWindow.setContentProtection(true);
    if (process.platform === 'win32') companionWebWindow.setAlwaysOnTop(true, 'floating', 1);
    companionWebWindow.loadURL(compProvider.url);

    const preventDeath = (win) => {
        if (!win) return;
        win.on('close', (event) => { if (!isAppQuitting) { event.preventDefault(); win.hide(); } });
        win.on('focus', () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
                global.radialHudWindow.setAlwaysOnTop(true, 'screen-saver', 9);
                global.radialHudWindow.moveTop();
            }
        });
    };
    preventDeath(voiceWebWindowPrimary);
    preventDeath(voiceWebWindowSecondary);
    preventDeath(codeWebWindowPrimary);
    preventDeath(codeWebWindowSecondary);
    preventDeath(companionWebWindow);

    startDualScrapers(voiceProviderPrimary, codeProviderPrimary);
}

function startDualScrapers(voiceProvider, codeProvider) {
    if (scrapingInterval) clearInterval(scrapingInterval);
    
    let lastVoiceMsg = { count: 0, text: "" }, lastCodeMsg = { count: 0, text: "" }, lastMicState = null;
    let codeStableTicks = 0; 
    global.bruteForceSyncPending = false; 

    // 🟢 NEW: The script we inject into BOTH Voice Brains to extract text
    const voiceExtractScript = `
        (() => {
            try {
                const msgs = Array.from(document.querySelectorAll('[data-testid="user-message"], [data-message-author-role], .message, .user-message, model-response, user-query, .prose, div.group\\\\/conversation-turn'));
                const uniqueMsgs = [];
                msgs.forEach(el => { if (!msgs.some(p => p !== el && p.contains(el))) uniqueMsgs.push(el); });

                let filtered = [];
                uniqueMsgs.forEach(el => {
                    let txt = (el.innerText || '').trim();
                    if(!txt) return;
                    if (txt.includes('SYSTEM DIRECTIVE') || txt.includes('Brute force synced') || 
                        txt.includes('Optimized code synced') || txt.includes('Act as a senior') || 
                        txt.includes('Give me just one moment')) return;

                    let isUser = false;
                    if (window.location.hostname.includes('grok')) {
                        isUser = !el.classList.contains('prose') && !el.querySelector('.prose');
                    } else {
                        isUser = el.closest('[data-testid="user-message"]') || el.closest('[data-message-author-role="user"]') || el.closest('.user-message') || el.tagName.toLowerCase() === 'user-query' || el.className.toLowerCase().includes('user');
                    }

                    // 🟢 THE SMART FILTER: 
                    // Hide our massive injected system prompts so they don't clutter the UI.
                    // But allow ALL normal spoken transcripts and 100% of AI responses through!
                    if (isUser && (txt.includes('SYSTEM DIRECTIVE') || txt.includes('Act as a senior') || txt.includes('[FOLLOWUP_DATA]'))) {
                        return; 
                    }

                    filtered.push((isUser ? "🎙️ **Transcript:**\\n" : "🤖 **AI:**\\n") + txt);
                });

                if(filtered.length === 0) return null;
                return { count: filtered.length, text: filtered.slice(-6).join('\\n\\n---\\n\\n') };
            } catch(e) { return null; }
        })();
    `;

    scrapingInterval = setInterval(async () => {
        // ====================================================================
        // 🏎️ THE RACE CONDITION: Scrape both Voice Brains simultaneously
        // ====================================================================
        const getVData = async (win) => {
            if (!win || win.isDestroyed()) return null;
            return await win.webContents.executeJavaScript(voiceExtractScript).catch(() => null);
        };

        const [vData1, vData2] = await Promise.all([
            getVData(voiceWebWindowPrimary),
            getVData(voiceWebWindowSecondary)
        ]);

        let winnerData = null;

        // Determine the fastest brain to generate a NEW response block
        if (vData1 && vData1.count > lastVoiceMsg.count) {
            currentVoiceWinner = 'primary';
            winnerData = vData1;
        } else if (vData2 && vData2.count > lastVoiceMsg.count) {
            currentVoiceWinner = 'secondary';
            winnerData = vData2;
        } else if (currentVoiceWinner === 'primary' && vData1) {
            winnerData = vData1; // Keep scraping the winner while it types
        } else if (currentVoiceWinner === 'secondary' && vData2) {
            winnerData = vData2; // Keep scraping the winner while it types
        }

        // Pipe the winner's text to your overlay UI
        if (winnerData) {
            if (winnerData.count > lastVoiceMsg.count) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('voice-new-message', winnerData.text); });
            } else if (winnerData.count === lastVoiceMsg.count && winnerData.text !== lastVoiceMsg.text) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('voice-update-message', winnerData.text); });
            }
            lastVoiceMsg = winnerData;
        }

        // 🟢 COMPANION BRAIN SCRAPER
        const compData = await getVData(companionWebWindow);
        if (compData) {
            if (compData.count > (global.lastCompCount || 0)) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('companion-new-message', compData.text); });
            } else if (compData.count === (global.lastCompCount || 0) && compData.text !== (global.lastCompText || "")) {
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('companion-update-message', compData.text); });
            }
            global.lastCompCount = compData.count; global.lastCompText = compData.text;
        }

        // ====================================================================
        // 💻 CODE BRAIN HIGHLANDER RACE (There can be only one)
        // ====================================================================
        const codeExtractScript = `
            (() => {
                try {
                    const sel = window.location.hostname.includes('chatgpt') ? 'div[data-message-author-role="assistant"]' :
                                window.location.hostname.includes('grok') ? '.prose' : 'model-response';
                    const msgs = Array.from(document.querySelectorAll(sel)).filter(el => {
                        if (el.closest('[data-testid="user-message"]') || el.closest('[data-message-author-role="user"]') || el.closest('.user-message')) return false;
                        return (el.innerText || '').trim().length > 0;
                    });
                    if (msgs.length === 0) return null;
                    return { count: msgs.length, text: msgs[msgs.length - 1].innerText.trim() };
                } catch(e) { return null; }
            })();
        `;

        const getCData = async (win) => {
            if (!win || win.isDestroyed()) return null;
            return await win.webContents.executeJavaScript(codeExtractScript).catch(() => null);
        };

        let cData1 = await getCData(codeWebWindowPrimary);
        let cData2 = await getCData(codeWebWindowSecondary);

        if (global.code1StableTicks === undefined) { 
            global.code1StableTicks = 0; global.lastCode1Text = ""; 
            global.code2StableTicks = 0; global.lastCode2Text = ""; 
        }

        // Stability Tracker (Increments if text > 50 chars and hasn't changed in 1s)
        if (cData1 && cData1.text === global.lastCode1Text && cData1.text.length > 50) global.code1StableTicks++;
        else { global.code1StableTicks = 0; global.lastCode1Text = cData1 ? cData1.text : ""; }

        if (cData2 && cData2.text === global.lastCode2Text && cData2.text.length > 50) global.code2StableTicks++;
        else { global.code2StableTicks = 0; global.lastCode2Text = cData2 ? cData2.text : ""; }

        // 🪓 THE EXECUTIONER: Kill the loser, but ONLY if the winner actually wrote comments
        if (currentCodeWinner === null) {
            const checkWin = (data, ticks) => {
                if (!data || !data.text) return false;
                
                const isFinished = data.text.includes('[CODE_END]') || (ticks >= 5 && (data.text.includes('```') || data.text.includes('###')));
                if (!isFinished) return false;

                // 🟢 STRICT COMMENT CHECK: Extract code block and count lines vs comments
                let codeContent = data.text;
                if (data.text.includes('[CODE_START]') && data.text.includes('[CODE_END]')) {
                    codeContent = data.text.split('[CODE_START]')[1].split('[CODE_END]')[0];
                } else if (data.text.includes('```')) {
                    codeContent = data.text.split('```')[1] || data.text;
                }
                
                const lines = codeContent.split('\n').filter(l => l.trim().length > 0);
                const commentLines = lines.filter(l => l.includes('//') || l.includes('#'));
                
                // If it's a real code block (> 5 lines), mandate that at least 35% of the lines have comments
                if (lines.length > 5 && (commentLines.length / lines.length) < 0.35) {
                    return false; // VETO: Refuse to let this AI win because it didn't comment enough!
                }
                
                return true;
            };
            
            if (checkWin(cData1, global.code1StableTicks)) {
                currentCodeWinner = 'primary';
                if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) codeWebWindowSecondary.destroy();
                codeWebWindowSecondary = null;
                codeWebWindow = codeWebWindowPrimary; // Secure the alias
                if (global.applyAIBounds) global.applyAIBounds(true); // Snap to 50% Grid
            } else if (checkWin(cData2, global.code2StableTicks)) {
                currentCodeWinner = 'secondary';
                if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) codeWebWindowPrimary.destroy();
                codeWebWindowPrimary = null;
                codeWebWindow = codeWebWindowSecondary; // Secure the alias
                if (global.applyAIBounds) global.applyAIBounds(true); // Snap to 50% Grid
            }
        }

        // Pipe the active leader (or winner) to the UI
        let cData = currentCodeWinner === 'secondary' ? cData2 : (currentCodeWinner === 'primary' ? cData1 : (cData1 || cData2));

        if (cData) {
            if (global.isExtractingFollowup) {
                if (cData.count === lastCodeMsg.count && cData.text === lastCodeMsg.text && cData.text.length > 10) {
                    codeStableTicks++;
                    if (codeStableTicks === 3 && !global.followupJustSent) {
                        global.followupJustSent = true; 
                        let extractedText = cData.text;
                        if (extractedText.includes('[FOLLOWUP_DATA]:')) {
                            extractedText = extractedText.split('[FOLLOWUP_DATA]:')[1].trim();
                        }
                        
                        let baseVoicePrompt = `SYSTEM DIRECTIVE: The interviewer just shared this on the screen:\n\n${extractedText}\n\nBased on the verbal instructions the interviewer just gave you, provide a short 1st-person script for me to dry-run this, fix the error, or acknowledge the constraint. Keep it extremely concise.`;
                        let vPrompt1 = baseVoicePrompt;
                        let vPrompt2 = baseVoicePrompt;
                        let compPrompt = baseVoicePrompt;
                        
                        let v1Idx = activeLoadout.voiceEngine !== undefined ? activeLoadout.voiceEngine : 0;
                        let v2Idx = activeLoadout.voiceEngine2 !== undefined ? activeLoadout.voiceEngine2 : 0;
                        let compIdx = activeLoadout.companionEngine !== undefined ? activeLoadout.companionEngine : 0;
                        
                        if (AI_CONFIGS[v1Idx].name === 'Gemini') vPrompt1 = '@Fast ' + vPrompt1;
                        if (AI_CONFIGS[v2Idx].name === 'Gemini') vPrompt2 = '@Fast ' + vPrompt2;
                        if (AI_CONFIGS[compIdx].name === 'Gemini') compPrompt = '@Fast ' + compPrompt;
                        
                        // 🟢 Send Followup to BOTH Voice Brains AND the Companion Brain
                        if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) sendPayloadToWindow(voiceWebWindowPrimary, vPrompt1, [], AI_CONFIGS[v1Idx].name).catch(()=>{});
                        if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) sendPayloadToWindow(voiceWebWindowSecondary, vPrompt2, [], AI_CONFIGS[v2Idx].name).catch(()=>{});
                        if (companionWebWindow && !companionWebWindow.isDestroyed()) sendPayloadToWindow(companionWebWindow, compPrompt, [], AI_CONFIGS[compIdx].name).catch(()=>{});
                        
                        BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('show-radial-toast', '✅ FOLLOW-UP SYNCED'); });
                    }
                } else {
                    if (!global.followupJustSent) codeStableTicks = 0; 
                }
                lastCodeMsg = cData; 
            } else {
                if (cData.count > lastCodeMsg.count) {
                    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-new-message', cData.text); });
                    codeStableTicks = 0;
                } 
                else if (cData.count === lastCodeMsg.count && cData.text !== lastCodeMsg.text) {
                    BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('code-update-message', cData.text); });
                    codeStableTicks = 0; 
                }
                else if (cData.count === lastCodeMsg.count && cData.text === lastCodeMsg.text && cData.text.length > 50) {
                    codeStableTicks++;
                    // 🟢 Auto-sync disabled per user request. User will sync manually.
                    if (codeStableTicks === 3 && global.currentSessionMode === 'proctored_live_interview' && global.bruteForceSyncPending) {
                        global.bruteForceSyncPending = false; 
                    }
                }
                lastCodeMsg = cData;
            }
        }

        // ====================================================================
        // 🎙️ MIC STATE MONITORING (Reads from Primary Only to save CPU)
        // ====================================================================
        if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed() && global.currentSessionMode === 'proctored_live_interview') {
            const spyScript = `
                (function() {
                    try {
                        let btns = Array.from(document.querySelectorAll('button, div[role="button"]')); 
                        if (window.location.hostname.includes('grok')) return true;
                        let micBtn = btns.find(b => {
                            let a = (b.getAttribute('aria-label') || '').toLowerCase();
                            let t = (b.getAttribute('title') || '').toLowerCase();
                            let c = (b.className || '').toLowerCase();
                            let txt = (b.textContent || '').trim().toLowerCase();
                            if (a.includes('stop') || a.includes('end ') || t.includes('stop') || txt === 'stop') return false;
                            return a.includes('microphone') || a.includes('voice') || a.includes('mute') || 
                                   t.includes('microphone') || t.includes('mute') || c.includes('mic-');
                        });
                        if (!micBtn) return false; 
                        let a = (micBtn.getAttribute('aria-label') || '').toLowerCase();
                        let t = (micBtn.getAttribute('title') || '').toLowerCase();
                        let html = micBtn.innerHTML.toLowerCase();
                        if (a.includes('unmute') || t.includes('unmute') || a.includes('turn on') || t.includes('turn on') || html.includes('<line') || html.includes('slash') || html.includes('off')) {
                            return false; 
                        }
                        return true;
                    } catch(e) { return false; }
                })();
            `;
            voiceWebWindowPrimary.webContents.executeJavaScript(spyScript).then((isMicActive) => {
                if (isMicActive !== lastMicState) {
                    lastMicState = isMicActive;
                    BrowserWindow.getAllWindows().forEach(w => {
                        if (!w.isDestroyed() && w !== voiceWebWindowPrimary && w !== codeWebWindow) { w.webContents.send('sync-mic-state', !!isMicActive); }
                    });
                }
            }).catch(() => { });
        }
    }, 1000);
}

// 🟢 NEW: Smart Voice & Mic Helper (Multi-Model Support)
async function ensureVoiceAndMic(win, providerName) {
    if (!win || win.isDestroyed()) return;

    if (providerName === 'ChatGPT') {
        // ------------------ CHATGPT SPECIFIC LOGIC ------------------
        const isCallActive = await win.webContents.executeJavaScript(`(() => {
            let stopBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
                let a = (b.getAttribute('aria-label')||'').toLowerCase();
                return a.includes('stop') || a.includes('end call') || a.includes('leave call');
            });
            return !!stopBtn;
        })()`).catch(() => false);

        if (!isCallActive) {
            const isThinkingMode = await win.webContents.executeJavaScript(`(() => {
                let indicator = Array.from(document.querySelectorAll('*')).find(el => (el.textContent || '').trim().toLowerCase() === 'thinking' && el.children.length === 0);
                let btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.getAttribute('aria-haspopup'));
                return !!indicator || (btn && (btn.textContent || '').toLowerCase().includes('thinking'));
            })()`).catch(() => false);

            if (isThinkingMode) {
                await win.webContents.executeJavaScript(`(() => { const el = document.querySelector('rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); if (el) el.focus(); })()`).catch(()=>{});
                win.webContents.insertText('/thinking');
                await new Promise(r => setTimeout(r, 600)); 
                win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
                win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
                await new Promise(r => setTimeout(r, 800)); 
            }

            win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['ctrl', 'alt'], keyCode: 'V' });
            win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['ctrl', 'alt'], keyCode: 'V' });
            await win.webContents.executeJavaScript(`(() => {
                let btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
                    let a = (b.getAttribute('aria-label')||'').toLowerCase();
                    return a.includes('voice') || a.includes('start voice');
                });
                if(btn) btn.click();
            })()`).catch(()=>{});
            await new Promise(r => setTimeout(r, 2500)); 
        }

        await win.webContents.executeJavaScript(`(async () => {
            let attempts = 0;
            while(attempts < 90) { 
                let unmute = Array.from(document.querySelectorAll('button')).find(b => {
                    let a = (b.getAttribute('aria-label')||'').toLowerCase();
                    return a.includes('turn on microphone') || a === 'unmute';
                });
                if(unmute) {
                    unmute.style.boxShadow = '0 0 10px #00cc66'; 
                    setTimeout(() => unmute.click(), 200);
                    break;
                }
                attempts++;
                await new Promise(r => setTimeout(r, 500));
            }
        })()`).catch(()=>{});

    } else if (providerName === 'Grok') {
        // ------------------ GROK GENERIC LOGIC ------------------
        // 🟢 USER DIRECTIVE: Do not automate Grok's Mic/Voice Chat handling.
        // The user will turn Voice Chat ON/OFF manually. DO NOT click anything.
        return;
    }
}

// 🟢 NEW: Synchronized Typing Simulator to ensure @Pro and @Fast chips register perfectly
async function sendPayloadToWindow(win, customText, images = [], providerName = 'ChatGPT') {
    if (!win || win.isDestroyed()) return;
    
    // 🟢 FIX: Broadened selector with priority for Grok's specific textarea
    const isBoxReady = await win.webContents.executeJavaScript(`(() => { try { const el = document.querySelector('textarea[placeholder*="Grok"], textarea, rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); if (el && el.offsetParent !== null) { el.focus(); return true; } return false; } catch(e) { return false; } })()`);
    if (!isBoxReady) return;

    let modeTag = null;
    let textToPaste = customText || '';

    // Strip the macro tags out of the text string
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
    if (modeTag && providerName === 'Gemini') {
        // Deselect text
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
        await new Promise(r => setTimeout(r, 100));

        // Shift+Enter to drop to new line
        win.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['shift'], keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', modifiers: ['shift'], keyCode: 'Enter' });
        await new Promise(r => setTimeout(r, 100));

        // 🟢 BUG 1 FIX: Type @ -> Pause -> Type Fast -> Pause -> Enter to lock chip
        win.webContents.insertText('@');
        await new Promise(r => setTimeout(r, 600)); 
        
        for (let i = 0; i < modeTag.length; i++) {
            win.webContents.insertText(modeTag[i]);
            await new Promise(r => setTimeout(r, 150)); 
        }
        await new Promise(r => setTimeout(r, 400)); 
        
        // Hit ENTER to lock the blue chip in Gemini
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); 
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' }); 
        await new Promise(r => setTimeout(r, 300));
    }

    // 3. Paste Images LAST
    for (let imgData of images) {
        if (providerName === 'Grok') {
            // 🟢 Method A: Direct DOM File Injection (Strictly for Grok's React UI)
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
            // 🟢 Method B: Hardware Keystroke (Strictly for Gemini & ChatGPT)
            const img = nativeImage.createFromDataURL(imgData);
            clipboard.writeImage(img);
            
            // Force focus back to Gemini/ChatGPT text box before pasting
            await win.webContents.executeJavaScript(`(() => { try { const el = document.querySelector('rich-textarea p, #prompt-textarea, [contenteditable="true"][role="textbox"], .ql-editor'); if (el) el.focus(); } catch(e) {} })()`);
            
            const modifier = process.platform === 'darwin' ? 'meta' : 'control';
            win.webContents.sendInputEvent({ type: 'keyDown', modifiers: [modifier], keyCode: 'V' });
            win.webContents.sendInputEvent({ type: 'keyUp', modifiers: [modifier], keyCode: 'V' });
        }
        
        await new Promise(r => setTimeout(r, 600)); 
    }

    // 🟢 THE FIX: Ultimate Separation of Concerns. Hardcoded URL check for Grok.
    const isGrok = providerName === 'Grok' || win.webContents.getURL().includes('grok.com');

    if (isGrok) {
        // Grok requires absolute zero UI automation. No button hunting. No false clicks.
        // We just simulate the human pressing the physical 'Enter' key to submit the pasted text.
        await new Promise(r => setTimeout(r, 200));
        win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' });
        win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
    } else {
        // Legacy "Send Button Hunter" for ChatGPT and Gemini ONLY.
        const sendBtnSelector = 'button[aria-label*="Send" i], button[aria-label*="Submit" i], button[data-testid="send-button"], button[aria-label*="Enter" i]';
        
        let isReady = false, attempts = 0;
        while (!isReady && attempts < 10) {
            isReady = await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); return !!(btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true'); } catch(e) { return false; } })()`);
            if (!isReady) { await new Promise(r => setTimeout(r, 500)); attempts++; }
        }
        
        await new Promise(r => setTimeout(r, 200));
        await win.webContents.executeJavaScript(`(() => { try { const btn = document.querySelector('${sendBtnSelector}'); if(btn) btn.click(); return true; } catch(e) { return false; } })()`);
        
        setTimeout(() => { 
            if (!win.isDestroyed()) { 
                win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Enter' }); 
                win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Enter' });
            }
            
            if (win === voiceWebWindow) {
                setTimeout(async () => {
                    await ensureVoiceAndMic(win, providerName);
                }, 3500);
            }
        }, 200);
    }
}

app.whenReady().then(async () => {
    // 🛡️ THE PERFECT CHROME MASK
    const pristineChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    app.on('session-created', (sess) => {
        sess.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
        sess.setPermissionCheckHandler(() => true);
        sess.setDisplayMediaRequestHandler((request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => { callback({ video: sources[0], audio: 'loopback' }); });
        }, { useSystemPicker: false });

        // Apply clean headers to EVERY window and completely delete Electron leak headers
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders['User-Agent'] = pristineChromeUA;
            delete details.requestHeaders['sec-ch-ua'];
            delete details.requestHeaders['sec-ch-ua-mobile'];
            delete details.requestHeaders['sec-ch-ua-platform'];
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(true));
    session.defaultSession.setPermissionCheckHandler(() => true);
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then(sources => { callback({ video: sources[0], audio: 'loopback' }); });
    }, { useSystemPicker: false });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = pristineChromeUA;
        delete details.requestHeaders['sec-ch-ua'];
        delete details.requestHeaders['sec-ch-ua-mobile'];
        delete details.requestHeaders['sec-ch-ua-platform'];
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    storage.initializeStorage();
    mainWindow = createWindow(); 

    mainWindow.on('hide', () => {
        // 🟢 FIX BUG 2: Target all windows explicitly so none are left behind
        if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed() && voiceWebWindowPrimary.isVisible()) voiceWebWindowPrimary.hide();
        if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed() && voiceWebWindowSecondary.isVisible()) voiceWebWindowSecondary.hide();
        if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed() && codeWebWindowPrimary.isVisible()) codeWebWindowPrimary.hide();
        if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed() && codeWebWindowSecondary.isVisible()) codeWebWindowSecondary.hide();
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

    // 🟢 STEALTH ZOOM HANDLER
    ipcMain.handle('toggle-zoom-window', () => {
        if (global.zoomWindow && !global.zoomWindow.isDestroyed()) {
            global.zoomWindow.show(); global.zoomWindow.focus();
            return true;
        }
        global.zoomWindow = new BrowserWindow({
            width: 1200, height: 800, show: true, autoHideMenuBar: true, title: "Zoom Web Client",
            skipTaskbar: true, // 🟢 STEALTH: Hides the window from the OS Taskbar completely
            webPreferences: { nodeIntegration: false, contextIsolation: true, partition: 'persist:zoom' }
        });
        
        // 🟢 STEALTH: Apply Content Protection (Renders the window as a black box to screen recording/sharing tools)
        global.zoomWindow.setContentProtection(true);
        
        // Spoof standard Chrome to ensure maximum compatibility with Zoom's WebRTC audio/video
        const pristineChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        global.zoomWindow.webContents.setUserAgent(pristineChromeUA);
        
        // Load the primary Zoom portal
        global.zoomWindow.loadURL('https://app.zoom.us/wc/home'); // 🟢 Directs straight to the Web Client portal
        
        global.zoomWindow.on('close', (e) => {
            if (!isAppQuitting) { e.preventDefault(); global.zoomWindow.minimize(); } // Minimize lock
        });
        return true;
    });

    // 🟢 CENTRALIZED WINDOW BOUNDS CALCULATOR (5-Pane Dynamic Grid)
    global.applyAIBounds = function(forceShow) {
        if (!codeWebWindowPrimary && !codeWebWindowSecondary) return false;
        
        const isVisible = (codeWebWindowPrimary && codeWebWindowPrimary.isVisible() && codeWebWindowPrimary.getOpacity() !== 0) || 
                          (codeWebWindowSecondary && codeWebWindowSecondary.isVisible() && codeWebWindowSecondary.getOpacity() !== 0);
        const targetVisible = forceShow !== undefined ? forceShow : !isVisible;

        if (targetVisible) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;

            if (global.currentSessionMode === 'proctored_oa') {
                const safeWidth = Math.max(800, Math.floor(width * 0.7));
                const safeHeight = Math.max(600, Math.floor(height * 0.8));
                const x = Math.floor((width - safeWidth) / 2);
                const y = Math.floor((height - safeHeight) / 2);

                const activeCode = currentCodeWinner === 'secondary' && codeWebWindowSecondary ? codeWebWindowSecondary : codeWebWindowPrimary;
                if (activeCode && !activeCode.isDestroyed()) {
                    activeCode.setOpacity(1); activeCode.setIgnoreMouseEvents(false);
                    activeCode.setAlwaysOnTop(true, 'floating', 1);
                    activeCode.setBounds({ x, y, width: safeWidth, height: safeHeight });
                    activeCode.showInactive();
                }
                [codeWebWindowPrimary, codeWebWindowSecondary, voiceWebWindowPrimary, voiceWebWindowSecondary, companionWebWindow].forEach(w => {
                    if (w && w !== activeCode && !w.isDestroyed()) w.hide();
                });
            } else {
                const halfWidth = Math.floor(width / 2);
                const halfHeight = Math.floor(height / 2);
                
                let codeX = global.isPanesSwapped ? halfWidth : 0;
                let voiceX = global.isPanesSwapped ? 0 : halfWidth;

                if (currentCodeWinner === null && codeWebWindowPrimary && codeWebWindowSecondary) {
                    // 🟢 THE RACE: 2x2 Grid (50x50 each) + COMPANION DEAD CENTER
                    if (!codeWebWindowPrimary.isDestroyed()) {
                        codeWebWindowPrimary.showInactive(); codeWebWindowPrimary.setOpacity(1); codeWebWindowPrimary.setIgnoreMouseEvents(false);
                        codeWebWindowPrimary.setAlwaysOnTop(true, 'floating', 1);
                        codeWebWindowPrimary.setBounds({ x: codeX, y: 0, width: halfWidth, height: halfHeight });
                    }
                    if (!codeWebWindowSecondary.isDestroyed()) {
                        codeWebWindowSecondary.showInactive(); codeWebWindowSecondary.setOpacity(1); codeWebWindowSecondary.setIgnoreMouseEvents(false);
                        codeWebWindowSecondary.setAlwaysOnTop(true, 'floating', 1);
                        codeWebWindowSecondary.setBounds({ x: codeX, y: halfHeight, width: halfWidth, height: height - halfHeight });
                    }
                    if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) {
                        voiceWebWindowPrimary.showInactive(); voiceWebWindowPrimary.setOpacity(1); voiceWebWindowPrimary.setIgnoreMouseEvents(false);
                        voiceWebWindowPrimary.setAlwaysOnTop(true, 'floating', 1);
                        voiceWebWindowPrimary.setBounds({ x: voiceX, y: 0, width: halfWidth, height: halfHeight });
                    }
                    if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) {
                        voiceWebWindowSecondary.showInactive(); voiceWebWindowSecondary.setOpacity(1); voiceWebWindowSecondary.setIgnoreMouseEvents(false);
                        voiceWebWindowSecondary.setAlwaysOnTop(true, 'floating', 1);
                        voiceWebWindowSecondary.setBounds({ x: voiceX, y: halfHeight, width: halfWidth, height: height - halfHeight });
                    }
                    if (companionWebWindow && !companionWebWindow.isDestroyed()) {
                        companionWebWindow.showInactive(); companionWebWindow.setOpacity(1); companionWebWindow.setIgnoreMouseEvents(false);
                        companionWebWindow.setAlwaysOnTop(true, 'floating', 2); // Force above others
                        companionWebWindow.setBounds({ x: Math.floor(width/4), y: Math.floor(height/4), width: Math.floor(width/2), height: Math.floor(height/2) });
                    }
                } else {
                    // 🟢 THE WINNER: 2x2 Grid (50x50 each) 
                    // Winner Code takes Top Code slot, Companion takes Bottom Code slot. Voices stay on Voice side.
                    const activeCode = currentCodeWinner === 'secondary' && codeWebWindowSecondary ? codeWebWindowSecondary : codeWebWindowPrimary;
                    
                    if (activeCode && !activeCode.isDestroyed()) {
                        activeCode.showInactive(); activeCode.setOpacity(1); activeCode.setIgnoreMouseEvents(false);
                        activeCode.setAlwaysOnTop(true, 'floating', 1);
                        activeCode.setBounds({ x: codeX, y: 0, width: halfWidth, height: halfHeight });
                    }
                    if (companionWebWindow && !companionWebWindow.isDestroyed()) {
                        companionWebWindow.showInactive(); companionWebWindow.setOpacity(1); companionWebWindow.setIgnoreMouseEvents(false);
                        companionWebWindow.setAlwaysOnTop(true, 'floating', 1);
                        companionWebWindow.setBounds({ x: codeX, y: halfHeight, width: halfWidth, height: height - halfHeight });
                    }
                    if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) {
                        voiceWebWindowPrimary.showInactive(); voiceWebWindowPrimary.setOpacity(1); voiceWebWindowPrimary.setIgnoreMouseEvents(false);
                        voiceWebWindowPrimary.setAlwaysOnTop(true, 'floating', 1);
                        voiceWebWindowPrimary.setBounds({ x: voiceX, y: 0, width: halfWidth, height: halfHeight });
                    }
                    if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) {
                        voiceWebWindowSecondary.showInactive(); voiceWebWindowSecondary.setOpacity(1); voiceWebWindowSecondary.setIgnoreMouseEvents(false);
                        voiceWebWindowSecondary.setAlwaysOnTop(true, 'floating', 1);
                        voiceWebWindowSecondary.setBounds({ x: voiceX, y: halfHeight, width: halfWidth, height: height - halfHeight });
                    }
                }
            }
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.moveTop();
            return true;
        } else {
            [codeWebWindowPrimary, codeWebWindowSecondary, voiceWebWindowPrimary, voiceWebWindowSecondary, companionWebWindow].forEach(w => {
                if (w && !w.isDestroyed()) w.hide();
            });
            return false;
        }
    };

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
            
            // 🟢 Target all 5 AI windows explicitly so none are left behind on Abort
            [voiceWebWindowPrimary, voiceWebWindowSecondary, codeWebWindowPrimary, codeWebWindowSecondary, companionWebWindow].forEach(w => {
                if (w && !w.isDestroyed()) {
                    w.hide(); w.setOpacity(1); w.setIgnoreMouseEvents(false);
                }
            });

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
            
            // 🟢 FIX: Instantly broadcast the captured image directly to the Frontend UI!
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed()) w.webContents.send('screenshot-captured', screenImage);
            });
            
            return accumulatedScreenshots.length;
        } catch (err) { return accumulatedScreenshots.length; }
    });

    ipcMain.handle('clear-screenshots', async () => { accumulatedScreenshots = []; return 0; });
    ipcMain.handle('get-screenshots', async () => { return accumulatedScreenshots; });

    const getModePrefix = () => global.isThinkModeActive ? '@Pro ' : '@Fast ';

    ipcMain.handle('send-oa-automation', async (event, language) => {
        try {
            if (accumulatedScreenshots.length === 0) return false;

            const imagesForThisQuestion = [...accumulatedScreenshots];
            accumulatedScreenshots = []; 

            global.isExtractingFollowup = false;

            // 🟢 Extract Safe Indices
            let c1Idx = activeLoadout.codeEngine !== undefined ? activeLoadout.codeEngine : 1;
            let c2Idx = activeLoadout.codeEngine2 !== undefined ? activeLoadout.codeEngine2 : 1;
            let v1Idx = activeLoadout.voiceEngine !== undefined ? activeLoadout.voiceEngine : 0;
            let v2Idx = activeLoadout.voiceEngine2 !== undefined ? activeLoadout.voiceEngine2 : 0;
            let compIdx = activeLoadout.companionEngine !== undefined ? activeLoadout.companionEngine : 0;

            if (global.currentSessionMode === 'proctored_live_interview') {
                global.isThinkModeActive = true; 
                global.bruteForceSyncPending = true; 
                BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('sync-ai-mode', true); });

                let codePromptPrimary = PROMPTS.INTERVIEW_OPTIMIZED;
                let codePromptSecondary = PROMPTS.INTERVIEW_OPTIMIZED;
                let voicePromptInit1 = PROMPTS.VOICE_INITIAL_CONTEXT;
                let voicePromptInit2 = PROMPTS.VOICE_INITIAL_CONTEXT;
                let compPromptInit = PROMPTS.COMPANION_INITIAL_CONTEXT;
                
                if (AI_CONFIGS[c1Idx].name === 'Gemini') codePromptPrimary = '@Pro ' + codePromptPrimary;
                if (AI_CONFIGS[c2Idx].name === 'Gemini') codePromptSecondary = '@Pro ' + codePromptSecondary;
                
                if (AI_CONFIGS[v1Idx].name === 'Gemini') voicePromptInit1 = '@Fast ' + voicePromptInit1;
                if (AI_CONFIGS[v2Idx].name === 'Gemini') voicePromptInit2 = '@Fast ' + voicePromptInit2;
                if (AI_CONFIGS[compIdx].name === 'Gemini') compPromptInit = '@Fast ' + compPromptInit;

                currentCodeWinner = (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) ? null : 'primary';
                if (global.applyAIBounds) global.applyAIBounds(true); 

                // 🟢 Send Optimized prompt to BOTH Code Brains simultaneously
                if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) {
                    sendPayloadToWindow(codeWebWindowPrimary, codePromptPrimary, imagesForThisQuestion, AI_CONFIGS[c1Idx].name).catch(()=>{});
                }
                if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) {
                    sendPayloadToWindow(codeWebWindowSecondary, codePromptSecondary, imagesForThisQuestion, AI_CONFIGS[c2Idx].name).catch(()=>{});
                }

                setTimeout(async () => {
                    if (global.currentSessionMode !== 'proctored_live_interview') return; 
                    if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) sendPayloadToWindow(voiceWebWindowPrimary, voicePromptInit1, [], AI_CONFIGS[v1Idx].name).catch(()=>{});
                    if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) sendPayloadToWindow(voiceWebWindowSecondary, voicePromptInit2, [], AI_CONFIGS[v2Idx].name).catch(()=>{});
                    if (companionWebWindow && !companionWebWindow.isDestroyed()) sendPayloadToWindow(companionWebWindow, compPromptInit, [], AI_CONFIGS[compIdx].name).catch(()=>{});
                }, 1000);

            } else {
                let codePromptPrimary = PROMPTS.OA_AUTOMATION(language); 
                let codePromptSecondary = PROMPTS.OA_AUTOMATION(language); 
                let voicePrompt1 = PROMPTS.VOICE_CONTEXT || "Answer this.";
                let voicePrompt2 = PROMPTS.VOICE_CONTEXT || "Answer this.";
                let compPromptInit = PROMPTS.COMPANION_INITIAL_CONTEXT;
                
                if (AI_CONFIGS[c1Idx].name === 'Gemini') codePromptPrimary = getModePrefix() + codePromptPrimary;
                if (AI_CONFIGS[c2Idx].name === 'Gemini') codePromptSecondary = getModePrefix() + codePromptSecondary;
                
                if (AI_CONFIGS[v1Idx].name === 'Gemini') voicePrompt1 = getModePrefix() + voicePrompt1;
                if (AI_CONFIGS[v2Idx].name === 'Gemini') voicePrompt2 = getModePrefix() + voicePrompt2;
                if (AI_CONFIGS[compIdx].name === 'Gemini') compPromptInit = getModePrefix() + compPromptInit;

                currentCodeWinner = (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) ? null : 'primary';
                if (global.applyAIBounds) global.applyAIBounds(true); 

                if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) sendPayloadToWindow(codeWebWindowPrimary, codePromptPrimary, imagesForThisQuestion, AI_CONFIGS[c1Idx].name).catch(()=>{});
                if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) sendPayloadToWindow(codeWebWindowSecondary, codePromptSecondary, imagesForThisQuestion, AI_CONFIGS[c2Idx].name).catch(()=>{});

                setTimeout(async () => { 
                    if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) sendPayloadToWindow(voiceWebWindowPrimary, voicePrompt1, [], AI_CONFIGS[v1Idx].name).catch(()=>{});
                    if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) sendPayloadToWindow(voiceWebWindowSecondary, voicePrompt2, [], AI_CONFIGS[v2Idx].name).catch(()=>{});
                    if (companionWebWindow && !companionWebWindow.isDestroyed()) sendPayloadToWindow(companionWebWindow, compPromptInit, [], AI_CONFIGS[compIdx].name).catch(()=>{});
                }, 1500);
            }
            return true;
        } catch(e) { console.error(e); return false; }
    });

    // 🟢 INVISIBLE RELAY: Auto-capture and send follow-up image to SURVIVING Code Brain
    ipcMain.handle('send-sync-followup', async () => {
        try {
            // 1. Force an instant, silent background screenshot
            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
            const screenImage = sources[0].thumbnail.toDataURL(); 

            // 2. Reset the relay state locks for unlimited uses
            global.isExtractingFollowup = true;
            global.followupJustSent = false;

            let c1Idx = activeLoadout.codeEngine !== undefined ? activeLoadout.codeEngine : 1;
            let codePrompt = PROMPTS.FOLLOWUP_EXTRACTION;
            if (AI_CONFIGS[c1Idx].name === 'Gemini') codePrompt = '@Fast ' + codePrompt;

            // 3. Beam the image silently to the SURVIVING Code Brain!
            const activeCode = currentCodeWinner === 'secondary' && codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed() ? codeWebWindowSecondary : codeWebWindowPrimary;
            const activeCodeIdx = currentCodeWinner === 'secondary' ? (activeLoadout.codeEngine2 !== undefined ? activeLoadout.codeEngine2 : 1) : c1Idx;

            if (activeCode && !activeCode.isDestroyed()) {
                await sendPayloadToWindow(activeCode, codePrompt, [screenImage], AI_CONFIGS[activeCodeIdx].name);
            }
            return true;
        } catch(e) { return false; }
    });

    // 🟢 RADIAL TOAST IPC: Forward toast messages to the HUD
    ipcMain.on('show-radial-toast', (event, msg) => {
        if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) {
            global.radialHudWindow.webContents.send('update-hud-toast', msg);
        }
    });

    ipcMain.handle('sync-optimized-to-voice', async (event, optimizedCodeText) => {
        try {
            let prompt1 = PROMPTS.VOICE_SYNC_OPTIMIZED + optimizedCodeText;
            let prompt2 = PROMPTS.VOICE_SYNC_OPTIMIZED + optimizedCodeText;
            let compPrompt = PROMPTS.COMPANION_SYNC_CODE + optimizedCodeText;
            
            let v1Idx = activeLoadout.voiceEngine !== undefined ? activeLoadout.voiceEngine : 0;
            let v2Idx = activeLoadout.voiceEngine2 !== undefined ? activeLoadout.voiceEngine2 : 0;
            let compIdx = activeLoadout.companionEngine !== undefined ? activeLoadout.companionEngine : 0;

            if (AI_CONFIGS[v1Idx].name === 'Gemini') prompt1 = '@Fast ' + prompt1; 
            if (AI_CONFIGS[v2Idx].name === 'Gemini') prompt2 = '@Fast ' + prompt2; 
            if (AI_CONFIGS[compIdx].name === 'Gemini') compPrompt = '@Fast ' + compPrompt;
            
            if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) sendPayloadToWindow(voiceWebWindowPrimary, prompt1, [], AI_CONFIGS[v1Idx].name).catch(()=>{});
            if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) sendPayloadToWindow(voiceWebWindowSecondary, prompt2, [], AI_CONFIGS[v2Idx].name).catch(()=>{});
            if (companionWebWindow && !companionWebWindow.isDestroyed()) sendPayloadToWindow(companionWebWindow, compPrompt, [], AI_CONFIGS[compIdx].name).catch(()=>{});
            
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('swap-ai-windows', async (event, isSwapped) => {
        global.isPanesSwapped = isSwapped;
        return global.applyAIBounds(true);
    });

    ipcMain.handle('new-chat', async () => {
        try {
            currentCodeWinner = null;
            if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) voiceWebWindowPrimary.loadURL(AI_CONFIGS[activeLoadout.voiceEngine || 0].url);
            if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) voiceWebWindowSecondary.loadURL(AI_CONFIGS[activeLoadout.voiceEngine2 || 0].url);
            if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) codeWebWindowPrimary.loadURL(AI_CONFIGS[activeLoadout.codeEngine || 1].url);
            if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) codeWebWindowSecondary.loadURL(AI_CONFIGS[activeLoadout.codeEngine2 || 1].url);
            if (companionWebWindow && !companionWebWindow.isDestroyed()) companionWebWindow.loadURL(AI_CONFIGS[activeLoadout.companionEngine || 0].url);
            if (global.applyAIBounds) global.applyAIBounds(true);
            return true;
        } catch(e) { return false; }
    });

    ipcMain.on('set-session-mode', (event, mode) => { 
        global.currentSessionMode = mode; 
        if (mode === 'proctored_live_interview') {
            if (voiceWebWindow && !voiceWebWindow.isDestroyed()) {
                const providerName = AI_CONFIGS[activeLoadout.voiceEngine].name;
                // 🟢 FIX: Do not auto-ignite Grok! User handles it manually.
                if (providerName !== 'Grok') {
                    ensureVoiceAndMic(voiceWebWindow, providerName);
                }
            }
        }
    });

    ipcMain.handle('toggle-ai-mic', async (event, isTurningOn) => {
        if (!voiceWebWindow || voiceWebWindow.isDestroyed()) return false;
        const providerName = AI_CONFIGS[activeLoadout.voiceEngine].name;

        // 🟢 FIX: Grok's mic is entirely manual now. Ignore all frontend toggle requests instantly.
        if (providerName === 'Grok') return true; 

        if (isTurningOn) {
            await ensureVoiceAndMic(voiceWebWindow, providerName);
            return true;
        } else {
            // State-aware click: Mute ONLY if it is currently listening
            await voiceWebWindow.webContents.executeJavaScript(`(() => {
                let micBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => {
                    let a = (b.getAttribute('aria-label')||'').toLowerCase();
                    let t = (b.getAttribute('title')||'').toLowerCase();
                    let c = (b.className||'').toLowerCase();
                    if (a.includes('stop') || a.includes('end ') || t.includes('stop')) return false;
                    return a.includes('microphone') || a.includes('voice') || a.includes('mute') || 
                           t.includes('microphone') || t.includes('mute') || c.includes('mic-');
                });
                
                if (micBtn) {
                    let a = (micBtn.getAttribute('aria-label') || '').toLowerCase();
                    let t = (micBtn.getAttribute('title') || '').toLowerCase();
                    let html = micBtn.innerHTML.toLowerCase();

                    if (!(a.includes('unmute') || t.includes('unmute') || a.includes('turn on') || 
                          t.includes('turn on') || html.includes('<line') || html.includes('slash') || html.includes('off'))) {
                        micBtn.click();
                    }
                }
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
            if (AI_CONFIGS[activeLoadout.voiceEngine || 0].name === 'Gemini') await injectModeNative(voiceWebWindowPrimary);
            if (voiceWebWindowSecondary && AI_CONFIGS[activeLoadout.voiceEngine2 || 0].name === 'Gemini') await injectModeNative(voiceWebWindowSecondary);

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
            if (codeWebWindowPrimary && !codeWebWindowPrimary.isDestroyed()) codeWebWindowPrimary.webContents.executeJavaScript(script).catch(()=>{});
            if (codeWebWindowSecondary && !codeWebWindowSecondary.isDestroyed()) codeWebWindowSecondary.webContents.executeJavaScript(script).catch(()=>{});
            if (voiceWebWindowPrimary && !voiceWebWindowPrimary.isDestroyed()) voiceWebWindowPrimary.webContents.executeJavaScript(script).catch(()=>{});
            if (voiceWebWindowSecondary && !voiceWebWindowSecondary.isDestroyed()) voiceWebWindowSecondary.webContents.executeJavaScript(script).catch(()=>{});
            return true;
        } catch(e) { return false; }
    });

    ipcMain.handle('send-manual-text', async (event, text) => {
        try { 
            if (!text) return; 
            let finalPrompt = text;
            if (AI_CONFIGS[activeLoadout.voiceEngine].name === 'Gemini') finalPrompt = getModePrefix() + text;
            await sendPayloadToWindow(voiceWebWindow, finalPrompt, [], AI_CONFIGS[activeLoadout.voiceEngine].name);
            return true; 
        } catch(e) { return false; }
    });

    ipcMain.handle('set-ai-brain-mode', async (event, mode, isManualClick = false) => { currentBrainMode = mode; return true; });
    ipcMain.handle('get-current-ai-mode', async () => { return currentBrainMode; });

    ipcMain.handle('switch-ai-profile', async (event, targetProfileId) => {
        try { launchDualBrains(); return targetProfileId; } catch(e) { return false; }
    });

    ipcMain.handle('toggle-ai-visibility', (event, forceShow) => {
        return global.applyAIBounds(forceShow);
    });

    ipcMain.handle('hide-all-overlays', () => {
        try {
            BrowserWindow.getAllWindows().forEach(w => {
                if (!w.isDestroyed() && w !== voiceWebWindowPrimary && w !== voiceWebWindowSecondary && w !== codeWebWindowPrimary && w !== codeWebWindowSecondary && w !== companionWebWindow && w !== global.zoomWindow) {
                    w.setOpacity(0); w.setIgnoreMouseEvents(true, { forward: true });
                }
            });

            [voiceWebWindowPrimary, voiceWebWindowSecondary, codeWebWindowPrimary, codeWebWindowSecondary, companionWebWindow].forEach(w => {
                if (w && !w.isDestroyed() && w.isVisible()) {
                    w.setOpacity(0); w.setIgnoreMouseEvents(true, { forward: true });
                }
            });
            return true;
        } catch(e) { return false; }
    });

    global.toggleStealthMode = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            global.isGhostHidden = !global.isGhostHidden;

            if (global.isGhostHidden) {
                mainWindow.webContents.send('app-made-hidden');
                
                // Track what was visible before hiding
                wasAiVisibleBeforeGhost = [voiceWebWindowPrimary, codeWebWindowPrimary, codeWebWindowSecondary, companionWebWindow].some(w => w && w.isVisible() && w.getOpacity() !== 0);

                mainWindow.setOpacity(0); mainWindow.setIgnoreMouseEvents(true, { forward: true });
                
                [voiceWebWindowPrimary, voiceWebWindowSecondary, codeWebWindowPrimary, codeWebWindowSecondary, companionWebWindow].forEach(w => {
                    if (w && !w.isDestroyed()) { w.setOpacity(0); w.setIgnoreMouseEvents(true, { forward: true }); }
                });
                
                if (global.radialHudWindow && !global.radialHudWindow.isDestroyed()) { global.radialHudWindow.webContents.send('update-hud', { slice: null, labels: global.activeRadialLabels, isActive: false, ghostMode: true }); }
            } else {
                mainWindow.webContents.send('app-made-visible');
                mainWindow.setOpacity(1); mainWindow.setIgnoreMouseEvents(global.isClickThroughState, { forward: true });
                
                if (wasAiVisibleBeforeGhost) {
                    [voiceWebWindowPrimary, voiceWebWindowSecondary, codeWebWindowPrimary, codeWebWindowSecondary, companionWebWindow].forEach(w => {
                        if (w && !w.isDestroyed()) { w.setOpacity(1); w.setIgnoreMouseEvents(false); }
                    });
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