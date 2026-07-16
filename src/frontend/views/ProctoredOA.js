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
            pointer-events: auto; /* Allows clicking to select lines */
        }
        .typer-line { display: flex; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; transition: 0.2s; }
        
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
        isThinkModeActive: { type: Boolean }
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
            this.requestUpdate();
        }

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

                if (this.dwellAnimationFrame) {
                    cancelAnimationFrame(this.dwellAnimationFrame);
                    this.dwellAnimationFrame = null;
                }

                if (zone !== 'none') {
                    const map = this.viewMode === 'typer' ? (this.prefs.typerHotCorners || {}) 
                              : (this.activePage === 2 ? (this.prefs.hotCornersPage2 || {}) : (this.prefs.hotCorners || {}));
                    const action = map[zone];

                    // 🛑 STEALTH LOCK: Completely reject all other corners if hidden
                    if (this.isGhostHidden && action !== 'hide_unhide') return;

                    this.dwellStartTime = performance.now();
                    
                    let targetDuration = (this.prefs.hotCornerBounds?.dwellTime || 3) * 1000;
                    if (action === 'hide_unhide') {
                        // 🟢 FIX: If visible (Hiding), it is an Instant Emergency Hide (0). 
                        // If hidden (Unhiding), it strictly follows the 'Unhide Delay' slider (hideTime).
                        targetDuration = !this.isGhostHidden ? 0 : ((this.prefs.hotCornerBounds?.hideTime || 0) * 1000);
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
                        
                        // 🟢 Send the live progress to the backend HUD!
                        ipcRenderer.send('sync-hud-progress', { zone, progress: this.hoverProgress });
                        this.requestUpdate();

                        if (this.hoverProgress >= 100) {
                            this.isActionFired = true;
                            if (action && action !== 'none') {
                                this.executeActionByName(action);
                                
                                const continuousActions = ['scroll_up', 'scroll_down', 'trim_top', 'trim_bottom', 'expand_top', 'expand_bottom'];
                                if (continuousActions.includes(action)) {
                                    this.isActionFired = false;
                                    this.dwellStartTime = performance.now() - (targetDuration * 0.85); 
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
                    if (this.typingState === 'typing' && this.typingCurrentLineIndex >= (this.typerEndLine - this.typerStartLine)) {
                        this.viewMode = 'hidden';
                        ipcRenderer.send('set-ignore-mouse-events', true);
                        this.showToast('✅ Typing Complete');
                        this.typerStartLine = 0;
                        this.typingCurrentLineIndex = 0;
                    }
                    this.typingState = 'idle';
                    this.requestUpdate();
                }
            };

            this.typingProgressHandler = (_, lineIdx) => {
                this.typingCurrentLineIndex = lineIdx;
                this.requestUpdate();
            };

            this.screenshotHandler = () => { this.showToast('📸 Captured', '#4285f4'); };
            this.codeMsgHandler = () => { this.showToast('🤖 AI Responded', '#a142f4'); };

            ipcRenderer.on('hot-corner-hover', this.hoverHandler);
            ipcRenderer.on('execute-direct-action', this.directActionHandler);
            ipcRenderer.on('code-new-message', this.codeMsgHandler);
            ipcRenderer.on('typing-status', this.typingStatusHandler);
            ipcRenderer.on('typing-progress', this.typingProgressHandler);
            ipcRenderer.on('screenshot-captured', this.screenshotHandler);
        }

        this.addEventListener('trigger-typer', (e) => {
            const rawCode = e.detail;
            this.typerCodeLines = rawCode.split('\n');
            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') this.typerCodeLines.pop();
            this.typerStartLine = 0;
            this.typerEndLine = this.typerCodeLines.length - 1;
            this.typingCurrentLineIndex = 0;
            this.viewMode = 'typer';
            this.requestUpdate();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('hot-corner-hover', this.hoverHandler);
            ipcRenderer.removeListener('execute-direct-action', this.directActionHandler);
            ipcRenderer.removeListener('code-new-message', this.codeMsgHandler);
            ipcRenderer.removeListener('typing-status', this.typingStatusHandler);
            ipcRenderer.removeListener('typing-progress', this.typingProgressHandler);
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

        switch (action) {
            case 'capture':
                await ipcRenderer.invoke('capture-screenshot');
                break;
            case 'send_ai':
                this.showToast('🚀 Processing...');
                await ipcRenderer.invoke('send-oa-automation', this.prefs.programmingLanguage || 'C++');
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
            case 'hide_unhide':
                await ipcRenderer.invoke('trigger-ghost-hide');
                break;
            case 'abort_oa':
                this.showToast('🚪 Exiting OA Mode...');
                await ipcRenderer.invoke('clear-screenshots'); // 🟢 FIX: Clear screenshots explicitly on abort
                if (window.require) window.require('electron').ipcRenderer.invoke('new-chat');
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;
            case 'toggle_page2':
                this.activePage = this.activePage === 1 ? 2 : 1;
                ipcRenderer.send('refresh-oa-hud', this.activePage);
                this.showToast(`📄 Page ${this.activePage}`);
                break;
            case 'auto_type':
                if (this.typingState === 'idle') {
                    if (this.viewMode === 'typer') {
                        const codeToType = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
                        const speed = this.prefs.wpmSpeed || 60;
                        const mistake = this.prefs.typerMistakes ?? 2;
                        
                        this.typingState = 'typing';
                        this.typingCurrentLineIndex = 0;
                        ipcRenderer.send('start-auto-type', codeToType, speed, mistake);
                        this.showToast('▶️ Auto-Typing Started');
                        
                        // Hide UI to see code type out
                        this.viewMode = 'hidden';
                        ipcRenderer.send('set-ignore-mouse-events', true);
                    } else {
                        this.showToast('🔍 Extracting Code...', '#f59e0b');
                        const rawCode = await ipcRenderer.invoke('fetch-latest-code');
                        if (rawCode && rawCode.trim()) {
                            this.dispatchEvent(new CustomEvent('trigger-typer', { detail: rawCode }));
                            this.showToast('🎯 Ghost Typer Armed', '#a142f4');
                            ipcRenderer.send('set-ignore-mouse-events', false); // Drop wall to click UI
                        } else {
                            this.showToast('⚠️ No Code Found on AI Screen', '#f14c4c');
                        }
                    }
                } else if (this.typingState === 'typing') {
                    ipcRenderer.send('stop-auto-type');
                    this.typingState = 'idle';
                    this.viewMode = 'hidden';
                    ipcRenderer.send('set-ignore-mouse-events', true);
                    this.showToast('🛑 Auto-Type Stopped', '#f14c4c');
                }
                break;
            case 'abort_typer':
                if (this.viewMode === 'typer') {
                    if (this.typingState === 'typing') ipcRenderer.send('stop-auto-type');
                    this.typingState = 'idle';
                    this.viewMode = 'hidden';
                    ipcRenderer.send('set-ignore-mouse-events', true);
                    this.showToast('🛑 Typer Aborted');
                }
                break;
            case 'change_ai':
                let loadouts = this.prefs.dualBrainLoadouts || [];
                let activeL = loadouts[0] || {};
                let nextIdx = ((activeL.codeEngine !== undefined ? activeL.codeEngine : 1) + 1) % 3;
                activeL.codeEngine = nextIdx;
                this.savePref('dualBrainLoadouts', loadouts);
                ipcRenderer.invoke('switch-ai-profile', activeL.codeProfileId);
                ipcRenderer.send('refresh-oa-hud', this.activePage);
                this.showToast(`🤖 AI Switched`);
                break;
            case 'fast_think':
                ipcRenderer.invoke('toggle-ai-mode');
                setTimeout(() => ipcRenderer.send('refresh-oa-hud', this.activePage), 200);
                this.showToast(this.isThinkModeActive ? '⚡ Fast Mode' : '🧠 Think Mode');
                break;
            case 'trim_top':
                if (this.typerStartLine < this.typerEndLine) this.typerStartLine++;
                break;
            case 'trim_bottom':
                if (this.typerEndLine > this.typerStartLine) this.typerEndLine--;
                break;
            case 'expand_top':
                if (this.typerStartLine > 0) this.typerStartLine--;
                break;
            case 'expand_bottom':
                if (this.typerEndLine < this.typerCodeLines.length - 1) this.typerEndLine++;
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
        }
        this.requestUpdate();
    }

    showToast(msg, color = '#00cc66') {
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
                ${this.viewMode === 'typer' ? this.renderTyper() : ''}
                
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