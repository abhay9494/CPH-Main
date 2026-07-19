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
            pointer-events: none; /* Allows clicking to select lines */
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

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
    `;

    static properties = {
        viewMode: { type: String }, // 'hidden' or 'typer'
        hoverZone: { type: String },
        hoverProgress: { type: Number },
        activePage: { type: Number },
        prefs: { type: Object },
        toastMessage: { type: String },
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
        this.prefs = {};
        this.toastMessage = '';
        this.resetArmed = false;
        
        this.typerCodeLines = [];
        this.typerStartLine = 0;
        this.typerEndLine = 0;
        this.typingCurrentLineIndex = 0;
        this.typingState = 'idle';
        this.typingCurrentCharIndex = 0;
        this.typingPauseIndex = 0;
        this.fullCodeString = '';
        this.currentWpm = 60;
        this.isChangingSpeed = false;

        this.isGhostHidden = false;
        this.isThinkModeActive = false;

        this.dwellStartTime = 0;
        this.dwellAnimationFrame = null;
        this.isActionFired = false;
    }

    async connectedCallback() {
        super.connectedCallback();
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

                this.hoverZone = zone;
                this.hoverProgress = 0;
                this.isActionFired = false;
                
                // Clear the progress bar immediately when leaving a zone
                ipcRenderer.send('sync-hud-progress', { zone: this.hoverZone, progress: 0 });

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
                    if (this.viewMode === 'typer') {
                        map = this.prefs.typerHotCorners || {};
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
                    const allowedInStealth = ['hide_unhide', 'auto_type', 'speed_inc', 'speed_dec'];

                    // 🛑 STEALTH LOCK
                    if (this.isGhostHidden && !allowedInStealth.includes(action)) return;
                    
                    // 🛑 TYPING LOCK: Block all triggers except the 4 allowed when actively typing!
                    if (this.typingState === 'typing' && !allowedInStealth.includes(action)) return;

                    this.dwellStartTime = performance.now();
                    
                    let targetDuration = (this.prefs.hotCornerBounds?.dwellTime || 3) * 1000;
                    if (action === 'hide_unhide') {
                        targetDuration = !this.isGhostHidden ? 0 : ((this.prefs.hotCornerBounds?.hideTime || 0) * 1000);
                    } else if (['trim_top', 'trim_bottom', 'expand_top', 'expand_bottom', 'speed_inc', 'speed_dec'].includes(action)) {
                        targetDuration = (this.prefs.typerSelectionSpeed !== undefined ? this.prefs.typerSelectionSpeed : 0.5) * 1000;
                    } else if (action === 'auto_type' && this.typingState === 'typing') {
                        targetDuration = 0;
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
                if (!status) {
                    if (this.isChangingSpeed) return; // 🟢 FIX: Ignore the fake "stop" signal during hot-swapping!
                    if (this.typingState === 'typing') { 
                        
                        // 🟢 NEW: Fire the 3-Blink Green Dot!
                        ipcRenderer.send('trigger-completion-dot');

                        this.typingState = 'idle';
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

            this.typingProgressCharHandler = (_, data) => {
                // 🟢 FIX: Completely ignore delayed "ghost" messages from killed processes!
                if (data.runId !== this.currentRunId) return; 
                
                this.typingCurrentCharIndex = this.typingPauseIndex + data.idx;
                const typedString = this.fullCodeString.substring(0, this.typingCurrentCharIndex);
                this.typingCurrentLineIndex = (typedString.match(/\n/g) || []).length;
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
            this.currentWpm = this.prefs.wpmSpeed || 60;
            
            // 🟢 FIX: Destroy ALL carriage returns. This guarantees JS and PowerShell calculate the exact same string length!
            rawCode = rawCode.replace(/\r/g, '');
            rawCode = rawCode.replace(/^(c\+\+|cpp|python|java|javascript|js|c|go)\s*\n/i, '');
            
            this.typerCodeLines = rawCode.split('\n');
            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') this.typerCodeLines.pop();
            this.typerStartLine = 0;
            this.typerEndLine = this.typerCodeLines.length - 1;
            this.typingCurrentLineIndex = 0;
            this.viewMode = 'typer';
            
            // 🟢 FIX: Instantly hide the AI Window and switch to Typer HUD Corners!
            if (window.require) {
                window.require('electron').ipcRenderer.invoke('toggle-ai-visibility', false);
                window.require('electron').ipcRenderer.send('refresh-oa-hud', 'typer');
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

        switch (action) {
            case 'capture':
                await ipcRenderer.invoke('capture-screenshot');
                break;
            case 'send_ai':
                this.showToast('🚀 Processing...');
                await ipcRenderer.invoke('send-oa-automation');
                break;
            case 'fix_error':
                this.showToast('🌟 Fixing Error...');
                await ipcRenderer.invoke('send-oa-fix-error');
                break;
            case 'refactor':
                this.showToast('🛠️ Refactoring...');
                await ipcRenderer.invoke('send-oa-refactor');
                break;
            case 'regenerate':
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
                this.showToast('🚪 Exiting OA Mode...');
                await ipcRenderer.invoke('clear-screenshots'); 
                if (window.require) window.require('electron').ipcRenderer.invoke('new-chat');
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;
            case 'toggle_page2': {
                const pages = this.prefs.oaPages || [];
                const totalPages = Math.max(1, pages.length > 0 ? pages.length : (this.prefs.hotCornersPage2 ? 2 : 1));
                this.activePage = (this.activePage % totalPages) + 1;
                ipcRenderer.send('refresh-oa-hud', this.activePage);
                this.showToast(`📄 Page ${this.activePage}`);
                break;
            }
            case 'auto_type':
                if (this.typingState === 'idle') {
                    if (this.viewMode === 'typer') {
                        this.fullCodeString = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
                        const speed = this.currentWpm;
                        const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                        const startDelay = this.prefs.typerDelay !== undefined ? this.prefs.typerDelay : 5; 
                        
                        this.typingState = 'typing';
                        this.typingCurrentCharIndex = 0;
                        this.typingPauseIndex = 0;
                        this.currentRunId = Date.now(); // 🟢 NEW
                        
                        ipcRenderer.send('start-auto-type', this.fullCodeString, speed, mistake, startDelay, this.currentRunId);
                        this.showToast(`▶️ Auto-Typing in ${startDelay}s...`);
                        
                        ipcRenderer.send('set-ignore-mouse-events', true);
                        
                        // 🟢 FIX: Keep viewMode as 'typer' so corners stay active!
                        // Force Stealth Mode to hide names and overlay instantly
                        if (!this.isGhostHidden) {
                            ipcRenderer.invoke('trigger-ghost-hide');
                        }

                    } else {
                        this.showToast('🔍 Extracting Code...', '#f59e0b');
                        const rawCode = await ipcRenderer.invoke('fetch-latest-code');
                        if (rawCode && rawCode.trim()) {
                            // Arm the UI array natively
                            this.typerCodeLines = rawCode.split('\n');
                            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') this.typerCodeLines.pop();
                            this.typerStartLine = 0;
                            this.typerEndLine = this.typerCodeLines.length - 1;
                            this.typingCurrentCharIndex = 0;
                            this.typingPauseIndex = 0;
                            this.typingState = 'idle';
                            this.viewMode = 'typer';
                            
                            this.showToast('🎯 Ghost Typer Armed', '#a142f4');
                            
                            ipcRenderer.send('set-ignore-mouse-events', true); 
                            ipcRenderer.invoke('toggle-ai-visibility', false);
                            ipcRenderer.send('refresh-oa-hud', 'typer');
                        } else {
                            this.showToast('⚠️ No Code Found on AI Screen', '#f14c4c');
                        }
                    }
                } else if (this.typingState === 'typing') {
                    // 🟢 PAUSE MODE
                    this.typingState = 'paused'; // Set state BEFORE stopping so statusHandler doesn't clear it
                    ipcRenderer.send('stop-auto-type');
                    this.typingPauseIndex = this.typingCurrentCharIndex;
                    this.showToast('⏸️ Auto-Type Paused', '#f59e0b');
                } else if (this.typingState === 'paused') {
                    // 🟢 RESUME MODE
                    const remainingCode = this.fullCodeString.substring(this.typingCurrentCharIndex);
                    const speed = this.currentWpm;
                    const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                    
                    // 🟢 FIX: Use the configured Start Delay for resuming!
                    const startDelay = this.prefs.typerDelay !== undefined ? this.prefs.typerDelay : 5; 
                    
                    this.typingState = 'typing';
                    this.currentRunId = Date.now(); // 🟢 NEW
                    ipcRenderer.send('start-auto-type', remainingCode, speed, mistake, startDelay, this.currentRunId);
                    this.showToast(`▶️ Resuming in ${startDelay}s...`);
                    
                    // 🟢 FIX: Ensure UI goes back to full Stealth while resuming
                    this.viewMode = 'hidden';
                    ipcRenderer.send('set-ignore-mouse-events', true);
                    if (!this.isGhostHidden) {
                        ipcRenderer.invoke('trigger-ghost-hide');
                    }
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
            case 'trim_top':
                if (this.typerStartLine < this.typerEndLine) this.typerStartLine++;
                if (this.viewMode === 'typer') { const lines = this.shadowRoot.querySelectorAll('.typer-line'); if(lines[this.typerStartLine]) lines[this.typerStartLine].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                break;
            case 'trim_bottom':
                if (this.typerEndLine > this.typerStartLine) this.typerEndLine--;
                if (this.viewMode === 'typer') { const lines = this.shadowRoot.querySelectorAll('.typer-line'); if(lines[this.typerEndLine]) lines[this.typerEndLine].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                break;
            case 'expand_top':
                if (this.typerStartLine > 0) this.typerStartLine--;
                if (this.viewMode === 'typer') { const lines = this.shadowRoot.querySelectorAll('.typer-line'); if(lines[this.typerStartLine]) lines[this.typerStartLine].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                break;
            case 'expand_bottom':
                if (this.typerEndLine < this.typerCodeLines.length - 1) this.typerEndLine++;
                if (this.viewMode === 'typer') { const lines = this.shadowRoot.querySelectorAll('.typer-line'); if(lines[this.typerEndLine]) lines[this.typerEndLine].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                break;
            case 'reset_typer':
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
                // 🟢 NEW: Dynamically parse the Custom Speeds injected from Settings
                if (action && action.startsWith('speed_set_')) {
                    const newSpeed = parseInt(action.replace('speed_set_', ''));
                    this.currentWpm = newSpeed;
                    this.showToast(`⚡ Speed Locked: ${this.currentWpm} WPM`, '#a142f4');
                    if (this.typingState === 'typing') {
                        this.isChangingSpeed = true;
                        ipcRenderer.send('stop-auto-type');
                        this.typingPauseIndex = this.typingCurrentCharIndex; 
                        const remainingCode = this.fullCodeString.substring(this.typingCurrentCharIndex);
                        const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                        this.currentRunId = Date.now();
                        ipcRenderer.send('start-auto-type', remainingCode, this.currentWpm, mistake, 0, this.currentRunId);
                        setTimeout(() => { this.isChangingSpeed = false; }, 500);
                    }
                    break;
                }
                break;
            case 'speed_inc':
                this.currentWpm = Math.min(200, this.currentWpm + 5);
                this.showToast(`⏩ Speed: ${this.currentWpm} WPM`, '#4285f4');
                if (this.typingState === 'typing') {
                    this.isChangingSpeed = true;
                    ipcRenderer.send('stop-auto-type');
                    this.typingPauseIndex = this.typingCurrentCharIndex; // Save the exact char we stopped at
                    
                    const remainingCode = this.fullCodeString.substring(this.typingCurrentCharIndex);
                    const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                    this.currentRunId = Date.now();
                    
                    // 🟢 Instantly resume at new speed with 0s start delay!
                    ipcRenderer.send('start-auto-type', remainingCode, this.currentWpm, mistake, 0, this.currentRunId);
                    setTimeout(() => { this.isChangingSpeed = false; }, 500);
                }
                break;
            case 'speed_dec':
                this.currentWpm = Math.max(10, this.currentWpm - 5);
                this.showToast(`⏪ Speed: ${this.currentWpm} WPM`, '#f59e0b');
                if (this.typingState === 'typing') {
                    this.isChangingSpeed = true;
                    ipcRenderer.send('stop-auto-type');
                    this.typingPauseIndex = this.typingCurrentCharIndex; 
                    
                    const remainingCode = this.fullCodeString.substring(this.typingCurrentCharIndex);
                    const mistake = this.prefs.typerMistakes !== undefined ? this.prefs.typerMistakes : 2;
                    this.currentRunId = Date.now();
                    
                    ipcRenderer.send('start-auto-type', remainingCode, this.currentWpm, mistake, 0, this.currentRunId);
                    setTimeout(() => { this.isChangingSpeed = false; }, 500);
                }
                break;
        }
        this.requestUpdate();
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
            <div class="typer-code-container">
                <div style="background: rgba(161, 66, 244, 0.15); border: 1px solid rgba(161, 66, 244, 0.5); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                    <strong style="color: #a142f4;">Select Range to Type.</strong> Area in purple will be typed.
                </div>
                ${this.typerCodeLines.map((line, idx) => {
                    const isHighlighted = idx >= this.typerStartLine && idx <= this.typerEndLine;
                    const isCurrent = (this.typingState === 'typing') && isHighlighted && (idx === this.typerStartLine + this.typingCurrentLineIndex);
                    let bg = 'transparent', b = 'transparent', tc = 'var(--text-color)', nc = '#666';
                    if (isCurrent) { bg = 'rgba(0, 204, 102, 0.25)'; b = '#00cc66'; tc = '#fff'; nc = '#00cc66'; }
                    else if (isHighlighted) { bg = 'rgba(161, 66, 244, 0.2)'; b = 'rgba(161, 66, 244, 0.3)'; tc = 'var(--text-color)'; nc = '#a142f4'; }
                    return html`
                        <div class="typer-line" style="background: ${bg}; border: 1px solid ${b}; color: ${tc};" @click=${() => this.handleLineClick(idx)}>
                            <div style="width: 40px; text-align: right; padding-right: 12px; font-weight: bold; color: ${nc};">${idx + 1}</div>
                            <div style="white-space: pre-wrap; word-wrap: break-word; flex: 1;">${line || ' '}</div>
                        </div>
                    `;
                })}
            </div>
        `;
    }

    render() {
        return html`
            <div class="main-wrapper">
                ${this.viewMode === 'typer' && this.typingState === 'idle' ? this.renderTyper() : ''}
                
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