import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import '../components/ChatFeed.js'; // Ensure ChatFeed is loaded

export class ProctoredOA extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: transparent; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        
        .main-wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
        .chat-area { flex: 1; min-height: 0; height: auto; overflow-y: auto; }
        
        /* 🟢 Typer Mode CSS */
        .typer-code-container { flex: 1; overflow-y: auto; padding: 0 16px 20px 16px; font-family: 'SF Mono', Consolas, monospace; font-size: var(--response-font-size, 13px); line-height: 1.6; color: var(--text-color); }
        .typer-line { display: flex; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; transition: 0.2s; }
        
        /* 🟢 Bottom Action Matrix */
        .bottom-controls { padding: 6px; background: rgba(0,0,0,0.25); border-top: 1px dashed var(--border-color); flex-shrink: 0; }
        .monitor-matrix { display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 24px); gap: 4px; text-align: center; font-size: 8.5px; font-weight: bold; width: 100%; }
        .matrix-cell { position: relative; border-radius: 4px; overflow: hidden; background: rgba(0,0,0,0.3); transition: 0.2s; display: flex; align-items: center; justify-content: center; height: 100%; padding: 0 4px; border: 1px solid var(--border-subtle); color: var(--text-secondary); }
        .matrix-cell.hovered { border-color: #f59e0b; color: #fff; }
        .progress-fill { position: absolute; top: 0; left: 0; bottom: 0; height: 100%; background: rgba(245, 158, 11, 0.4); z-index: 1; }
        .cell-text { position: relative; z-index: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        .center-msg { grid-column: span 3; grid-row: span 3; display: flex; align-items: center; justify-content: center; height: 100%; text-transform: uppercase; font-size: 11px; font-weight: bold; text-align: center; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;

    static properties = {
        localChatHistory: { type: Array }, 
        localChatIndex: { type: Number },
        isSolving: { type: Boolean },
        viewMode: { type: String }, // 'chat' or 'typer'
        hoverZone: { type: String },
        hoverProgress: { type: Number },
        activePage: { type: Number },
        prefs: { type: Object },
        toastMessage: { type: String },
        // Typer States
        typerCodeLines: { type: Array },
        typerStartLine: { type: Number },
        typerEndLine: { type: Number },
        typingCurrentLineIndex: { type: Number },
        typingState: { type: String }
    };

    constructor() {
        super();
        this.localChatHistory = [];
        this.localChatIndex = -1;
        this.isSolving = false;
        this.viewMode = 'chat';
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

        // 🟢 NEW: Precision Animation Timers
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

        // Listen for IPC events
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            // 🟢 FIX: Real Dwell Timer Engine
            this.hoverHandler = (_, zone) => {
                if (this.hoverZone === zone) return; // Prevent stuttering

                this.hoverZone = zone;
                this.hoverProgress = 0;
                this.isActionFired = false;
                
                if (this.dwellAnimationFrame) {
                    cancelAnimationFrame(this.dwellAnimationFrame);
                    this.dwellAnimationFrame = null;
                }

                if (zone !== 'none') {
                    this.dwellStartTime = performance.now();
                    const dwellDuration = (this.prefs.hotCornerBounds?.dwellTime || 3) * 1000;

                    const animateDwell = (now) => {
                        if (this.hoverZone !== zone || this.isActionFired) return;

                        const elapsed = now - this.dwellStartTime;
                        this.hoverProgress = Math.min(100, (elapsed / dwellDuration) * 100);
                        this.requestUpdate();

                        if (this.hoverProgress >= 100) {
                            this.isActionFired = true;
                            
                            // Find the action mapped to this zone
                            const map = this.viewMode === 'typer' ? (this.prefs.typerHotCorners || {}) 
                                      : (this.activePage === 2 ? (this.prefs.hotCornersPage2 || {}) : (this.prefs.hotCorners || {}));
                            const action = map[zone];
                            
                            if (action && action !== 'none') {
                                this.executeActionByName(action);
                                
                                // 🟢 UX BOOST: Continuous Actions (Loop the timer!)
                                const continuousActions = ['scroll_up', 'scroll_down', 'trim_top', 'trim_bottom', 'expand_top', 'expand_bottom'];
                                if (continuousActions.includes(action)) {
                                    this.isActionFired = false;
                                    this.dwellStartTime = performance.now() - (dwellDuration * 0.85); // 85% pre-filled for rapid repeat
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

            // 🟢 NEW: Allow Trackpad Gestures to trigger OA functions!
            this.directActionHandler = (_, action) => {
                this.executeActionByName(action);
            };

            this.codeMsgHandler = (_, text) => {
                this.isSolving = false;
                if (this.localChatHistory.length > 0) {
                    const a = [...this.localChatHistory];
                    a[a.length - 1] = `🚀 **Prompt Sent**\n\n🤖 AI:\n${text}`;
                    this.localChatHistory = a;
                } else {
                    this.localChatHistory = [`🤖 AI:\n${text}`];
                    this.localChatIndex = 0;
                }
                this.requestUpdate();
                setTimeout(() => this.scrollToBottom(), 100);
            };

            this.typingStatusHandler = (_, status) => {
                if (!status) {
                    if (this.typingState === 'typing' && this.typingCurrentLineIndex >= (this.typerEndLine - this.typerStartLine)) {
                        this.viewMode = 'chat';
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

            this.screenshotHandler = (_, imgData) => {
                let current = this.localChatHistory[this.localChatIndex] || "📸 **Images in Queue:**\n\n";
                
                // If the screen currently shows an AI response, create a fresh block for the new images
                if (current.includes('🤖 AI:')) {
                    current = "📸 **Images in Queue:**\n\n";
                    this.localChatHistory.push(current);
                    this.localChatIndex = this.localChatHistory.length - 1;
                } else if (this.localChatHistory.length === 0) {
                    this.localChatHistory.push(current);
                    this.localChatIndex = 0;
                }

                // Append image without double newlines so ChatFeed.js groups them into the 5-column grid!
                const a = [...this.localChatHistory];
                a[this.localChatIndex] = current + ` ![Screenshot](${imgData})`;
                this.localChatHistory = a;
                
                this.requestUpdate();
                setTimeout(() => this.scrollToBottom(), 100);
            };

            ipcRenderer.on('hot-corner-hover', this.hoverHandler);
            ipcRenderer.on('execute-direct-action', this.directActionHandler);
            ipcRenderer.on('code-new-message', this.codeMsgHandler);
            ipcRenderer.on('code-update-message', this.codeMsgHandler);
            ipcRenderer.on('typing-status', this.typingStatusHandler);
            ipcRenderer.on('typing-progress', this.typingProgressHandler);
            ipcRenderer.on('screenshot-captured', this.screenshotHandler);
        }

        // Listen for Typer trigger from ChatFeed
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
            ipcRenderer.removeListener('code-update-message', this.codeMsgHandler);
            ipcRenderer.removeListener('typing-status', this.typingStatusHandler);
            ipcRenderer.removeListener('typing-progress', this.typingProgressHandler);
            ipcRenderer.removeListener('screenshot-captured', this.screenshotHandler);
        }
    }

    async savePref(key, value) {
        this.prefs = { ...this.prefs, [key]: value };
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            await window.cheatingDaddy.storage.updatePreference(key, value);
            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key, value } }));
        }
        this.requestUpdate();
    }

    // 🟢 FIX: The Missing Execution Bridge
    async executeActionByName(action) {
        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');
        
        if (action === 'reset' && !this.resetArmed) {
            this.resetArmed = true;
            this.showToast('⚠️ CONFIRM RESET', '#f14c4c');
            this.requestUpdate();
            setTimeout(() => { this.resetArmed = false; this.requestUpdate(); }, 3000);
            return;
        }

        this.showToast(`⚡ ${this.getHotCornerLabel(action)}`);
        
        switch (action) {
            case 'capture':
                const count = await ipcRenderer.invoke('capture-screenshot');
                this.showToast(`📸 Captured (${count})`);
                break;
            case 'send_ai':
                this.isSolving = true;
                this.showToast('🚀 Processing...');
                const lang = this.prefs.programmingLanguage || 'C++';
                await ipcRenderer.invoke('send-oa-automation', lang);
                break;
            case 'fix_error':
                this.isSolving = true;
                this.showToast('🌟 Fixing Error...');
                await ipcRenderer.invoke('send-oa-fix-error');
                break;
            case 'refactor':
                this.isSolving = true;
                this.showToast('🛠️ Refactoring...');
                await ipcRenderer.invoke('send-oa-refactor');
                break;
            case 'regenerate':
                this.isSolving = true;
                this.showToast('🔄 Regenerating...');
                await ipcRenderer.invoke('send-oa-regenerate');
                break;
            case 'scroll_up':
                const areaUp = this.shadowRoot.querySelector('.chat-area');
                if (areaUp) areaUp.scrollBy({ top: -300, behavior: 'smooth' });
                break;
            case 'scroll_down':
                const areaDn = this.shadowRoot.querySelector('.chat-area');
                if (areaDn) areaDn.scrollBy({ top: 300, behavior: 'smooth' });
                break;
            case 'hide_unhide':
                await ipcRenderer.invoke('trigger-ghost-hide');
                break;
            case 'abort_oa':
                this.showToast('🚪 Exiting OA Mode...');
                
                // 1. Wipe local UI memory
                this.codeChatHistory = []; 
                this.voiceChatHistory = [];
                this.codeChatIndex = 0; 
                this.voiceChatIndex = 0;
                
                // 2. Wipe Backend AI Memory
                if (window.require) window.require('electron').ipcRenderer.invoke('new-chat');
                
                // 3. Delegate to RootApp.js to safely guarantee the mouse-wall drops!
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;
            case 'toggle_page2':
                this.activePage = this.activePage === 1 ? 2 : 1;
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
                    } else {
                        let content = this.localChatHistory[this.localChatIndex] || '';
                        let codeMatches = content.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
                        if (codeMatches && codeMatches[1]) {
                            const rawCode = codeMatches[1];
                            this.dispatchEvent(new CustomEvent('trigger-typer', { detail: rawCode }));
                            this.showToast('🎯 Ghost Typer Armed');
                        } else {
                            this.showToast('⚠️ No Code Found', '#f14c4c');
                        }
                    }
                } else if (this.typingState === 'typing') {
                    ipcRenderer.send('stop-auto-type');
                    this.typingState = 'idle';
                    this.showToast('🛑 Auto-Type Stopped', '#f14c4c');
                }
                break;
            case 'abort_typer':
                if (this.viewMode === 'typer') {
                    if (this.typingState === 'typing') ipcRenderer.send('stop-auto-type');
                    this.typingState = 'idle';
                    this.viewMode = 'chat';
                    this.showToast('🛑 Typer Aborted');
                }
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
                this.localChatHistory = [];
                this.localChatIndex = -1;
                this.showToast('✨ Session Cleared');
                this.resetArmed = false;
                break;
            case 'text_inc':
                const curInc = this.prefs.fontSize || 13;
                this.savePref('fontSize', curInc + 1);
                break;
            case 'text_dec':
                const curDec = this.prefs.fontSize || 13;
                this.savePref('fontSize', Math.max(10, curDec - 1));
                break;
            case 'bg_inc':
                const curBgInc = this.prefs.backgroundTransparency || 0.8;
                this.savePref('backgroundTransparency', Math.min(1, curBgInc + 0.1));
                break;
            case 'bg_dec':
                const curBgDec = this.prefs.backgroundTransparency || 0.8;
                this.savePref('backgroundTransparency', Math.max(0, curBgDec - 0.1));
                break;
            case 'toggle_ai_vis':
                await ipcRenderer.invoke('toggle-ai-visibility');
                break;
            case 'prev_resp':
                if (this.localChatIndex > 0) {
                    this.localChatIndex--;
                    this.requestUpdate();
                }
                break;
            case 'next_resp':
                if (this.localChatIndex < this.localChatHistory.length - 1) {
                    this.localChatIndex++;
                    this.requestUpdate();
                }
                break;
        }
        this.requestUpdate();
    }

    scrollToBottom() {
        const area = this.shadowRoot.querySelector('.chat-area');
        if (area) area.scrollTop = area.scrollHeight;
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

    getHotCornerLabel(action) {
        const labels = {
            'none': '—', 'capture': '📸 Capture', 'send_ai': '🚀 Send AI',
            'hide_unhide': '👻 Hide/Show', 'scroll_up': '⬆️ Scroll Up', 'scroll_down': '⬇️ Scroll Dn',
            'prev_resp': '◀ Prev', 'next_resp': '▶ Next', 'change_ai': '🤖 Change AI',
            'change_profile': '👤 Profile', 'fast_think': '🧠 Fast/Think', 'refactor': '🛠️ Refactor',
            'reset': '✨ Reset', 'text_inc': 'A+ Text', 'text_dec': 'A- Text',
            'bg_inc': '⬛ Opacity+', 'bg_dec': '⬜ Opacity-', 'toggle_ai_vis': '👁️ Toggle AI',
            'fix_error': '🔧 Fix Error', 'language': '💻 Language', 'mic': '🎙️ Mic',
            'trim_top': '✂️ Unselect Top', 'trim_bottom': '✂️ Unselect Bot', 'abort_typer': '🛑 Abort',
            'auto_type': '⌨️ Auto-Type', 'expand_top': '➕ Expand Top', 'expand_bottom': '➕ Expand Bot',
            'reset_typer': '🔄 Reset', 'abort_oa': '🚪 Abort OA', 'toggle_page2': '🔄 Page 1 / 2'
        };
        return labels[action] || action || '—';
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
                <div style="background: rgba(161, 66, 244, 0.15); border: 1px solid rgba(161, 66, 244, 0.5); padding: 10px; border-radius: 6px; margin: 15px 0;">
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

    renderMatrix() {
        let map = this.viewMode === 'typer' ? (this.prefs.typerHotCorners || {}) 
                  : (this.activePage === 2 ? (this.prefs.hotCornersPage2 || {}) : (this.prefs.hotCorners || {}));
                  
        const renderZone = (id) => {
            const isHover = this.hoverZone === id;
            const action = map[id];
            if (!action || action === 'none') return html`<div style="opacity: 0.1;"></div>`;
            
            let label = this.getHotCornerLabel(action);
            if (action === 'reset' && this.resetArmed) label = '⚠️ CONFIRM RESET';
            
            return html`
                <div class="matrix-cell ${isHover ? 'hovered' : ''}" style="${action === 'reset' && this.resetArmed ? 'border-color: #f14c4c; color: #f14c4c; background: rgba(241,76,76,0.15);' : ''}">
                    ${isHover ? html`<div class="progress-fill" style="width: ${this.hoverProgress}%"></div>` : ''}
                    <div class="cell-text">${label}</div>
                </div>
            `;
        };

        const centerBlock = this.toastMessage 
            ? html`<div class="center-msg" style="color: ${this.toastColor}; animation: fadeIn 0.2s;">${this.toastMessage}</div>` 
            : html`<div class="center-msg" style="opacity: 0.4;">🎯 EDGE DWELL SENSORS ACTIVE ${this.activePage === 2 ? '(PAGE 2)' : ''}</div>`;

        return html`
            <div class="bottom-controls">
                <div class="monitor-matrix">
                    ${renderZone('top_left')} ${renderZone('top_mid_left')} ${renderZone('top_center')} ${renderZone('top_mid_right')} ${renderZone('top_right')}
                    ${renderZone('left_mid_top')} ${centerBlock} ${renderZone('right_mid_top')}
                    ${renderZone('middle_left')} ${renderZone('middle_right')}
                    ${renderZone('left_mid_bottom')} ${renderZone('right_mid_bottom')}
                    ${renderZone('bottom_left')} ${renderZone('bottom_mid_left')} ${renderZone('bottom_center')} ${renderZone('bottom_mid_right')} ${renderZone('bottom_right')}
                </div>
            </div>
        `;
    }

    render() {
        let content = "🟢 **System Online. Awaiting inputs...**";
        if (this.localChatHistory.length > 0 && this.localChatIndex >= 0) {
            content = this.localChatHistory[this.localChatIndex];
        }

        return html`
            <div class="main-wrapper">
                ${this.viewMode === 'typer' 
                    ? this.renderTyper() 
                    : html`<div class="chat-area"><chat-feed .content=${content}></chat-feed></div>`
                }
                ${this.renderMatrix()}
            </div>
        `;
    }
}
customElements.define('proctored-oa', ProctoredOA);