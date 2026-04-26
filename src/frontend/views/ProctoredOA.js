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
            
            this.hoverHandler = (_, zone) => {
                this.hoverZone = zone;
                // Basic visualization simulation (Since backend handles real timer)
                this.hoverProgress = zone !== 'none' ? 100 : 0; 
                this.requestUpdate();
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

            ipcRenderer.on('hot-corner-hover', this.hoverHandler);
            ipcRenderer.on('code-new-message', this.codeMsgHandler);
            ipcRenderer.on('code-update-message', this.codeMsgHandler);
            ipcRenderer.on('typing-status', this.typingStatusHandler);
            ipcRenderer.on('typing-progress', this.typingProgressHandler);
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
            ipcRenderer.removeListener('code-new-message', this.codeMsgHandler);
            ipcRenderer.removeListener('code-update-message', this.codeMsgHandler);
            ipcRenderer.removeListener('typing-status', this.typingStatusHandler);
            ipcRenderer.removeListener('typing-progress', this.typingProgressHandler);
        }
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
        this.toastTimeout = setTimeout(() => { this.toastMessage = ''; this.requestUpdate(); }, 2000);
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