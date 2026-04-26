import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import '../components/ChatFeed.js';

export class Companion extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: transparent; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        
        .main-wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
        .chat-area { flex: 1; min-height: 0; height: auto; overflow-y: auto; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 10px; }
        
        .bottom-controls { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25); border-top: 1px dashed var(--border-color); flex-shrink: 0; border-radius: 8px; }
        .control-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }

        .action-btn { background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; white-space: nowrap; cursor: pointer !important; }
        .action-btn:hover { background: var(--hover-background); color: #fff; }
        .action-btn.success { background: rgba(0, 204, 102, 0.15); color: #00cc66; border-color: rgba(0, 204, 102, 0.4); }
        .action-btn.success:hover { background: rgba(0, 204, 102, 0.3); }
        .action-btn.danger { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border-color: rgba(241, 76, 76, 0.4); }
        .action-btn.danger:hover { background: rgba(241, 76, 76, 0.3); }

        .prompt-input { flex: 1; background: rgba(0,0,0,0.2); color: var(--text-color); border: 1px solid var(--border-color); padding: 10px 12px; border-radius: 4px; font-size: 13px; font-family: 'Inter', sans-serif; resize: none; outline: none; }
        .prompt-input:focus { border-color: #a142f4; background: rgba(0,0,0,0.4); }

        .nav-button { background: transparent; color: var(--text-secondary); border: none; padding: 6px; border-radius: 3px; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.1s ease; }
        .nav-button:hover { background: var(--hover-background); color: var(--text-color); }
        .nav-button:disabled { opacity: 0.3; }

        .center-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; }
        .card-box { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }

        .toast { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; opacity: 0; transition: opacity 0.3s; z-index: 1000; pointer-events: none; }
        .toast.visible { opacity: 1; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;

    static properties = {
        helperPinInput: { type: String },
        helperStatus: { type: String },
        handshakeName: { type: String },
        localChatHistory: { type: Array },
        localChatIndex: { type: Number },
        autoSyncMode: { type: Boolean },
        toastMessage: { type: String },
        hasReceivedCompanionProfile: { type: Boolean }
    };

    constructor() {
        super();
        this.helperPinInput = "";
        this.helperStatus = 'idle'; // 'idle', 'connecting', 'handshake', 'connected', 'error'
        this.handshakeName = null;
        this.localChatHistory = [];
        this.localChatIndex = -1;
        this.autoSyncMode = false;
        this.toastMessage = '';
        this.hasReceivedCompanionProfile = false;
        this.helperConn = null;
        this.pingInterval = null;
        this.missedPongs = 0;
    }

    showToast(msg) {
        this.toastMessage = msg;
        this.requestUpdate();
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toastMessage = ''; this.requestUpdate(); }, 2000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanupHelperConnection();
    }

    connectToCompanion() {
        if (!this.helperPinInput || this.helperPinInput.length !== 6) return;
        this.hasReceivedCompanionProfile = false;
        this.helperConn = null;
        this.helperStatus = 'connecting';
        this.requestUpdate();

        if (!window.Peer) { this.helperStatus = 'error'; return; }

        const myPeer = new window.Peer({ config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] } });
        
        myPeer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            this.helperStatus = 'error';
            this.requestUpdate();
        });

        myPeer.on('open', () => {
            const targetId = `cp-stealth-${this.helperPinInput}`;
            this.helperConn = myPeer.connect(targetId, { reliable: true });

            this.helperConn.on('open', () => {
                console.log("WebRTC Opened. Awaiting Handshake...");
            });

            this.helperConn.on('data', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'handshake') {
                        this.handshakeName = parsed.name;
                        this.helperStatus = 'handshake';
                        this.requestUpdate();
                    } else if (parsed.type === 'push_profile') {
                        if (!this.hasReceivedCompanionProfile) {
                            this.hasReceivedCompanionProfile = true;
                            const settings = parsed.settings || {};
                            const role = settings.role || 'Not specified';
                            const resume = settings.resume || 'Not provided';
                            
                            const profileMsg = `👤 **${this.handshakeName} sent their Profile Data:**\n\n\`\`\`text\nTARGET ROLE:\n${role}\n\nRESUME & EXPERIENCE:\n${resume}\n\`\`\``;
                            this.localChatHistory = [...this.localChatHistory, profileMsg];
                            this.localChatIndex = this.localChatHistory.length - 1;
                            this.requestUpdate();
                            this.scrollToBottom();
                        }
                    } else if (parsed.type === 'pong') {
                        this.missedPongs = 0; 
                    } else if (parsed.type === 'disconnect') {
                        this.cleanupHelperConnection();
                    } else if (parsed.type === 'companion_chat') {
                        const whisperHtml = `<div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-left: 3px solid #f59e0b; border-radius: 6px; margin: 10px 0;"><strong style="color: #f59e0b; text-transform: uppercase; font-size: 11px;">🤫 ${this.handshakeName} Whispered:</strong><br/><span style="color: #e5e5e5; font-size: 13px;">${parsed.message}</span></div>`;
                        this.localChatHistory = [...this.localChatHistory, whisperHtml];
                        this.localChatIndex = this.localChatHistory.length - 1;
                        this.requestUpdate();
                        this.scrollToBottom();
                    }
                } catch(e) {}
            });

            this.helperConn.on('close', () => this.cleanupHelperConnection());
            this.helperConn.on('error', () => { this.cleanupHelperConnection(); this.helperStatus = 'error'; this.requestUpdate(); });
        });

        setTimeout(() => {
            if (this.helperStatus === 'connecting') {
                this.helperStatus = 'error';
                this.requestUpdate();
                if (myPeer) myPeer.destroy();
            }
        }, 10000);
    }

    cleanupHelperConnection() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = null;
        this.missedPongs = 0;
        this.helperStatus = 'idle';
        this.handshakeName = null;
        this.hasReceivedCompanionProfile = false;
        if (this.helperConn) this.helperConn.close();
        this.helperConn = null;
        this.requestUpdate();
    }

    approveHandshake() {
        this.helperStatus = 'connected';
        this.requestUpdate();
        this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'approved' }));

        const currentContent = this.localChatHistory.length > 0 ? this.localChatHistory[this.localChatIndex] : "🟢 **Secure Link Established.**";
        this.transmitCleanPayload(currentContent);

        this.missedPongs = 0;
        this.pingInterval = setInterval(() => {
            if (this.missedPongs >= 2) {
                this.cleanupHelperConnection();
                return;
            }
            this.missedPongs++;
            if (this.helperConn && this.helperConn.open) {
                this.helperConn.send(JSON.stringify({ type: 'ping' }));
            }
        }, 3000);
    }

    rejectHandshake() {
        if (this.helperConn && this.helperConn.open) {
            this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'rejected' }));
            setTimeout(() => this.helperConn.close(), 500);
        }
        this.cleanupHelperConnection();
    }

    transmitCleanPayload(rawContent, isManualPush = false) {
        if (!this.helperConn || !this.helperConn.open || !rawContent) return;

        let cleanText = rawContent;
        if (cleanText.includes('🤖 AI:\n')) cleanText = cleanText.split('🤖 AI:\n')[1];
        else if (cleanText.includes('🤖 AI:')) cleanText = cleanText.split('🤖 AI:')[1];

        if (cleanText.includes('(Thinking...)') || cleanText.includes('(Solving...)') || cleanText.includes('(Refactoring...)')) {
            cleanText = "<p style='color: #888; font-style: italic;'>Generating solution...</p>";
        }

        const payload = {
            type: 'chat_update',
            content: cleanText,
            index: this.localChatIndex,
            total: this.localChatHistory.length
        };
        this.helperConn.send(JSON.stringify(payload));

        if (isManualPush && this.localChatHistory[this.localChatIndex] && !this.localChatHistory[this.localChatIndex].includes('✓ Beamed to Candidate')) {
            const badgeHtml = `<div style="display: block; margin-top: 15px;"><span style="background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">✓ Beamed to Candidate</span></div>`;
            const newHistory = [...this.localChatHistory];
            newHistory[this.localChatIndex] = newHistory[this.localChatIndex] + badgeHtml;
            this.localChatHistory = newHistory;
            this.showToast('🚀 Pushed to Screen');
            this.requestUpdate();
        }
    }

    handleWhisper() {
        const input = this.shadowRoot.querySelector('#whisperInput');
        if (input && input.value.trim() && this.helperConn && this.helperConn.open) {
            const msg = input.value.trim();
            this.helperConn.send(JSON.stringify({ type: 'whisper', message: msg }));
            
            const whisperHtml = `<div style="background: rgba(66, 133, 244, 0.1); padding: 12px; border-left: 3px solid #4285f4; border-radius: 6px; margin: 10px 0;"><strong style="color: #4285f4; text-transform: uppercase; font-size: 11px;">💬 Whisper Sent:</strong><br/><span style="color: #e5e5e5; font-size: 13px;">${msg}</span></div>`;
            this.localChatHistory = [...this.localChatHistory, whisperHtml];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            this.scrollToBottom();
            input.value = '';
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const area = this.shadowRoot.querySelector('.chat-area');
            if (area) area.scrollTop = area.scrollHeight;
        }, 50);
    }

    render() {
        if (this.helperStatus === 'handshake') {
            return html`
                <div class="center-screen">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: var(--text-color);">Incoming Link Request</div>
                        <div style="color: var(--text-muted); font-size: 13px;">Someone is trying to connect to your session.</div>
                    </div>
                    <div class="card-box" style="border-top: 4px solid #a142f4;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(161, 66, 244, 0.15); color: #a142f4; border: 1px solid rgba(161, 66, 244, 0.3); margin-bottom: 20px;">🛡️</div>
                        <span style="color: var(--text-muted); font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">User Verification</span>
                        <strong style="color: #a142f4; font-size: 24px; margin-bottom: 30px; text-align: center;">${this.handshakeName}</strong>
                        <div style="display: flex; gap: 12px; width: 100%;">
                            <button class="action-btn danger" style="flex: 1; padding: 12px;" @click=${this.rejectHandshake}>❌ Reject</button>
                            <button class="action-btn success" style="flex: 1; padding: 12px;" @click=${this.approveHandshake}>✅ Approve</button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.helperStatus !== 'connected') {
            return html`
                <div class="center-screen">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: var(--text-color);">Connect to Companion</div>
                        <div style="color: var(--text-muted); font-size: 13px;">Enter the 6-character PIN from your friend's screen.</div>
                    </div>
                    <div class="card-box" style="border-top: 4px solid #f59e0b;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 25px;">🤝</div>
                        <input class="prompt-input" style="width: 100%; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; background: rgba(245, 158, 11, 0.05); margin-bottom: 20px; text-transform: uppercase;" 
                               placeholder="------" maxlength="6" .value=${this.helperPinInput} 
                               @input=${(e) => { this.helperPinInput = e.target.value.toUpperCase(); this.requestUpdate(); }}>
                        <button class="action-btn" style="width: 100%; padding: 12px; background: ${this.helperPinInput.length === 6 ? '#f59e0b' : 'var(--bg-tertiary)'}; color: ${this.helperPinInput.length === 6 ? '#000' : 'var(--text-muted)'}; border: none;" @click=${this.connectToCompanion}>
                            ${this.helperStatus === 'connecting' ? 'Connecting...' : 'Establish Link'}
                        </button>
                        ${this.helperStatus === 'error' ? html`<div style="margin-top: 15px; padding: 10px; border-radius: 6px; background: rgba(241, 76, 76, 0.1); color: #f14c4c; font-size: 12px; font-weight: bold; width: 100%; text-align: center;">Connection failed. Check PIN.</div>` : ''}
                    </div>
                </div>
            `;
        }

        const content = this.localChatHistory.length > 0 && this.localChatIndex >= 0 ? this.localChatHistory[this.localChatIndex] : "🟢 **Secure Link Established.**";

        return html`
            <div class="main-wrapper">
                <div class="chat-area">
                    <chat-feed .content=${content}></chat-feed>
                </div>
                
                <div class="bottom-controls">
                    <div class="control-row">
                        <textarea id="whisperInput" class="prompt-input" rows="1" placeholder="Whisper to Friend... (Shift+Enter for newline)" 
                            @input=${function(e) { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }}
                            @keydown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleWhisper(); } }}></textarea>
                    </div>
                    <div class="control-row" style="justify-content: space-between;">
                        <div style="display: flex; gap: 8px;">
                            <button class="action-btn ${this.autoSyncMode ? 'success' : 'danger'}" @click=${() => { this.autoSyncMode = !this.autoSyncMode; this.requestUpdate(); }}>
                                ${this.autoSyncMode ? '📡 Auto-Sync: ON' : '🛡️ Auto-Sync: OFF'}
                            </button>
                            <button class="action-btn success" @click=${() => this.transmitCleanPayload(this.localChatHistory[this.localChatIndex], true)}>
                                🚀 PUSH TO SCREEN
                            </button>
                        </div>
                        <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color);">
                            <button class="nav-button" @click=${() => { if(this.localChatIndex > 0) { this.localChatIndex--; this.requestUpdate(); } }} ?disabled=${this.localChatIndex <= 0}>◀</button>
                            <span style="font-size: 11px; color: var(--text-color); font-family: monospace; padding: 0 8px; line-height: 24px;">${this.localChatHistory.length ? `${this.localChatIndex + 1}/${this.localChatHistory.length}` : '0/0'}</span>
                            <button class="nav-button" @click=${() => { if(this.localChatIndex < this.localChatHistory.length - 1) { this.localChatIndex++; this.requestUpdate(); } }} ?disabled=${this.localChatIndex >= this.localChatHistory.length - 1}>▶</button>
                        </div>
                    </div>
                </div>
                <div class="toast ${this.toastMessage ? 'visible' : ''}">${this.toastMessage}</div>
            </div>
        `;
    }
}
customElements.define('companion-view', Companion);