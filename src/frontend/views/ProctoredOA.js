import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ProctoredOA extends LitElement {
    static styles = css`
        :host { display: block; height: 100%; width: 100%; background: transparent; pointer-events: none; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        
        .main-wrapper { 
            display: flex; flex-direction: column; width: 100%; height: 100%; 
            position: relative; justify-content: center; align-items: center;
        }
        
        /* 🟢 Typer Mode CSS */
        .typer-code-container { 
            width: 90%; max-width: 900px; max-height: 85%; overflow-y: auto; 
            padding: 20px; font-family: 'SF Mono', Consolas, monospace; 
            font-size: var(--response-font-size, 13px); line-height: 1.6; 
            color: #e5e5e5; background: rgba(20, 20, 20, 0.95); 
            border: 1px solid #444; border-radius: 8px; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            pointer-events: auto; /* 🟢 FIX: Allows native scrolling and clicking! */
        }
        .typer-code-container::-webkit-scrollbar { display: none; }
        .typer-line { display: flex; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; transition: 0.2s; }

        .wpm-circle {
            position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
            width: 45px; height: 45px; border-radius: 50%;
            background: rgba(15, 15, 15, 0.9); border: 2px solid #a142f4;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: bold; color: #fff;
            box-shadow: 0 4px 15px rgba(161, 66, 244, 0.4);
            z-index: 1000; pointer-events: none; transition: opacity 0.2s;
        }
        
        /* 🟢 Floating HUD Toast */
        .toast-container {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: rgba(10, 10, 10, 0.9); padding: 10px 20px; border-radius: 30px;
            font-size: 13px; font-weight: bold; border: 1px solid #333; 
            box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 1000;
            pointer-events: none; text-transform: uppercase; letter-spacing: 1px;
        }
        
        /* 🟢 NEW: Setup Modal CSS */
        .setup-modal { background: rgba(20, 20, 20, 0.95); border: 1px solid #4285f4; padding: 30px; border-radius: 8px; width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.9); text-align: center; pointer-events: auto; }
        .setup-input { width: 100%; padding: 10px; margin: 10px 0 20px 0; background: #0a0a0a; color: #fff; border: 1px solid #333; border-radius: 4px; font-size: 16px; text-align: center; }
        .setup-btn { background: #4285f4; color: #fff; border: none; padding: 12px 20px; border-radius: 4px; font-weight: bold; width: 100%; cursor: pointer !important; font-size: 14px; transition: 0.2s; }
        .setup-btn:hover { background: #3367d6; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
    `;

    static properties = {
        viewMode: { type: String }, // 'hidden' or 'typer'
        hoverZone: { type: String },
        hoverProgress: { type: Number },
        activePage: { type: Number },
        activeTyperPage: { type: Number },
        isTyperOverlayVisible: { type: Boolean },
        prefs: { type: Object },
        testDurationMins: { type: Number }, 
        totalQuestions: { type: Number }, 
        questionsCompleted: { type: Number }, 
        testStartTime: { type: Number },
        isTestActive: { type: Boolean },
        setupHours: { type: Number }, 
        setupMinutes: { type: Number }, 
        isSettingQuestions: { type: Boolean },
        isSettingHistory: { type: Boolean }, 
        historyPage: { type: Number }, 
        historyTitles: { type: Array }, 
        isMouseTrackerActive: { type: Boolean },
        historyAbortArmed: { type: Boolean }, // 🟢 NEW: Track if we are confirming abort // 🟢 NEW
        mouseCoords: { type: String },           // 🟢 NEW
        toastMessage: { type: String },
        timeRemainingMins: { type: Number }, // 🟢 NEW
        typingStartLineIndexForChunk: { type: Number }, // 🟢 NEW
        typerCodeLines: { type: Array },
        typerStartLine: { type: Number },
        typerEndLine: { type: Number },
        typingCurrentLineIndex: { type: Number },
        typingState: { type: String },
        isGhostHidden: { type: Boolean },
        isThinkModeActive: { type: Boolean },
        currentWpm: { type: Number }
    };

    constructor() {
        super();
        this.viewMode = 'hidden';
        this.hoverZone = null;
        this.hoverProgress = 0;
        this.activePage = 1;
        this.activeTyperPage = 1;
        this.isTyperOverlayVisible = false;
        this.prefs = {};
        this.toastMessage = '';
        this.resetArmed = false;
        
        this.testStartTime = 0; // 🟢 FIX: Explicitly initialize the timer variable on boot
        this.isTestActive = false; // 🟢 FIX: Explicitly initialize the test state
        
        this.typerCodeLines = [];
        this.typerStartLine = 0;
        this.typerEndLine = 0;
        this.typingCurrentLineIndex = 0;
        this.typingState = 'idle';
        this.typingCurrentCharIndex = 0;
        this.typingStartLineIndexForChunk = 0;
        this.fullCodeString = '';
        this.currentWpm = 190;
        this.isChangingSpeed = false;

        this.setupHours = 1; 
        this.setupMinutes = 30; 
        this.isSettingQuestions = false; 
        this.isSettingHistory = false;
        this.historyPage = 0;
        this.historyTitles = []; 
        this.isMouseTrackerActive = false;
        this.mouseCoords = 'Waiting for mouse...';

        this.isGhostHidden = false;
        this.isThinkModeActive = false;

        this.dwellStartTime = 0;
        this.dwellAnimationFrame = null;
        this.isActionFired = false;
    }

    async connectedCallback() {
        super.connectedCallback();
        
        if (window.require && !this.isTestActive) {
            const { ipcRenderer } = window.require('electron');
            
            // 1. 🟢 FIX: Send the correct IPC events to officially register the OA state in the backend!
            // This allows the backend to securely unhide the corners.
            ipcRenderer.send('set-session-mode', 'proctored_oa');
            ipcRenderer.send('set-oa-mode', true);
            
            // 2. Hide the AI window initially so it doesn't block your view
            ipcRenderer.invoke('toggle-ai-visibility', false); 
            ipcRenderer.send('set-ignore-mouse-events', false); 
            
            // 3. Wait 800ms for the backend HUD window to actually finish building its HTML before sending the text labels!
            setTimeout(() => {
                ipcRenderer.send('refresh-oa-hud', this.activePage || 1);
            }, 800);
        }

        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            this.prefs = raw?.data || raw || {};
            
            // 🟢 FIX: Initialize the WPM correctly on boot!
            if (this.prefs.wpmSpeed) this.currentWpm = this.prefs.wpmSpeed;
            this.requestUpdate();
        }

        // 🟢 FIX: Listen for live updates from the Settings page!
        this.syncPrefHandler = (e) => {
            if (e.detail && e.detail.key) {
                this.prefs = { ...this.prefs, [e.detail.key]: e.detail.value };
                if (e.detail.key === 'wpmSpeed') this.currentWpm = e.detail.value;
                this.requestUpdate();
            }
        };
        window.addEventListener('sync-preference', this.syncPrefHandler);

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            this.ghostStateHandler = (_, state) => { this.isGhostHidden = state; this.requestUpdate(); };
            this.syncModeHandler = (_, state) => { this.isThinkModeActive = state; this.requestUpdate(); };
            ipcRenderer.on('ghost-state-changed', this.ghostStateHandler);
            ipcRenderer.on('sync-ai-mode', this.syncModeHandler);

            this.hoverHandler = (_, zone) => {
                if (this.hoverZone === zone) return; 

                // 🟢 FIX: Clear the progress bar of the OLD zone before updating hoverZone!
                if (this.hoverZone && this.hoverZone !== 'none') {
                    ipcRenderer.send('sync-hud-progress', { zone: this.hoverZone, progress: 0 });
                }

                this.hoverZone = zone;
                this.hoverProgress = 0;
                this.isActionFired = false;

                // 🟢 NEW: Kill the Red Dot instantly if they slip out of the unhide corner
                if (this.unhideDotActive) {
                    ipcRenderer.send('set-unhide-dot', false);
                    this.unhideDotActive = false;
                }

                if (this.dwellAnimationFrame) {
                    cancelAnimationFrame(this.dwellAnimationFrame);
                    this.dwellAnimationFrame = null;
                }

                if (zone !== 'none') {
                    let map = {};
                    if (this.isSettingHistory) {
                        map = this.prefs.historyCorners || { top_left: 'abort_history_nav', bottom_left: 'prev_history_page', bottom_right: 'next_history_page' };
                    } else if (this.viewMode === 'typer') {
                        // 🟢 FIX: Pull from the new Typer Pages array
                        const tPages = this.prefs.typerPages || [];
                        if (tPages.length > 0) {
                            const idx = (this.activeTyperPage - 1) % tPages.length;
                            map = tPages[idx]?.map || {};
                        } else {
                            map = this.prefs.typerHotCorners || {};
                        }
                    } else {
                        const pages = this.prefs.oaPages || [];
                        if (pages.length > 0) {
                            const idx = (this.activePage - 1) % pages.length;
                            map = pages[idx]?.map || {};
                        } else {
                            map = this.activePage === 2 ? (this.prefs.hotCornersPage2 || {}) : (this.prefs.hotCorners || {});
                        }
                    }

                    const action = map[zone];
                    
                    // 🟢 FIX: If the NumPad or History Menu is active, bypass ALL action checks!
                    if (!this.isSettingQuestions && !this.isSettingHistory) {
                        // 🟢 FIX: Strictly restrict stealth mode to ONLY Hide/Unhide and Typer Auto-Type! 
                        const allowedInStealth = ['hide_unhide', 'typer_auto_type', 'oa_auto_type', 'auto_type'];
                        
                        // 🟢 FIX: Allow necessary live-adjustments while actively typing
                        const allowedWhileTyping = ['hide_unhide', 'typer_auto_type', 'oa_auto_type', 'auto_type', 'speed_inc', 'speed_dec', 'toggle_typer_vis', 'toggle_perfect_mode', 'abort_typer'];

                        // 🛑 STEALTH LOCK
                        if (this.isGhostHidden && !allowedInStealth.includes(action)) return;
                        
                        // 🛑 TYPING LOCK
                        if (this.typingState === 'typing' && !allowedWhileTyping.includes(action)) return;
                    }

                    this.dwellStartTime = performance.now();
                    
                    let targetDuration = (this.prefs.hotCornerBounds?.dwellTime || 3) * 1000;
                    if (action === 'hide_unhide') {
                        targetDuration = !this.isGhostHidden ? 0 : ((this.prefs.hotCornerBounds?.hideTime || 0) * 1000);
                    } else if (['trim_top', 'trim_bottom', 'expand_top', 'expand_bottom', 'speed_inc', 'speed_dec'].includes(action)) {
                        targetDuration = (this.prefs.typerSelectionSpeed !== undefined ? this.prefs.typerSelectionSpeed : 0.5) * 1000;
                    } else if (action === 'typer_auto_type' || action === 'oa_auto_type' || action === 'auto_type') { // 🟢 FIX: Check for ALL variations
                        if (this.typingState === 'typing' || this.typingCurrentLineIndex > 0) {
                            targetDuration = 0;
                        }
                    }

                    if (targetDuration === 0) {
                        this.hoverProgress = 100;
                        this.isActionFired = true;
                        // Light it up instantly
                        ipcRenderer.send('sync-hud-progress', { zone, progress: 100 });
                        if (action && action !== 'none') this.executeActionByName(action);
                        this.requestUpdate();
                        return;
                    }

                    const animateDwell = (now) => {
                        if (this.hoverZone !== zone || this.isActionFired) return;
                        const elapsed = now - this.dwellStartTime;
                        
                        this.hoverProgress = Math.min(100, (elapsed / targetDuration) * 100);
                        
                        // 🟢 NEW: Trigger the Red Constant Dot specifically for Stealth Unhiding
                        if (action === 'hide_unhide' && this.isGhostHidden && !this.unhideDotActive && this.hoverProgress > 0) {
                            ipcRenderer.send('set-unhide-dot', true);
                            this.unhideDotActive = true;
                        }
                        
                        // 🟢 Send the live progress to the backend HUD!
                        ipcRenderer.send('sync-hud-progress', { zone, progress: this.hoverProgress });
                        this.requestUpdate();

                        if (this.hoverProgress >= 100) {
                            // 🟢 NEW: Kill the Red Dot when the timer hits 100% and unhides
                            if (this.unhideDotActive) {
                                ipcRenderer.send('set-unhide-dot', false);
                                this.unhideDotActive = false;
                            }
                            this.isActionFired = true;
                            
                            // 🟢 HISTORY NAV LOGIC
                            if (this.isSettingHistory) {
                                const map = this.prefs.historyCorners || {
                                    top_left: 'abort_history_nav',
                                    bottom_left: 'prev_history_page',
                                    bottom_right: 'next_history_page'
                                };
                                const hAction = map[zone];

                                if (hAction === 'next_history_page') { 
                                    this.historyPage++;
                                    ipcRenderer.send('toggle-hud-history', { enable: true, page: this.historyPage, titles: this.historyTitles });
                                    this.showToast(`📄 Page ${this.historyPage + 1}`, '#4285f4');
                                } else if (hAction === 'prev_history_page') { 
                                    this.historyPage = Math.max(0, this.historyPage - 1);
                                    ipcRenderer.send('toggle-hud-history', { enable: true, page: this.historyPage, titles: this.historyTitles });
                                    this.showToast(`📄 Page ${this.historyPage + 1}`, '#4285f4');
                                } else if (hAction === 'hide_unhide') {
                                    this.executeActionByName('hide_unhide');
                                } else if (hAction === 'abort_history_nav') {
                                    if (!this.historyAbortArmed) {
                                        this.historyAbortArmed = true;
                                        this.showToast('⚠️ CONFIRM ABORT HISTORY', '#f14c4c');
                                        setTimeout(() => { this.historyAbortArmed = false; }, 4000);
                                    } else {
                                        this.historyAbortArmed = false;
                                        this.isSettingHistory = false;
                                        
                                        // 1. Tell the backend to kill the history UI
                                        ipcRenderer.send('toggle-hud-history', { enable: false });
                                        this.showToast('🚪 Exited History Mode', '#f14c4c');
                                        
                                        // 2. 🟢 FIX: Wait 200ms for the history DOM to fully clear out before drawing the OA triggers!
                                        setTimeout(() => {
                                            ipcRenderer.send('refresh-oa-hud', this.activePage || 1); 
                                        }, 200);
                                    }
                                } else {
                                    // 🟢 FIX: Dynamically calculate chat slots based on remaining available corners
                                    const cornerOrder = ['top_left', 'top_mid_left', 'top_center', 'top_mid_right', 'top_right', 'left_mid_top', 'right_mid_top', 'middle_left', 'middle_right', 'left_mid_bottom', 'right_mid_bottom', 'bottom_left', 'bottom_mid_left', 'bottom_center', 'bottom_mid_right', 'bottom_right'];
                                    const availableCorners = cornerOrder.filter(c => !map[c] || map[c] === 'none');
                                    const cIndex = availableCorners.indexOf(zone);
                                    
                                    if (cIndex >= 0) { 
                                        const targetIndex = (this.historyPage * availableCorners.length) + cIndex;
                                        
                                        // 🟢 FIX: Do NOT exit History Mode! Stay inside it so user can click other chats.
                                        this.showToast(`🔄 Loading Chat ${targetIndex + 1}...`, '#4285f4');
                                        ipcRenderer.invoke('switch-ai-history', targetIndex);
                                    }
                                }
                                return; // 🟢 Stop processing any standard OA actions!
                            }

                            // 🟢 NUMPAD LOGIC
                            if (this.isSettingQuestions) {
                                const zoneMap = { 'top_left': 1, 'top_mid_left': 2, 'top_center': 3, 'top_mid_right': 4, 'top_right': 5, 'left_mid_top': 6, 'right_mid_top': 7, 'middle_left': 8, 'middle_right': 9, 'left_mid_bottom': 10, 'right_mid_bottom': 11, 'bottom_left': 12, 'bottom_mid_left': 13, 'bottom_center': 14, 'bottom_mid_right': 15, 'bottom_right': 16 };
                                if (zoneMap[zone]) {
                                    this.totalQuestions = zoneMap[zone];
                                    this.isSettingQuestions = false;
                                    ipcRenderer.send('toggle-hud-numpad', false);
                                    this.showToast(`🔢 Questions Updated: ${this.totalQuestions}`, '#4285f4');
                                    this.requestUpdate();
                                }
                                return;
                            }

                            if (action && action !== 'none') {
                                this.executeActionByName(action);
                                
                                const continuousActions = ['scroll_up', 'scroll_down', 'trim_top', 'trim_bottom', 'expand_top', 'expand_bottom', 'speed_inc', 'speed_dec'];
                                if (continuousActions.includes(action)) {
                                    this.isActionFired = false;
                                    // 🟢 FIX: Set back to exactly performance.now() to make it wait the full slider time every loop
                                    this.dwellStartTime = performance.now(); 
                                    this.dwellAnimationFrame = requestAnimationFrame(animateDwell);
                                }
                            }
                        } else {
                            this.dwellAnimationFrame = requestAnimationFrame(animateDwell);
                        }
                    };
                    this.dwellAnimationFrame = requestAnimationFrame(animateDwell);
                } else {
                    this.requestUpdate();
                }
            };

            this.directActionHandler = (_, action) => {
                if (this.isGhostHidden && action !== 'hide_unhide') return;
                this.executeActionByName(action);
            };

            this.typingStatusHandler = (_, status) => {
                // 🟢 FIX: Actually set the state to 'typing' so the UI knows it's active!
                if (status) {
                    this.typingState = 'typing';
                    this.requestUpdate();
                    return;
                }

                if (!status) {
                    if (this.isChangingSpeed) return; 
                    if (this.typingState === 'typing') { 
                        
                        // 🟢 NEW: Fire the 3-Blink Green Dot!
                        ipcRenderer.send('trigger-completion-dot');

                        this.typingState = 'idle';
                        this.questionsCompleted++; // 🟢 Increment questions done!
                        this.isTyperOverlayVisible = false; // 🟢 Reset Spectator Mode
                        this.viewMode = 'hidden';
                        ipcRenderer.send('set-ignore-mouse-events', true);
                        this.showToast('✅ Typing Complete');
                        this.typerStartLine = 0;
                        this.typingCurrentCharIndex = 0;
                        this.typingCurrentLineIndex = 0; // 🟢 Reset line tracker
                        this.typingPauseIndex = 0;
                        
                        if (!this.isGhostHidden) {
                            ipcRenderer.invoke('toggle-ai-visibility', true);
                        }
                        ipcRenderer.send('refresh-oa-hud', this.activePage);
                    }
                    this.requestUpdate();
                }
            };

            this.syncExamTimeHandler = (_, remainingMs) => {
                this.timeRemainingMins = remainingMs / 60000;
            };
            ipcRenderer.on('sync-exam-time', this.syncExamTimeHandler);

            // 🟢 NEW: Live Tracker Listener
            ipcRenderer.on('mouse-tracker-data', (_, data) => {
                this.mouseCoords = data;
                this.requestUpdate();
            });

            this.typingProgressCharHandler = (_, data) => {
                if (data.runId !== this.currentRunId) return; 
                
                // 🟢 LINE CHUNKING: Calculate the exact line based ONLY on what was typed in the current resumed chunk!
                const lines = this.fullCodeString.split('\n');
                const remainingCode = lines.slice(this.typingStartLineIndexForChunk).join('\n');
                const typedString = remainingCode.substring(0, data.idx);
                const linesTypedInChunk = (typedString.match(/\n/g) || []).length;
                
                this.typingCurrentLineIndex = this.typingStartLineIndexForChunk + linesTypedInChunk;
                this.requestUpdate();
            };

            this.screenshotHandler = () => { this.showToast('📸 Captured', '#4285f4'); };
            this.codeMsgHandler = () => { this.showToast('🤖 AI Responded', '#a142f4'); };

            ipcRenderer.on('hot-corner-hover', this.hoverHandler);
            ipcRenderer.on('execute-direct-action', this.directActionHandler);
            ipcRenderer.on('code-new-message', this.codeMsgHandler);
            ipcRenderer.on('typing-status', this.typingStatusHandler);
            
            // 🟢 FIX: Actually register the Character tracker! (It was incorrectly registered as typing-progress)
            ipcRenderer.on('typing-progress-char', this.typingProgressCharHandler); 
            ipcRenderer.on('screenshot-captured', this.screenshotHandler);
        }

        this.addEventListener('trigger-typer', (e) => {
            let rawCode = e.detail;
            this.currentWpm = this.prefs.wpmSpeed || 190; // 🟢 FIX: Respect the new 190 WPM default!
            
            // 🟢 FIX: Destroy ALL carriage returns. This guarantees JS and PowerShell calculate the exact same string length!
            rawCode = rawCode.replace(/\r/g, '');
            rawCode = rawCode.replace(/^(c\+\+|cpp|python|java|javascript|js|c|go)\s*\n/i, '');
            
            this.typerCodeLines = rawCode.split('\n');
            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') this.typerCodeLines.pop();
            this.typerStartLine = 0;
            this.typerEndLine = this.typerCodeLines.length - 1;
            this.typingCurrentLineIndex = 0;
            this.viewMode = 'typer';
            this.activeTyperPage = 1; // 🟢 Reset to page 1
            this.isTyperOverlayVisible = false; // 🟢 FIX: Hide the code overlay by default!
            
            // 🟢 FIX: Instantly hide the AI Window and switch to Typer HUD Corners!
            if (window.require) {
                window.require('electron').ipcRenderer.invoke('toggle-ai-visibility', false);
                window.require('electron').ipcRenderer.send('refresh-oa-hud', 'typer_1');
            }
            
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('sync-preference', this.syncPrefHandler); // 🟢 FIX: Remove listener
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('hot-corner-hover', this.hoverHandler);
            ipcRenderer.removeListener('execute-direct-action', this.directActionHandler);
            ipcRenderer.removeListener('code-new-message', this.codeMsgHandler);
            ipcRenderer.removeListener('typing-status', this.typingStatusHandler);
            ipcRenderer.removeListener('typing-progress-char', this.typingProgressCharHandler);
            ipcRenderer.removeListener('screenshot-captured', this.screenshotHandler);
            ipcRenderer.removeListener('ghost-state-changed', this.ghostStateHandler);
            ipcRenderer.removeListener('sync-ai-mode', this.syncModeHandler);
        }
    }

    async savePref(key, value) {
        this.prefs = { ...this.prefs, [key]: value };
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            await window.cheatingDaddy.storage.updatePreference(key, value);
            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key, value } }));
        }
    }

    async executeActionByName(action) {
        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');
        
        // 🟢 FIX: Handle the 2-step Reset Confirmation logic
        if (action === 'reset' && !this.resetArmed) {
            this.resetArmed = true;
            this.resetZone = this.hoverZone; // Track which corner triggered it
            ipcRenderer.send('set-reset-armed', { zone: this.resetZone, armed: true });
            this.showToast('⚠️ CONFIRM RESET', '#f14c4c');
            this.requestUpdate();
            
            setTimeout(() => { 
                if (this.resetArmed) {
                    this.resetArmed = false; 
                    ipcRenderer.send('set-reset-armed', { zone: this.resetZone, armed: false });
                    this.requestUpdate(); 
                }
            }, 8000); // 🟢 FIX: Extended from 3s to 8s so you have time to dwell a second time!
            return;
        }
        // 🟢 FIX: Handle the 2-step Abort Confirmation logic
        if (action === 'abort_oa' && !this.abortArmed) {
            this.abortArmed = true;
            this.abortZone = this.hoverZone; 
            ipcRenderer.send('set-abort-armed', { zone: this.abortZone, armed: true });
            this.showToast('⚠️ CONFIRM ABORT', '#f14c4c');
            this.requestUpdate();
            
            setTimeout(() => { 
                if (this.abortArmed) {
                    this.abortArmed = false; 
                    ipcRenderer.send('set-abort-armed', { zone: this.abortZone, armed: false });
                    this.requestUpdate(); 
                }
            }, 8000); 
            return;
        }
        
        // 🟢 FIX: Universal Clock Starter. Guarantees the timer begins no matter how you trigger the AI!
        const _startClockIfNeeded = () => {
            // 🟢 BUG FIX: Use !this.testStartTime because on first boot it is undefined, not 0!
            if (this.isTestActive && !this.testStartTime) {
                this.testStartTime = Date.now();
                this.showToast('⏱️ Exam Clock Started!', '#a142f4');
                ipcRenderer.send('start-exam-timer', this.testDurationMins);
            }
        };

        switch (action) {
            case 'capture':
                _startClockIfNeeded();
                await ipcRenderer.invoke('capture-screenshot');
                break;

            case 'send_ai':
                _startClockIfNeeded();
                this.showToast('🚀 Processing...');
                await ipcRenderer.invoke('send-oa-automation');
                break;
            case 'fix_error':
                _startClockIfNeeded();
                this.showToast('🌟 Fixing Error...');
                await ipcRenderer.invoke('send-oa-fix-error');
                break;
            case 'refactor':
                _startClockIfNeeded();
                this.showToast('🛠️ Refactoring...');
                await ipcRenderer.invoke('send-oa-refactor');
                break;
            case 'regenerate':
                _startClockIfNeeded();
                this.showToast('🔄 Regenerating...');
                await ipcRenderer.invoke('send-oa-regenerate');
                break;
            case 'refresh_page':
                this.showToast('🔄 Refreshing Page...');
                await ipcRenderer.invoke('refresh-ai-page');
                break;
            case 'hide_unhide':
                await ipcRenderer.invoke('trigger-ghost-hide');
                break;
            case 'abort_oa':
                this.abortArmed = false;
                ipcRenderer.send('set-abort-armed', { zone: this.abortZone, armed: false });
                this.isTestActive = false; this.testStartTime = 0; this.questionsCompleted = 0; 
                this.timeRemainingMins = undefined;
                ipcRenderer.send('stop-exam-timer'); // 🟢 Hide HUD Timer
                if (window.require) {
                    ipcRenderer.invoke('toggle-ai-visibility', false); 
                    ipcRenderer.send('set-ignore-mouse-events', false); // 🟢 Re-enable clicks for the modal
                }
                this.showToast('🚪 Exiting OA Mode...');
                await ipcRenderer.invoke('clear-screenshots'); 
                if (window.require) window.require('electron').ipcRenderer.invoke('new-chat');
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;
            case 'set_question_count':
                this.isSettingQuestions = true;
                ipcRenderer.send('toggle-hud-numpad', true);
                this.showToast('🔢 Select Question Count (1-16)', '#4285f4');
                break;
            case 'open_history_nav':
                this.isSettingHistory = true;
                this.historyPage = 0; // Reset to page 1
                this.showToast('🔍 Fetching Chats...', '#4285f4');
                ipcRenderer.invoke('fetch-ai-history-titles').then(titles => {
                    this.historyTitles = titles || [];
                    ipcRenderer.send('toggle-hud-history', { enable: true, page: 0, titles: this.historyTitles });
                    this.showToast('📜 Select Chat to Load', '#4285f4');
                });
                break;
            case 'toggle_mouse_tracker':
                this.isMouseTrackerActive = !this.isMouseTrackerActive;
                ipcRenderer.send('toggle-mouse-tracker', this.isMouseTrackerActive);
                this.showToast(this.isMouseTrackerActive ? '🎯 Tracker ON' : '🎯 Tracker OFF', '#f14c4c');
                break;
            case 'toggle_page2': {
                const pages = this.prefs.oaPages || [];
                const totalPages = Math.max(1, pages.length > 0 ? pages.length : (this.prefs.hotCornersPage2 ? 2 : 1));
                this.activePage = (this.activePage % totalPages) + 1;
                ipcRenderer.send('refresh-oa-hud', this.activePage);
                this.showToast(`📄 Page ${this.activePage}`);
                break;
            }
            case 'toggle_typer_page2': {
                const tPages = this.prefs.typerPages || [];
                const totalPages = Math.max(1, tPages.length > 0 ? tPages.length : 1);
                this.activeTyperPage = (this.activeTyperPage % totalPages) + 1;
                ipcRenderer.send('refresh-oa-hud', `typer_${this.activeTyperPage}`);
                this.showToast(`📄 Typer Page ${this.activeTyperPage}`);
                break;
            }
            case 'toggle_perfect_mode': {
                const isPerfect = await ipcRenderer.invoke('toggle-perfect-mode');
                this.showToast(isPerfect ? '🤖 Perfect Mode: ON' : '👨‍💻 Human Mode: ON', isPerfect ? '#a142f4' : '#00cc66');
                setTimeout(() => ipcRenderer.send('refresh-oa-hud', this.viewMode === 'typer' ? `typer_${this.activeTyperPage}` : this.activePage), 200);
                this._hotSwapResumeSpeed();
                break;
            }
            case 'auto_type':
            case 'oa_auto_type':
            case 'typer_auto_type':
                if (this.typingState === 'idle') {
                    if (this.viewMode === 'typer') {
                        this.fullCodeString = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
                        
                        // 🟢 FIX: Prevent the engine from crashing instantly if the selection is completely empty
                        if (!this.fullCodeString || this.fullCodeString.trim() === '') {
                            this.showToast('⚠️ No Code Selected!', '#f14c4c');
                            return;
                        }
                        
                        let speed = this.currentWpm;
                        let isPanicPacing = false;
                        
                        if (this.timeRemainingMins !== undefined && this.testDurationMins > 0) {
                            if (this.timeRemainingMins < 30) {
                                // 🟢 HYPER PANIC MODE (< 30 MINS LEFT)
                                isPanicPacing = true;
                                speed = 400; 
                                this.showToast('⚠️ < 30 MINS: HYPER PANIC', '#f14c4c');
                            } else if (this.timeRemainingMins < 60) {
                                // 🟢 EXTREME PANIC MODE (< 1 HR LEFT)
                                isPanicPacing = true;
                                speed = 300; 
                                this.showToast('⚠️ < 1 HR LEFT: PANIC PACING', '#f14c4c');
                            } else {
                                const questionsLeft = Math.max(1, this.totalQuestions - this.questionsCompleted);
                                const timeForThisQuestionMins = (this.timeRemainingMins / questionsLeft) * 0.8;
                                const wordsToType = this.fullCodeString.length / 5;
                                const calculatedWpm = Math.ceil(wordsToType / timeForThisQuestionMins);
                                speed = Math.max(190, Math.min(calculatedWpm, 300)); // Default 190, scales up
                                this.showToast(`⚡ Auto Pacing: ${speed} WPM`, '#a142f4');
                            }
                            this.currentWpm = speed;
                            if (speed > 250 && !isPanicPacing) ipcRenderer.invoke('toggle-perfect-mode', true);
                            else ipcRenderer.invoke('toggle-perfect-mode', false); // 🟢 Force Default Human Mode
                        }

                        const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                        const startDelay = this.prefs.typerDelay !== undefined ? this.prefs.typerDelay : 5; 
                        
                        this.currentRunId = Date.now();
                        this.isActionFired = true;
                        
                        // 🟢 EXTRACT EXACT CHUNK & FLAG RESUME
                        const lines = this.fullCodeString.split('\n');
                        const isResume = this.typingCurrentLineIndex > 0;
                        const remainingCode = lines.slice(this.typingCurrentLineIndex).join('\n');
                        this.typingStartLineIndexForChunk = this.typingCurrentLineIndex;
                        
                        this.typingState = 'typing'; // 🟢 FIX: Optimistically lock state to prevent duplicate triggers
                        ipcRenderer.send('start-auto-type', remainingCode, speed, mistake, startDelay, this.currentRunId, isPanicPacing, isResume);
                    } else {
                        this.showToast('🔍 Fetching Code...', '#4285f4');
                        const code = await ipcRenderer.invoke('fetch-latest-code');
                        if (code) {
                            this.dispatchEvent(new CustomEvent('trigger-typer', { detail: code }));
                            this.showToast('✅ Code Loaded', '#00cc66');
                        } else {
                            this.showToast('⚠️ No Code Found in AI', '#f14c4c');
                        }
                    }
                } else if (this.typingState === 'typing') {
                    this.typingState = 'idle'; // 🟢 FIX: Optimistically unlock state so Resume works instantly
                    ipcRenderer.send('stop-auto-type');
                    this.showToast('⏸️ Typer Paused');
                }
                break;

            case 'abort_typer':
                if (this.viewMode === 'typer') {
                    if (this.typingState !== 'idle') ipcRenderer.send('stop-auto-type');
                    this.typingState = 'idle';
                    this.viewMode = 'hidden';
                    ipcRenderer.send('set-ignore-mouse-events', true);
                    this.showToast('🛑 Typer Aborted');
                    
                    if (!this.isGhostHidden) {
                        ipcRenderer.invoke('toggle-ai-visibility', true);
                    }
                    ipcRenderer.send('refresh-oa-hud', this.activePage);
                }
                break;
            case 'toggle_typer_vis':
                if (this.viewMode === 'typer') {
                    this.isTyperOverlayVisible = !this.isTyperOverlayVisible;
                    if (this.typingState === 'typing') {
                        this.showToast(this.isTyperOverlayVisible ? '👁️ Spectator Mode ON' : '👁️ Spectator Mode OFF', '#00cc66');
                    } else {
                        this.showToast(this.isTyperOverlayVisible ? '👁️ Code Visible' : '👁️ Code Hidden', '#00cc66');
                    }
                    this.requestUpdate();
                }
                break;
            case 'change_profile': {
                let profiles = this.prefs.aiProfiles || [];
                if (profiles.length === 0) {
                    this.showToast('⚠️ No profiles found', '#f14c4c');
                    break;
                }
                
                let profileLoadouts = this.prefs.dualBrainLoadouts || [];
                let currentL = profileLoadouts[0] || {};
                
                // 🟢 Find current profile index, calculate next, and extract
                let currentProfileIdx = profiles.findIndex(p => p.id === currentL.codeProfileId);
                let nextProfileIdx = (currentProfileIdx + 1) % profiles.length;
                let nextProfile = profiles[nextProfileIdx];
                
                // 🟢 Update active loadout and push to DB
                currentL.codeProfileId = nextProfile.id;
                this.savePref('dualBrainLoadouts', profileLoadouts);
                
                // 🟢 Force a hot-reload of the AI Window with the new partition
                ipcRenderer.invoke('switch-ai-profile', currentL.codeProfileId);
                ipcRenderer.send('refresh-oa-hud', this.activePage);
                this.showToast(`👤 Profile: ${nextProfile.name}`, '#4285f4');
                break;
            }
            case 'fast_think':
                ipcRenderer.invoke('toggle-ai-mode');
                setTimeout(() => ipcRenderer.send('refresh-oa-hud', this.activePage), 200);
                this.showToast(this.isThinkModeActive ? '⚡ Fast Mode' : '🧠 Think Mode');
                break;
            case 'scroll_up':
                if (this.viewMode === 'typer') {
                    const container = this.shadowRoot.querySelector('.typer-code-container');
                    if (container) container.scrollBy({ top: -100, behavior: 'smooth' });
                }
                break;
            case 'scroll_down':
                if (this.viewMode === 'typer') {
                    const container = this.shadowRoot.querySelector('.typer-code-container');
                    if (container) container.scrollBy({ top: 100, behavior: 'smooth' });
                }
                break;
            case 'expand_top':
                if (this.viewMode === 'typer' && this.typerStartLine > 0) { 
                    this.typerStartLine--; 
                    this.requestUpdate(); 
                    this._scrollPrecise(this.typerStartLine); // 🟢 Target TOP
                }
                break;
            case 'trim_top':
                if (this.viewMode === 'typer' && this.typerStartLine < this.typerEndLine) { 
                    this.typerStartLine++; 
                    this.requestUpdate(); 
                    this._scrollPrecise(this.typerStartLine); // 🟢 Target TOP
                }
                break;
            case 'expand_bottom':
                if (this.viewMode === 'typer' && this.typerEndLine < this.typerCodeLines.length - 1) { 
                    this.typerEndLine++; 
                    this.requestUpdate(); 
                    this._scrollPrecise(this.typerEndLine); // 🟢 Target BOTTOM
                }
                break;
            case 'trim_bottom':
                if (this.viewMode === 'typer' && this.typerEndLine > this.typerStartLine) { 
                    this.typerEndLine--; 
                    this.requestUpdate(); 
                    this._scrollPrecise(this.typerEndLine); // 🟢 Target BOTTOM
                }
                break;
            case 'reset_typer':
                // 🟢 FIX: Stop the typer if it's actively running when reset is triggered
                if (this.typingState !== 'idle') ipcRenderer.send('stop-auto-type');
                
                // 🟢 FIX: Completely wipe all internal typing memory so it starts fresh!
                this.typingState = 'idle';
                this.typingCurrentLineIndex = 0;
                this.typingCurrentCharIndex = 0;
                this.typingPauseIndex = 0;
                this.typingStartLineIndexForChunk = 0;
                
                this.typerStartLine = 0;
                this.typerEndLine = this.typerCodeLines.length - 1;
                this.showToast('✨ Selection Reset');
                break;
            case 'reset':
                await ipcRenderer.invoke('clear-screenshots');
                await ipcRenderer.invoke('new-chat'); // 🟢 FIX: Trigger new chat to reset AI window
                this.showToast('✨ Session Cleared');
                this.resetArmed = false;
                ipcRenderer.send('set-reset-armed', { zone: this.resetZone, armed: false });
                break;
            case 'toggle_ai_vis':
                await ipcRenderer.invoke('toggle-ai-visibility');
                break;
            default:
                if (action && action.startsWith('speed_set_')) {
                    this.currentWpm = parseInt(action.replace('speed_set_', ''));
                    this.showToast(`⚡ Speed Locked: ${this.currentWpm} WPM`, '#a142f4');
                    this._hotSwapResumeSpeed();
                }
                break;
            case 'speed_inc':
                this.currentWpm += 5;
                this.showToast(`⏩ Speed: ${this.currentWpm} WPM`, '#4285f4');
                this._hotSwapResumeSpeed();
                break;
            case 'speed_dec':
                this.currentWpm = Math.max(10, this.currentWpm - 5);
                this.showToast(`⏪ Speed: ${this.currentWpm} WPM`, '#f59e0b');
                this._hotSwapResumeSpeed();
                break;
        }
        this.requestUpdate();
    }

    _hotSwapResumeSpeed() {
        if (this.typingState !== 'typing' || !window.require) return;
        const { ipcRenderer } = window.require('electron');
        
        this.isChangingSpeed = true;
        ipcRenderer.send('stop-auto-type');
        
        const isPanicPacing = (this.timeRemainingMins !== undefined && this.timeRemainingMins < 60);
        
        const lines = this.fullCodeString.split('\n');
        const remainingCode = lines.slice(this.typingCurrentLineIndex).join('\n');
        this.typingStartLineIndexForChunk = this.typingCurrentLineIndex;
        
        const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
        this.currentRunId = Date.now();
        
        ipcRenderer.send('start-auto-type', remainingCode, this.currentWpm, mistake, 0, this.currentRunId, isPanicPacing, true);
        setTimeout(() => { this.isChangingSpeed = false; }, 500);
    }

    showToast(msg, color = '#00cc66') {
        if (this.isGhostHidden) return; // 🟢 Absolute UI silence while hidden!
        this.toastMessage = msg;
        this.toastColor = color;
        this.requestUpdate();
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.toastMessage = '';
            this.requestUpdate();
        }, 2000);
    }

    handleLineClick(index) {
        if (this.typingState !== 'idle') return;
        const distToStart = Math.abs(index - this.typerStartLine);
        const distToEnd = Math.abs(index - this.typerEndLine);
        if (distToStart <= distToEnd) this.typerStartLine = index;
        else this.typerEndLine = index;
        if (this.typerStartLine > this.typerEndLine) {
            const temp = this.typerStartLine;
            this.typerStartLine = this.typerEndLine;
            this.typerEndLine = temp;
        }
        this.requestUpdate();
    }

    renderTyper() {
        return html`
            <div class="typer-code-container"
                 @mouseenter=${() => window.require && window.require('electron').ipcRenderer.send('set-ignore-mouse-events', false)}
                 @mouseleave=${() => window.require && window.require('electron').ipcRenderer.send('set-ignore-mouse-events', true)}
                 @mousedown=${(e) => { e.preventDefault(); e.stopPropagation(); }}> <div style="background: rgba(161, 66, 244, 0.15); border: 1px solid rgba(161, 66, 244, 0.5); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                    <strong style="color: #a142f4;">Select Range to Type.</strong> Area in purple will be typed.
                </div>
                ${this.typerCodeLines.map((line, idx) => {
                    const isHighlighted = idx >= this.typerStartLine && idx <= this.typerEndLine;
                    const isCurrent = (this.typingState === 'typing') && isHighlighted && (idx === this.typerStartLine + this.typingCurrentLineIndex);
                    let bg = 'transparent', b = 'transparent', tc = 'var(--text-color)', nc = '#666';
                            if (isCurrent) { bg = 'rgba(0, 204, 102, 0.25)'; b = '#00cc66'; tc = '#fff'; nc = '#00cc66'; }
                            else if (isHighlighted) { bg = 'rgba(161, 66, 244, 0.2)'; b = 'rgba(161, 66, 244, 0.3)'; tc = 'var(--text-color)'; nc = '#a142f4'; }
                            return html`
                                <div class="typer-line ${isCurrent ? 'active-typer-line' : ''}" style="background: ${bg}; border: 1px solid ${b}; color: ${tc}; pointer-events: none;">
                                    <div style="width: 40px; text-align: right; padding-right: 12px; font-weight: bold; color: ${nc};">${idx + 1}</div>
                                    <div style="white-space: pre-wrap; word-wrap: break-word; flex: 1;">${line || ' '}</div>
                                </div>
                            `;
                })}
            </div>
        `;
    }

    // 🟢 LitElement auto-scroll engine. Fires during active typing!
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('typingCurrentLineIndex') || changedProperties.has('isTyperOverlayVisible')) {
            const container = this.shadowRoot?.querySelector('.typer-code-container');
            const activeLine = this.shadowRoot?.querySelector('.active-typer-line');
            if (activeLine && container) {
                activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // 🟢 FIX: Flawless native DOM tracking. Locks the exact line being edited to the center of the overlay!
    _scrollPrecise(lineIndex) {
        setTimeout(() => {
            const container = this.shadowRoot?.querySelector('.typer-code-container');
            if (container) {
                // Find the exact HTML element for the line being expanded/trimmed (nth-child is 1-indexed)
                const targetNode = container.querySelector(`div:nth-child(${lineIndex + 1})`);
                if (targetNode) {
                    // Force the browser to smoothly lock this exact element to the dead center of the container
                    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 10);
    }

    render() {
        if (!this.isTestActive) {
            return html`
                <div class="main-wrapper">
                    <div class="setup-modal">
                        <h2 style="color: #4285f4; margin-top: 0;">🎯 OA Session Setup</h2>
                        <p style="color: #aaa; font-size: 13px; margin-bottom: 25px;">Enter the test parameters to enable Dynamic Speed Pacing.</p>
                        
                        <div style="text-align: left; color: #fff; font-size: 12px; font-weight: bold; margin-bottom: 5px;">Test Duration</div>
                        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                            <div style="flex: 1; text-align: left;">
                                <div style="font-size: 10px; color: #888;">Hours</div>
                                <input type="number" min="0" class="setup-input" style="margin: 5px 0 0 0;" .value=${this.setupHours} @input=${e => this.setupHours = parseInt(e.target.value) || 0}>
                            </div>
                            <div style="flex: 1; text-align: left;">
                                <div style="font-size: 10px; color: #888;">Minutes</div>
                                <input type="number" min="0" max="59" class="setup-input" style="margin: 5px 0 0 0;" .value=${this.setupMinutes} @input=${e => this.setupMinutes = parseInt(e.target.value) || 0}>
                            </div>
                        </div>
                        
                        <div style="text-align: left; color: #fff; font-size: 12px; font-weight: bold; margin-bottom: 5px;">Total Coding Questions <span style="color: #888; font-weight: normal;">(Optional)</span></div>
                        <input type="number" min="0" max="16" placeholder="Auto" class="setup-input" style="margin-top: 5px;" .value=${this.totalQuestions || ''} @input=${e => this.totalQuestions = parseInt(e.target.value) || 0}>
                        
                        <button class="setup-btn" @click=${() => {
                            this.testDurationMins = (this.setupHours * 60) + this.setupMinutes;
                            if(this.testDurationMins > 0) {
                                this.isTestActive = true;
                                if (window.require) {
                                    const { ipcRenderer } = window.require('electron');
                                    ipcRenderer.send('set-ignore-mouse-events', true); // 🟢 Lock clicks again for stealth
                                    
                                    // 🟢 FIX: Ping the Backend Timer initializer so the text displays securely!
                                    ipcRenderer.send('init-hud-timer', this.testDurationMins);
                                    
                                    // 🟢 We do NOT unhide the AI window here. It stays hidden until 'Toggle AI' trigger is hit!
                                }
                                this.requestUpdate();
                            } else {
                                this.showToast('⚠️ Enter valid duration!', '#f14c4c');
                            }
                        }}>🚀 Initialize Smart Pacing</button>
                    </div>
                    ${this.toastMessage ? html`<div class="toast-container" style="color: ${this.toastColor}; border-color: ${this.toastColor}; animation: fadeIn 0.2s;">${this.toastMessage}</div>` : ''}
                </div>
            `;
        }

        return html`
            <div class="main-wrapper">
                
                ${this.isMouseTrackerActive ? html`
                    <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: #f14c4c; color: #fff; padding: 12px 24px; font-weight: 800; border-radius: 8px; font-family: 'SF Mono', monospace; font-size: 18px; z-index: 99999; pointer-events: none; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        🎯 ${this.mouseCoords}
                    </div>
                ` : ''}

                ${this.viewMode === 'typer' && this.isTyperOverlayVisible ? this.renderTyper() : ''}
                
                ${this.viewMode === 'typer' && !this.isGhostHidden ? html`
                    <div class="wpm-circle">${this.currentWpm}</div>
                ` : ''}

                ${this.toastMessage ? html`
                    <div class="toast-container" style="color: ${this.toastColor}; border-color: ${this.toastColor}; animation: fadeIn 0.2s;">
                        ${this.toastMessage}
                    </div>
                ` : ''}
            </div>
        `;
    }
}
customElements.define('proctored-oa', ProctoredOA);