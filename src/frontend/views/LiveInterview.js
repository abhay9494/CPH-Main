import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import '../components/ChatFeed.js';

export class LiveInterview extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: transparent; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        
        .split-container { display: flex; width: 100%; height: 100%; background: transparent; position: relative; gap: 10px; padding-bottom: 10px; }
        
        .pane {
            flex: 1; border-radius: 8px; overflow-y: auto; padding: 15px 10px; 
            background: var(--bg-secondary); transition: border-color 0.2s;
            display: flex; flex-direction: column;
            border: 1px solid var(--border-color);
        }
        .pane.hovered-code { border-color: #4285f4; }
        .pane.hovered-voice { border-color: #a142f4; }
        
        .pane-header {
            position: sticky; top: -15px; background: var(--bg-tertiary); backdrop-filter: blur(5px); 
            padding: 8px 10px; margin: -15px -10px 10px -10px; border-bottom: 1px solid var(--border-color); 
            z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0;
        }

        .header-title { font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .code-title { color: #4285f4; }
        .voice-title { color: #a142f4; }

        .header-controls { display: flex; gap: 8px; align-items: center; }
        
        .status-badge { font-size: 11px; }
        .count-badge { font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }
        
        .mic-btn {
            padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; transition: 0.2s; cursor: pointer !important;
        }
        .mic-btn.on { background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); }
        .mic-btn.off { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border: 1px solid rgba(241, 76, 76, 0.4); }

        .chat-feed-wrapper { flex: 1; overflow-y: auto; }
        
        /* Toast */
        .toast {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66;
            padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold;
            opacity: 0; transition: opacity 0.3s; z-index: 1000; pointer-events: none; text-transform: uppercase;
        }
        .toast.visible { opacity: 1; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;

    static properties = {
        codeChatHistory: { type: Array },
        voiceChatHistory: { type: Array },
        codeChatIndex: { type: Number },
        voiceChatIndex: { type: Number },
        paneHoverState: { type: String }, // 'code' or 'voice'
        isMicOn: { type: Boolean },
        tacThinkMode: { type: Boolean },
        toastMessage: { type: String }
    };

    constructor() {
        super();
        this.codeChatHistory = [];
        this.voiceChatHistory = [];
        this.codeChatIndex = 0;
        this.voiceChatIndex = 0;
        this.paneHoverState = 'code';
        this.isMicOn = false;
        this.tacThinkMode = false;
        this.toastMessage = '';
    }

    async connectedCallback() {
        super.connectedCallback();
        
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};
            if (prefs.tacThinkMode !== undefined) this.tacThinkMode = prefs.tacThinkMode;
        }

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            // 🟢 NEW: Unified routing handlers
            this.voiceNewHandler = (_, text) => {
                this.voiceChatHistory = [...this.voiceChatHistory, `🗣️ **Voice Input Detected**\n\n🤖 AI:\n${text}`];
                this.voiceChatIndex = this.voiceChatHistory.length - 1;
                this.requestUpdate();
                this.scrollToBottom('voice-feed');
            };
            
            this.voiceUpdateHandler = (_, text) => {
                if (this.voiceChatHistory.length > 0) {
                    const a = [...this.voiceChatHistory];
                    a[a.length - 1] = `🗣️ **Voice Input Detected**\n\n🤖 AI:\n${text}`;
                    this.voiceChatHistory = a;
                } else {
                    this.voiceChatHistory = [`🤖 AI:\n${text}`];
                    this.voiceChatIndex = 0;
                }
                this.requestUpdate();
                this.scrollToBottom('voice-feed');
            };

            this.codeNewHandler = (_, text) => {
                this.codeChatHistory = [...this.codeChatHistory, `📸 **Visual Input Detected**\n\n🤖 AI:\n${text}`];
                this.codeChatIndex = this.codeChatHistory.length - 1;
                this.requestUpdate();
                this.scrollToBottom('code-feed');
            };

            this.codeUpdateHandler = (_, text) => {
                if (this.codeChatHistory.length > 0) {
                    const a = [...this.codeChatHistory];
                    a[a.length - 1] = `📸 **Visual Input Detected**\n\n🤖 AI:\n${text}`;
                    this.codeChatHistory = a;
                } else {
                    this.codeChatHistory = [`🤖 AI:\n${text}`];
                    this.codeChatIndex = 0;
                }
                this.requestUpdate();
                this.scrollToBottom('code-feed');
            };

            this.micSyncHandler = (_, state) => {
                this.isMicOn = state;
                this.requestUpdate();
            };

            ipcRenderer.on('voice-new-message', this.voiceNewHandler);
            ipcRenderer.on('voice-update-message', this.voiceUpdateHandler);
            ipcRenderer.on('code-new-message', this.codeNewHandler);
            ipcRenderer.on('code-update-message', this.codeUpdateHandler);
            ipcRenderer.on('sync-mic-state', this.micSyncHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('voice-new-message', this.voiceNewHandler);
            ipcRenderer.removeListener('voice-update-message', this.voiceUpdateHandler);
            ipcRenderer.removeListener('code-new-message', this.codeNewHandler);
            ipcRenderer.removeListener('code-update-message', this.codeUpdateHandler);
            ipcRenderer.removeListener('sync-mic-state', this.micSyncHandler);
        }
    }

    scrollToBottom(feedId) {
        // Find the chat-feed component and scroll its internal container
        setTimeout(() => {
            const feed = this.shadowRoot.getElementById(feedId);
            if (feed && feed.shadowRoot) {
                const container = feed.shadowRoot.querySelector('.markdown-body');
                if (container) {
                    // Find the parent wrapper in THIS file and scroll it
                    const wrapper = this.shadowRoot.getElementById(feedId + '-wrapper');
                    if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
                }
            }
        }, 50);
    }

    showToast(msg) {
        this.toastMessage = msg;
        this.requestUpdate();
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toastMessage = ''; this.requestUpdate(); }, 2000);
    }

    async handleToggleMic() {
        this.showToast('🎙️ Toggling Mic...');
        if (window.require) {
            await window.require('electron').ipcRenderer.invoke('toggle-ai-mic', !this.isMicOn);
        }
    }

    render() {
        let leftContent = this.codeChatHistory.length > 0 ? this.codeChatHistory[this.codeChatIndex] : "🟢 **Code Engine Online**\nWaiting for captures...";
        let rightContent = this.voiceChatHistory.length > 0 ? this.voiceChatHistory[this.voiceChatIndex] : "🟢 **Voice Engine Online**\nListening to microphone feed...";

        return html`
            <div class="split-container">
                <div class="pane ${this.paneHoverState === 'code' ? 'hovered-code' : ''}" @mouseenter=${() => this.paneHoverState = 'code'}>
                    <div class="pane-header">
                        <span class="header-title code-title">💻 Code Brain</span>
                        <div class="header-controls">
                            <span class="status-badge" style="color: ${this.tacThinkMode ? '#f59e0b' : '#00cc66'};">${this.tacThinkMode ? '🧠 Think' : '⚡ Fast'}</span>
                            <span class="count-badge">${this.codeChatHistory.length ? `${this.codeChatIndex + 1}/${this.codeChatHistory.length}` : '0/0'}</span>
                        </div>
                    </div>
                    <div class="chat-feed-wrapper" id="code-feed-wrapper">
                        <chat-feed id="code-feed" .content=${leftContent}></chat-feed>
                    </div>
                </div>

                <div class="pane ${this.paneHoverState === 'voice' ? 'hovered-voice' : ''}" @mouseenter=${() => this.paneHoverState = 'voice'}>
                    <div class="pane-header">
                        <span class="header-title voice-title">🗣️ Voice Brain</span>
                        <div class="header-controls">
                            <button class="mic-btn ${this.isMicOn ? 'on' : 'off'}" @click=${this.handleToggleMic}>
                                🎙️ MIC: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                            <span class="status-badge" style="color: #00cc66;">⚡ Fast</span>
                            <span class="count-badge">${this.voiceChatHistory.length ? `${this.voiceChatIndex + 1}/${this.voiceChatHistory.length}` : '0/0'}</span>
                        </div>
                    </div>
                    <div class="chat-feed-wrapper" id="voice-feed-wrapper">
                        <chat-feed id="voice-feed" .content=${rightContent}></chat-feed>
                    </div>
                </div>

                <div class="toast ${this.toastMessage ? 'visible' : ''}">${this.toastMessage}</div>
            </div>
        `;
    }
}
customElements.define('live-interview', LiveInterview);