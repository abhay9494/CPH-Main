import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class HistoryView extends LitElement {
    static styles = css`
        /* 🟢 Import Highlight.js theme directly into the Shadow DOM */
        @import url('[https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css](https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css)');

        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
        :host { height: 100%; display: flex; flex-direction: column; width: 100%; color: var(--text-color); }
        
        .history-container { display: flex; width: 100%; height: 100%; }
        
        /* 🟢 Sidebar */
        .sessions-list { width: 260px; border-right: 1px solid var(--border-color); overflow-y: auto; background: var(--bg-primary); display: flex; flex-direction: column; }
        
        .session-item { padding: 15px; border-bottom: 1px solid var(--border-color); transition: 0.2s; cursor: default !important; border-left: 3px solid transparent; position: relative; }
        .session-item:hover { background: var(--hover-background); }
        .session-item.selected { background: var(--bg-tertiary); border-left-color: #a142f4; }
        
        .session-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .session-title { font-weight: bold; font-size: 13px; color: var(--text-color); flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .title-input { width: 100%; background: var(--bg-tertiary); color: var(--text-color); border: 1px solid #4285f4; border-radius: 3px; font-size: 13px; padding: 2px 4px; outline: none; box-sizing: border-box; }
        
        .session-actions { display: flex; gap: 4px; flex-shrink: 0; margin-left: 8px; }
        
        .icon-button { background: transparent; color: var(--text-muted); border: none; padding: 2px; height: 20px; width: 20px; border-radius: 3px; display: flex; align-items: center; justify-content: center; transition: 0.2s; cursor: default !important; }
        .icon-button:hover { background: rgba(255,255,255,0.1); color: var(--text-color); transform: scale(1.1); }
        .icon-button.danger:hover { background: rgba(241, 76, 76, 0.1); color: #f14c4c; }

        .session-meta-row { display: flex; justify-content: space-between; align-items: center; }
        .session-date { font-size: 11px; color: var(--text-muted); }
        .session-count { font-size: 10px; color: #666; font-family: monospace; }

        /* 🟢 Right Pane Layout */
        .main-pane { flex: 1; display: flex; flex-direction: column; background: var(--bg-primary); overflow: hidden; }
        .pane-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
        .header-title { font-size: 14px; font-weight: bold; color: var(--text-color); margin: 0; }

        /* 🟢 Markdown Chat Feed & Images */
        .conversation-view { flex: 1; overflow-y: auto; background: var(--bg-primary); }
        .markdown-body { width: 100%; padding: 20px 25px; font-size: var(--response-font-size, 13px); line-height: 1.6; color: var(--text-color); overflow-x: hidden; word-wrap: break-word; font-family: 'Inter', sans-serif; }
        
        /* 🐛 FIX: Bulletproof Gap Removal */
        .message-block { margin-bottom: 25px; }
        .message-label { font-size: 13px; font-weight: bold; margin-bottom: 4px; display: block; }
        .message-label.me { color: #4285f4; }
        .message-label.ai { color: #ef4444; }
        
        .message-content { margin-top: 4px; }
        .message-content > *:first-child { margin-top: 0 !important; }
        .message-content > *:last-child { margin-bottom: 0 !important; }

        /* 🐛 FIX: Grid Layout for Multiple Images */
        .markdown-body br { display: none; }
        
        .message-content p:has(img) {
            display: grid;
            /* Automatically calculates how many ~140px images fit perfectly per row */
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
            gap: 12px;
            margin-top: 10px !important;
            margin-bottom: 10px !important;
            padding: 10px;
            background: rgba(0,0,0,0.15);
            border-radius: 6px;
        }

        .markdown-body img { 
            width: 100%; 
            height: auto; 
            border-radius: 6px; 
            border: 1px solid var(--border-color, #444); 
            cursor: default !important;
            margin: 0; 
            transition: 0.2s ease-in-out; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
            object-fit: contain; 
        }
        
        .markdown-body img:hover { opacity: 0.8; transform: scale(1.02); }
        .markdown-body p { margin: 0.8em 0; }
        
        /* 🟢 Code Block Formatting */
        .code-block-wrapper { background: var(--bg-secondary); border: 1px solid var(--border-color, #333); border-radius: 6px; margin-bottom: 15px; overflow: hidden; position: relative; }
        .code-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 5px 10px; border-bottom: 1px solid var(--border-color, #333); }
        .lang-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: bold; }
        .copy-code-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 3px 8px; border-radius: 4px; font-size: 11px; transition: 0.2s; cursor: default !important; }
        .copy-code-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .code-block-wrapper pre { margin: 0; padding: 15px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        .code-block-wrapper pre code { background: transparent; padding: 0; border-radius: 0; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; }

        /* 🟢 Image Modal */
        .image-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 40px; cursor: default !important; backdrop-filter: blur(5px); }
        .image-modal img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain; }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #666; }
    `;

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        loading: { type: Boolean },
        editingSessionId: { type: String },
        editTitleValue: { type: String },
        modalImage: { type: String }
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.loading = true;
        this.editingSessionId = null;
        this.editTitleValue = '';
        this.modalImage = null;
        this.loadSessions();
    }

    connectedCallback() {
        super.connectedCallback();
        resizeLayout();
    }

    async loadSessions() {
        try {
            this.loading = true;
            let loaded = await window.cheatingDaddy.storage.getAllSessions();
            this.sessions = loaded.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
            this.requestUpdate();
        }
    }

    async handleSessionClick(session) {
        if (this.editingSessionId === session.sessionId) return;
        try {
            const fullSession = await window.cheatingDaddy.storage.getSession(session.sessionId);
            if (fullSession) {
                this.selectedSession = fullSession;
                this.requestUpdate();
            }
        } catch (error) { console.error('Error loading session:', error); }
    }

    async handleDeleteSession(e, sessionId) {
        e.stopPropagation();
        if (confirm("Permanently delete this session log?")) {
            await window.cheatingDaddy.storage.deleteSession(sessionId);
            if (this.selectedSession && this.selectedSession.sessionId === sessionId) {
                this.selectedSession = null;
            }
            this.loadSessions();
        }
    }

    startEditing(e, session) {
        e.stopPropagation();
        this.editingSessionId = session.sessionId;
        this.editTitleValue = session.customName || `Session ${new Date(session.createdAt).toLocaleDateString()}`;
        this.requestUpdate();
        setTimeout(() => {
            const input = this.shadowRoot.querySelector(`#edit-input-${session.sessionId}`);
            if (input) { input.focus(); input.select(); }
        }, 50);
    }

    async saveSessionName(e, session) {
        if (e.type === 'blur' || e.key === 'Enter') {
            e.preventDefault();
            const newName = this.editTitleValue.trim();
            if (newName) {
                try {
                    const fullSession = await window.cheatingDaddy.storage.getSession(session.sessionId);
                    if (fullSession) {
                        fullSession.customName = newName;
                        await window.cheatingDaddy.storage.saveSession(session.sessionId, fullSession);
                        if (this.selectedSession && this.selectedSession.sessionId === session.sessionId) {
                            this.selectedSession.customName = newName;
                        }
                        await this.loadSessions();
                    }
                } catch (error) { console.error("Failed to rename", error); }
            }
            this.editingSessionId = null;
            this.requestUpdate();
        }
        if (e.key === 'Escape') {
            this.editingSessionId = null;
            this.requestUpdate();
        }
    }

    renderMarkdown(text) {
        if (!text) return '';
        if (window.marked && window.hljs) {
            try {
                const renderer = new window.marked.Renderer();
                renderer.code = function(code, language) {
                    const codeStr = typeof code === 'object' ? (code.text || '') : (code || '');
                    const langStr = typeof code === 'object' ? (code.lang || '') : (language || '');
                    
                    // 🐛 THE FIX: This single missing line was crashing the parser and causing the raw backticks!
                    const langName = langStr.toLowerCase(); 
                    
                    const validLang = (langName && window.hljs.getLanguage(langName)) ? langName : 'plaintext';
                    let highlighted = codeStr;
                    try { highlighted = window.hljs.highlight(codeStr, { language: validLang }).value; } 
                    catch (e) { highlighted = codeStr.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
                    
                    const encodedCode = encodeURIComponent(codeStr); 
                    const displayLang = validLang === 'plaintext' ? 'code' : validLang;
                    
                    return `
                        <div class="code-block-wrapper">
                            <div class="code-header">
                                <span class="lang-label">${displayLang}</span>
                                <div><button class="copy-code-btn" data-code="${encodedCode}">📋 Copy</button></div>
                            </div>
                            <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
                        </div>`;
                };
                if (typeof window.marked.parse === 'function') return window.marked.parse(text, { renderer: renderer, breaks: true });
                else { window.marked.setOptions({ renderer: renderer, breaks: true }); return window.marked(text); }
            } catch (e) {
                console.error("Markdown Parser Error:", e);
            }
        }
        return `<pre style="white-space: pre-wrap; margin: 0;">${text}</pre>`; 
    }

    handleMarkdownClick(e) {
        if (e.target.tagName === 'IMG') {
            this.modalImage = e.target.src;
            this.requestUpdate();
        }
        if (e.target.classList.contains('copy-code-btn')) {
            const code = decodeURIComponent(e.target.getAttribute('data-code'));
            if (window.require) window.require('electron').clipboard.writeText(code);
            e.target.innerText = '✅ Copied!';
            setTimeout(() => { e.target.innerText = '📋 Copy'; }, 2000);
        }
    }

    formatDateMeta(timestamp) { 
        const d = new Date(timestamp);
        return `${d.toLocaleDateString()} \u00A0 ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; 
    }

    renderSessionsList() {
        if (this.loading) return html`<div class="empty-state" style="font-size: 12px;">Loading...</div>`;
        if (this.sessions.length === 0) return html`
            <div class="empty-state">
                <div style="font-size: 24px; margin-bottom: 5px;">📭</div>
                <div style="font-size: 12px;">No sessions yet</div>
            </div>`;

        return html`
            <div class="sessions-list">
                ${this.sessions.map(session => {
                    const title = session.customName || `Session ${new Date(session.createdAt).toLocaleDateString()}`;
                    const isEditing = this.editingSessionId === session.sessionId;
                    
                    return html`
                    <div class="session-item ${this.selectedSession?.sessionId === session.sessionId ? 'selected' : ''}" @click=${() => this.handleSessionClick(session)}>
                        
                        <div class="session-title-row">
                            ${isEditing ? html`
                                <input class="title-input" id="edit-input-${session.sessionId}"
                                    .value=${this.editTitleValue} 
                                    @input=${e => this.editTitleValue = e.target.value}
                                    @keydown=${(e) => this.saveSessionName(e, session)}
                                    @blur=${(e) => this.saveSessionName(e, session)}
                                    @click=${e => e.stopPropagation()}>
                            ` : html`
                                <span class="session-title">${title}</span>
                                <div class="session-actions">
                                    <button class="icon-button" @click=${(e) => this.startEditing(e, session)}>
                                        <svg style="pointer-events: none;" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="icon-button danger" @click=${(e) => this.handleDeleteSession(e, session.sessionId)}>
                                        <svg style="pointer-events: none;" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            `}
                        </div>
                        
                        <div class="session-meta-row">
                            <span class="session-date">${this.formatDateMeta(session.createdAt)}</span>
                            <span class="session-count">${session.messageCount || 0} msgs</span>
                        </div>
                    </div>
                `})}
            </div>
        `;
    }

    renderConversationContent() {
        const history = this.selectedSession.conversationHistory || [];
        if (history.length === 0) return html`<div class="empty-state">No conversation data found.</div>`;

        return html`
            <div class="markdown-body" @click=${this.handleMarkdownClick}>
                ${history.map(turn => html`
                    ${turn.transcription ? html`
                        <div class="message-block">
                            <span class="message-label me">👤 ME:</span>
                            <div class="message-content" .innerHTML=${this.renderMarkdown(turn.transcription)}></div>
                        </div>
                    ` : ''}
                    ${turn.ai_response ? html`
                        <div class="message-block">
                            <span class="message-label ai">🤖 AI:</span>
                            <div class="message-content" .innerHTML=${this.renderMarkdown(turn.ai_response)}></div>
                        </div>
                    ` : ''}
                `)}
            </div>
        `;
    }

    render() {
        return html`
            <div class="history-container">
                ${this.renderSessionsList()}

                <div class="main-pane">
                    ${this.selectedSession ? html`
                        <div class="pane-header">
                            <h3 class="header-title">${this.selectedSession.customName || `Session ${new Date(this.selectedSession.createdAt).toLocaleDateString()}`}</h3>
                        </div>
                        
                        <div class="conversation-view">
                            ${this.renderConversationContent()}
                        </div>
                    ` : html`
                        <div class="empty-state">
                            <div style="font-size: 30px; margin-bottom: 10px; opacity: 0.3;">👈</div>
                            <h3 style="margin-top: 0; margin-bottom: 5px;">Select a session</h3>
                            <p style="font-size: 12px;">Choose a past session from the left sidebar to review it.</p>
                        </div>
                    `}
                </div>
            </div>

            ${this.modalImage ? html`
                <div class="image-modal" @click=${() => { this.modalImage = null; this.requestUpdate(); }}>
                    <img src=${this.modalImage} @click=${(e) => e.stopPropagation()} />
                </div>
            ` : ''}
        `;
    }
}
customElements.define('history-view', HistoryView);