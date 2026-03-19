import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        /* Universal Scrollbar Styling */
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #444); }
        :host { height: 100%; display: flex; flex-direction: column; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default !important; }
        .response-container { height: calc(100% - 50px); overflow-y: auto; font-size: var(--response-font-size, 16px); line-height: 1.6; background: var(--bg-primary); padding: 12px; scroll-behavior: smooth; user-select: text; }
        .response-container * { user-select: text; }
        .response-container h1, .response-container h2, .response-container h3, .response-container h4, .response-container h5, .response-container h6 { margin: 1em 0 0.5em 0; color: var(--text-color); font-weight: 600; }
        .response-container p { margin: 0.6em 0; color: var(--text-color); }
        .response-container pre { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; padding: 12px; overflow-x: auto; margin: 0.8em 0; }
        .response-container::-webkit-scrollbar { width: 8px; }
        .response-container::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }

        .markdown-body { flex: 1; width: 100%; padding: 20px; padding-top: 15px; font-size: var(--response-font-size, 15px); line-height: 1.6; color: #d4d4d4; overflow-y: auto; overflow-x: hidden; word-wrap: break-word; font-family: 'Inter', sans-serif; }
        
        .code-block-wrapper { background: var(--bg-secondary); border: 1px solid var(--border-color, #333); border-radius: 6px; margin-bottom: 15px; overflow: hidden; position: relative; }
        .code-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 5px 10px; border-bottom: 1px solid var(--border-color, #333); }
        .lang-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: bold; }
        .copy-code-btn, .type-code-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 3px 8px; border-radius: 4px; font-size: 11px; transition: 0.2s; margin-left: 5px; }
        .copy-code-btn:hover, .type-code-btn:hover { background: var(--bg-hover); color: #fff; }
        .code-block-wrapper pre { margin: 0; padding: 15px; overflow-x: hidden; white-space: pre-wrap; word-wrap: break-word; }
        .code-block-wrapper pre code { background: transparent; padding: 0; border-radius: 0; white-space: pre-wrap; }
        
        .bottom-controls { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--bg-primary); border-top: 1px solid var(--border-color, #444); box-shadow: 0 -4px 20px rgba(0,0,0,0.5); }
        .control-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }

        .action-btn { background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: 0.2s; white-space: nowrap; }
        .action-btn:hover { background: var(--bg-hover); color: #fff; }
        .action-btn.primary { background: var(--bg-tertiary); color: white; border-color: var(--border-color, #555); }
        .action-btn.highlight { background: rgba(161, 66, 244, 0.2); color: #a142f4; border-color: #a142f4; }
        .action-btn.success { background: rgba(0, 204, 102, 0.2); color: #00cc66; border-color: #00cc66; }
        .action-btn.danger { background: rgba(255, 68, 68, 0.2); color: #ff4444; border-color: #ff4444; }

        input.prompt-input, textarea.prompt-input { flex: 1; background: var(--input-background); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 8px 12px; border-radius: 4px; font-size: 13px; font-family: 'Inter', sans-serif; }

        .custom-dropdown { position: relative; display: inline-block; }
        .dropdown-trigger { background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
        .dropdown-trigger:hover { background: var(--bg-hover); color: #fff; }
        .dropdown-menu { position: absolute; bottom: 100%; left: 0; background: var(--bg-primary); border: 1px solid var(--border-color, #444); border-radius: 4px; margin-bottom: 4px; min-width: 100%; z-index: 1000; display: flex; flex-direction: column; box-shadow: 0 -4px 15px rgba(0,0,0,0.8); max-height: 200px; overflow-y: auto; }
        .dropdown-option { padding: 8px 12px; font-size: 12px; color: var(--text-color); white-space: nowrap; }
        .dropdown-option:hover { background: var(--bg-hover); color: #fff; }
        .dropdown-option.selected { background: #4285f4; color: #fff; font-weight: bold; }
        .dropdown-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
        
        .nav-button { background: transparent; color: var(--text-secondary); border: none; padding: 6px; border-radius: 3px; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.1s ease; }
        .nav-button:hover { background: var(--hover-background); color: var(--text-color); }
        .nav-button:disabled { opacity: 0.3; }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        
        .format-toggles { display: flex; gap: 12px; align-items: center; justify-content: center; width: 100%; }
        .format-toggles label { font-size: 10px; color: var(--text-color); display: flex; align-items: center; gap: 4px; cursor: pointer !important; white-space: nowrap; font-weight: bold; }
        .format-toggles input[type="checkbox"] { width: 12px; height: 12px; margin: 0; cursor: pointer !important; accent-color: #a142f4; }


        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #444); }
    `;

    static properties = {
        t: { type: Number },
        localChatHistory: { type: Array }, 
        localChatIndex: { type: Number },
        capturedCount: { type: Number },
        currentProviderName: { type: String },
        isAiVisible: { type: Boolean },
        isSolving: { type: Boolean },
        isMicOn: { type: Boolean },
        lastUserPrompt: { type: String },
        tacThinkMode: { type: Boolean },
        tacBrief: { type: Boolean },
        tacBullets: { type: Boolean },
        tacStar: { type: Boolean },
        tacConversational: { type: Boolean },
        programmingLanguage: { type: String },
        customLanguage: { type: String },
        aiProfiles: { type: Array },
        currentProfileId: { type: String },
        hasResumeContext: { type: Boolean },
        activeDropdown: { type: String },
        fontSize: { type: Number },
        
        viewMode: { type: String }, 
        wpmSpeed: { type: Number },
        typingState: { type: String }, 
        typingCountdown: { type: Number },
        typerCodeLines: { type: Array },
        typerStartLine: { type: Number },
        typerEndLine: { type: Number },
        typingCurrentLineIndex: { type: Number },
        isHelpingMode: { type: Boolean },
        helperPinInput: { type: String },
        helperStatus: { type: String },
        handshakeName: { type: String },
        autoSyncMode: { type: Boolean },
        currentMode: { type: String },
        hasReceivedCompanionProfile: { type: Boolean },
    };

    constructor() {
        super();
        this.localChatHistory = []; this.localChatIndex = -1;
        this.capturedCount = 0;
        this.currentProviderName = 'ChatGPT'; 
        this.isAiVisible = false;
        this._isCurrentlyGhosting = false;
        this.isSolving = false;
        this.isMicOn = false;
        this.lastUserPrompt = "🎙️ Ready for Input...";
        this.tacThinkMode = false;
        this.tacBrief = true;
        this.tacBullets = false;
        this.tacStar = false;
        this.tacConversational = true;
        this.programmingLanguage = 'C++';
        this.customLanguage = '';
        this.hasResumeContext = false;
        this.activeDropdown = null;
        this.aiProfiles = [];
        this.fontSize = 13;

        this.viewMode = 'chat';
        this.wpmSpeed = 60;
        this.typingState = 'idle';
        this.typingCountdown = 0;
        this.typerCodeLines = [];
        this.typerStartLine = 0;
        this.typerEndLine = 0;
        this.typingCurrentLineIndex = 0;
        this.isHelpingMode = false;
        this.helperPinInput = "";
        this.helperStatus = 'idle'; // idle, connecting, connected
        this.helperConn = null;
        this.handshakeName = null;
        this.pingInterval = null;
        this.missedPongs = 0;
        this.autoSyncMode = false; // Default to Draft Mode (Vetting ON)
        this.hasReceivedCompanionProfile = false;
    }

    navigateToPreviousResponse() {
        if (this.localChatIndex > 0) { this.localChatIndex--; this.requestUpdate(); }
    }
    navigateToNextResponse() {
        if (this.localChatIndex < this.localChatHistory.length - 1) { this.localChatIndex++; this.requestUpdate(); }
    }
    changeFontSize(delta) {
        this.fontSize = Math.max(12, Math.min(28, this.fontSize + delta));
        this.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    connectedCallback() {
        super.connectedCallback();

        window.addEventListener('focus', () => this.requestUpdate());

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('sync-mic-state', (event, isListening) => {
                if (this.isMicOn !== isListening) { this.isMicOn = isListening; this.requestUpdate(); }
            });

            ipcRenderer.invoke('show-widget').then(() => this.syncWidgetState());

            window.cheatingDaddy.storage.getPreferences().then(async raw => {
                const prefs = raw?.data || raw || {}; 
                this.aiProfiles = prefs.aiProfiles || [];
                this.currentProfileId = prefs.lastProfileId || (this.aiProfiles.length > 0 ? this.aiProfiles[0].id : null);
                this.hasResumeContext = !!(prefs.customPrompt && prefs.customPrompt.trim().length > 0);
                
                if (this.currentProfileId) await ipcRenderer.invoke('switch-ai-profile', this.currentProfileId);
                if (prefs.tacThinkMode !== undefined) {
                    this.tacThinkMode = prefs.tacThinkMode;
                    ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', false);
                }
                if (prefs.lastAiEngine !== undefined) this.handleSetEngine(prefs.lastAiEngine, true);
                else this.handleSetEngine(0, true); 

                if (this.currentMode === 'interview' || this.currentMode === 'companion') {
                    this.programmingLanguage = 'Auto / Text';
                } else if (prefs.programmingLanguage) {
                    this.programmingLanguage = prefs.programmingLanguage;
                } else {
                    this.programmingLanguage = 'C++';
                }
                this.requestUpdate();
            });
            
            this.widgetListener = (event, action) => {
                if (action === 'capture') this.handleCaptureScreenshot();
                if (action === 'clear') this.handleClearScreenshots();
                if (action === 'send') this.handleSendToAI();
            };
            ipcRenderer.on('execute-widget-action', this.widgetListener);

            ipcRenderer.invoke('check-active-ai').then(aiInfo => {
                if (aiInfo && aiInfo.name) { this.currentProviderName = aiInfo.name; this.requestUpdate(); }
            });

            this.handlePreviousResponse = () => this.navigateToPreviousResponse();
            this.handleNextResponse = () => this.navigateToNextResponse();
            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);

            ipcRenderer.on('ai-window-hidden', () => {
                this.isAiVisible = false;
                this.lastHiddenTime = Date.now(); 
                this.requestUpdate();
            });

            this.handleAppMadeVisible = () => {
                ipcRenderer.invoke('show-widget').then(() => this.syncWidgetState());
                
                // 🟢 FIX: Local Phantom Mutator (Forces GPU Repaint of the chat)
                const container = this.shadowRoot.querySelector('.markdown-body');
                if (container) {
                    container.style.opacity = '0.99';
                    setTimeout(() => { container.style.opacity = '1'; }, 20);
                }
                this.requestUpdate();
            };
            ipcRenderer.on('app-made-visible', this.handleAppMadeVisible);

            // 🟢 LIVE HIGHLIGHTER LISTENER
            ipcRenderer.on('typing-progress', (event, lineIdx) => {
                this.typingCurrentLineIndex = lineIdx;
                this.requestUpdate();
                setTimeout(() => {
                    const container = this.shadowRoot.querySelector('.typer-code-container');
                    const lineEl = this.shadowRoot.querySelector('#typer-line-' + (this.typerStartLine + lineIdx));
                    if (container && lineEl) {
                        const offset = lineEl.offsetTop - container.offsetTop - (container.clientHeight / 2) + 20;
                        container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                    }
                }, 50);
            });

            ipcRenderer.on('typing-status', (event, status) => {
                if (!status) { 
                    this.typingState = 'idle'; 
                    this.requestUpdate(); 
                }
            });

            // 🟢 Allow AppHeader to cancel the Typer View 
            this.cancelTyperHandler = () => {
                if (this.typingState === 'idle') {
                    this.viewMode = 'chat';
                    window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: false }));
                    this.requestUpdate();
                }
            };
            window.addEventListener('cancel-typer-mode', this.cancelTyperHandler);

            this.helpModeHandler = (e) => {
                this.isHelpingMode = e.detail;
                if (!e.detail) {
                    if (this.helperConn) this.helperConn.close();
                    this.cleanupHelperConnection();
                }
                this.requestUpdate();
            };
            window.addEventListener('help-mode-toggled', this.helpModeHandler);

            this.syncTypingState = (e) => {
                if (e.detail.state === 'idle' && this.typingState === 'countdown') clearTimeout(this.typeTimer);
                this.typingState = e.detail.state;
                this.requestUpdate();
            };
            window.addEventListener('typing-state-changed', this.syncTypingState);

            ipcRenderer.on('ai-new-message', (event, text) => {
                if (this.localChatHistory.length > 0) {
                    const currentContent = this.localChatHistory[this.localChatHistory.length - 1];
                    if (currentContent.includes('🤖 AI: (Thinking...)') || currentContent.includes('🤖 AI: (Solving...)')) {
                        const newArray = [...this.localChatHistory];
                        newArray[newArray.length - 1] = `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`;
                        this.localChatHistory = newArray;
                    } else {
                        this.lastUserPrompt = "🎙️ Voice/Scraped Interaction";
                        this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`];
                        this.localChatIndex = this.localChatHistory.length - 1;
                    }
                } else {
                    this.localChatHistory = [`${this.lastUserPrompt}\n\n🤖 AI:\n${text}`];
                    this.localChatIndex = 0;
                }
                
                this.requestUpdate(); 
                if (this.localChatHistory.length > 0 && this.autoSyncMode) {
                    this.transmitCleanPayload(this.localChatHistory[this.localChatHistory.length - 1]);
                }
            });

            ipcRenderer.on('ai-update-message', (event, text) => {
                if (this.localChatHistory.length > 0) {
                    const a = [...this.localChatHistory];
                    a[a.length - 1] = `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`;
                    this.localChatHistory = a;
                    
                    this.requestUpdate();
                    
                    if (this.autoSyncMode) {
                        this.transmitCleanPayload(this.localChatHistory[this.localChatHistory.length - 1]);
                    }
                }
            });
        }
        if (window.cheatingDaddy) {
            window.cheatingDaddy.handleShortcut = (key) => {
                if (key === 'ctrl+enter' || key === 'cmd+enter') this.handleCaptureScreenshot();
            };
        }
        this.brainSyncInterval = setInterval(() => { this.syncBrainModeWithBrowser(); }, 3000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.brainSyncInterval) clearInterval(this.brainSyncInterval);
        window.removeEventListener('cancel-typer-mode', this.cancelTyperHandler);
        window.removeEventListener('typing-state-changed', this.syncTypingState);
        window.removeEventListener('help-mode-toggled', this.helpModeHandler);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('ai-new-message');
            ipcRenderer.removeAllListeners('ai-update-message');
            ipcRenderer.removeAllListeners('typing-status');
            ipcRenderer.removeAllListeners('typing-progress');
            ipcRenderer.removeListener('execute-widget-action', this.widgetListener);
        }
    }

    connectToCompanion() {
        if (!this.helperPinInput || this.helperPinInput.length !== 6) return;
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

            // 🟢 CATCH THE HANDSHAKE, PONGS, DISCONNECTS & PROFILE PUSHES
            this.helperConn.on('data', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'handshake') {
                        this.handshakeName = parsed.name;
                        this.helperStatus = 'handshake';
                        this.requestUpdate();
                        
                        // 🟢 FIXED: Tell Electron to pop open the Companion Chat Window immediately!
                        if (window.require) {
                            window.require('electron').ipcRenderer.send('open-companion-window', { name: this.handshakeName });
                        }
                    } else if (parsed.type === 'push_profile') {
                        // 🟢 NEW: Copiable Chat Block (Once per session)
                        if (!this.hasReceivedCompanionProfile) {
                            this.hasReceivedCompanionProfile = true;
                            
                            const settings = parsed.settings || {};
                            const role = settings.role || 'Not specified';
                            const resume = settings.resume || 'Not provided';
                            
                            // Wrapping in ```text creates a beautiful copiable block!
                            const profileMsg = `👤 **${this.handshakeName} sent their Profile Data:**\n\n\`\`\`text\nTARGET ROLE:\n${role}\n\nRESUME & EXPERIENCE:\n${resume}\n\`\`\``;
                            
                            this.localChatHistory = [...this.localChatHistory, profileMsg];
                            this.localChatIndex = this.localChatHistory.length - 1;
                            this.requestUpdate();
                        }
                    } else if (parsed.type === 'pong') {
                        this.missedPongs = 0; 
                    } else if (parsed.type === 'disconnect') {
                        console.warn("Companion initiated disconnect.");
                        this.cleanupHelperConnection();
                    } else if (parsed.type === 'companion_chat') {
                        if (window.require) {
                            window.require('electron').ipcRenderer.send('relay-companion-chat', { name: this.handshakeName, message: parsed.message });
                        }
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
        this.hasReceivedCompanionProfile = false; // 🟢 Reset for next session
        this.helperConn = null;
        window.dispatchEvent(new CustomEvent('helper-status-changed', { detail: 'disconnected' }));
        this.requestUpdate();
    }

    // 🟢 NEW: Approve Handshake & Start Heartbeat
    approveHandshake() {
        this.helperStatus = 'connected';
        this.requestUpdate();
        window.dispatchEvent(new CustomEvent('helper-status-changed', { detail: 'connected' }));

        this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'approved' }));

        // Send Initial Screen
        const currentContent = this.localChatHistory.length > 0 ? this.localChatHistory[this.localChatIndex] : "🟢 **Secure Link Established.**";
        this.transmitCleanPayload(currentContent);

        // Start Ping/Pong Heartbeat
        this.missedPongs = 0;
        this.pingInterval = setInterval(() => {
            if (this.missedPongs >= 2) {
                console.warn("Heartbeat flatlined. Dropping connection.");
                if (this.helperConn) this.helperConn.close();
                this.cleanupHelperConnection();
                return;
            }
            this.missedPongs++;
            if (this.helperConn && this.helperConn.open) {
                this.helperConn.send(JSON.stringify({ type: 'ping' }));
            }
        }, 3000);
    }

    // 🟢 NEW: Reject Handshake
    rejectHandshake() {
        if (this.helperConn && this.helperConn.open) {
            this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'rejected' }));
            setTimeout(() => this.helperConn.close(), 500);
        }
        this.cleanupHelperConnection();
    }

    transmitCleanPayload(rawContent) {
        if (!this.helperConn || !this.helperConn.open) return;

        let cleanText = rawContent;
        if (cleanText.includes('🤖 AI:\n')) cleanText = cleanText.split('🤖 AI:\n')[1];
        else if (cleanText.includes('🤖 AI:')) cleanText = cleanText.split('🤖 AI:')[1];

        if (cleanText.includes('(Thinking...)') || cleanText.includes('(Solving...)') || cleanText.includes('(Refactoring...)')) {
            cleanText = "<p style='color: #888; font-style: italic;'>Generating solution...</p>";
        }

        // 🟢 SEND STRUCTURED JSON
        const payload = {
            type: 'chat_update',
            content: cleanText,
            index: this.localChatIndex,
            total: this.localChatHistory.length
        };
        this.helperConn.send(JSON.stringify(payload));
    }

    async syncWidgetState() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};
            ipcRenderer.invoke('sync-widget', { count: this.capturedCount, transparency: prefs.backgroundTransparency ?? 0.8 });
        }
    }

    async syncBrainModeWithBrowser() {
        if (!window.require || this.isSwitchingMode) return; 
        const { ipcRenderer } = window.require('electron');
        const realBrowserMode = await ipcRenderer.invoke('get-current-ai-mode');
        
        if (realBrowserMode === 'think' && !this.tacThinkMode) {
            this.tacThinkMode = true; this.requestUpdate();
        } else if (realBrowserMode === 'fast' && this.tacThinkMode) {
            this.tacThinkMode = false; this.requestUpdate();
        }
    }

    async handleCaptureScreenshot() {
        if (!this.validateSetup()) return;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.capturedCount = await ipcRenderer.invoke('capture-screenshot');
            this.syncWidgetState();
            this.requestUpdate();
        }
    }

    async handleProfileChange(e) {
        const targetId = e.target.value;
        if (!targetId || targetId === "none") return;
        this.currentProfileId = targetId;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('switch-ai-profile', targetId);
            await window.cheatingDaddy.storage.updatePreference('lastProfileId', targetId);
            this.requestUpdate();
        }
    }

    async handleLanguageChange(e) {
        this.programmingLanguage = e.target.value;
        if (this.programmingLanguage !== 'Custom') {
            await window.cheatingDaddy.storage.updatePreference('programmingLanguage', this.programmingLanguage);
        }
        this.requestUpdate();
    }

    getFinalLanguage() {
        return this.programmingLanguage === 'Custom' ? (this.customLanguage || 'Python') : this.programmingLanguage;
    }

    async handleToggleAiVisibility() {
        if (Date.now() - this.lastHiddenTime < 500) return;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.isAiVisible = await ipcRenderer.invoke('toggle-ai-visibility', !this.isAiVisible);
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
                                <div>
                                    <button class="type-code-btn" data-code="${encodedCode}">⌨️ Type</button>
                                    <button class="copy-code-btn" data-code="${encodedCode}">📋 Copy</button>
                                </div>
                            </div>
                            <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
                        </div>`;
                };

                if (typeof window.marked.parse === 'function') return window.marked.parse(text, { renderer: renderer, breaks: true });
                else { window.marked.setOptions({ renderer: renderer, breaks: true }); return window.marked(text); }
            } catch (e) {}
        }
        return `<pre style="white-space: pre-wrap;">${text}</pre>`; 
    }

    handleMarkdownClick(e) {
        if (e.target.classList.contains('copy-code-btn')) {
            const code = decodeURIComponent(e.target.getAttribute('data-code'));
            if (window.require) window.require('electron').clipboard.writeText(code);
            e.target.innerText = '✅ Copied!';
            setTimeout(() => { e.target.innerText = '📋 Copy'; }, 2000);
        }

        if (e.target.classList.contains('type-code-btn')) {
            const rawCode = decodeURIComponent(e.target.getAttribute('data-code'));
            this.typerCodeLines = rawCode.split('\n');
            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') {
                this.typerCodeLines.pop(); 
            }
            this.typerStartLine = 0;
            this.typerEndLine = this.typerCodeLines.length - 1;
            this.typingCurrentLineIndex = 0;
            
            // 🟢 Signal to morph layout
            this.viewMode = 'typer';
            window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: true }));
            this.requestUpdate();
        }
    }

    handleLineClick(index) {
        if (this.typingState !== 'idle') return; 

        const distToStart = Math.abs(index - this.typerStartLine);
        const distToEnd = Math.abs(index - this.typerEndLine);
        
        if (distToStart <= distToEnd) {
            this.typerStartLine = index;
        } else {
            this.typerEndLine = index;
        }
        
        if (this.typerStartLine > this.typerEndLine) {
            const temp = this.typerStartLine;
            this.typerStartLine = this.typerEndLine;
            this.typerEndLine = temp;
        }
        this.requestUpdate();
    }

    startTyperCountdown() {
        if (!window.require || this.typingState !== 'idle') return;
        
        this.typingState = 'countdown';
        this.typingCountdown = 5;
        this.typingCurrentLineIndex = 0;
        window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'countdown', count: 5 } }));
        this.requestUpdate();
        
        const tick = () => {
            if (this.typingState !== 'countdown') return; 
            this.typingCountdown--;
            window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'countdown', count: this.typingCountdown } }));
            this.requestUpdate();
            
            if (this.typingCountdown > 0) {
                this.typeTimer = setTimeout(tick, 1000);
            } else {
                this.typingState = 'typing';
                window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'typing' } }));
                this.requestUpdate();
                const payloadCode = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
                window.require('electron').ipcRenderer.send('start-auto-type', payloadCode, this.wpmSpeed);
            }
        };
        this.typeTimer = setTimeout(tick, 1000);
    }

    handleStopTyping() {
        if (window.require) {
            window.require('electron').ipcRenderer.send('stop-auto-type');
        }
        clearTimeout(this.typeTimer);
        this.typingState = 'idle';
        window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'idle' } }));
        this.requestUpdate();
    }

    validateSetup() {
        const missingAccount = !this.aiProfiles || this.aiProfiles.length === 0;
        const missingContext = !this.hasResumeContext;
        if (missingAccount || missingContext) {
            this.isSolving = false; this.requestUpdate(); return false;
        }
        return true;
    }

    async handleSendManualText() {
        const input = this.shadowRoot.querySelector('#manualPromptInput');
        if (input && input.value.trim() && window.require) {
            if (!this.validateSetup()) return;
            const rawText = input.value.trim();
            const { ipcRenderer } = window.require('electron');
            
            // 🟢 FIX: Skip forcing code constraints on Conversational prompts
            const lang = this.getFinalLanguage();
            let payload = rawText;
            if (lang !== 'Auto / Text') {
                payload += `\n\n[Format solution in ${lang}]`;
            }
            
            await ipcRenderer.invoke('send-manual-text', payload);
            this.lastUserPrompt = `👤 You: ${rawText}`; 
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Thinking...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            input.value = ''; this.requestUpdate();
        }
    }

    handleWhisper() {
        const input = this.shadowRoot.querySelector('#whisperInput');
        if (input && input.value.trim() && this.helperConn && this.helperConn.open) {
            const msg = input.value.trim();
            // Beam to Companion
            this.helperConn.send(JSON.stringify({ type: 'whisper', message: msg }));
            
            // Show in your own floating Chat window so you know it sent
            if (window.require) {
                 window.require('electron').ipcRenderer.send('relay-companion-chat', { name: "You (Whisper)", message: msg });
            }
            input.value = '';
        }
    }

    async handleClearScreenshots() {
        if (window.require) {
            this.capturedCount = await window.require('electron').ipcRenderer.invoke('clear-screenshots');
            this.syncWidgetState(); this.requestUpdate();
        }
    }

    async handleSendToAI() {
        if (this.capturedCount === 0 || this.isSolving) return;
        if (!this.validateSetup()) return;
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.isSolving = true;
            const imgCount = this.capturedCount;
            this.capturedCount = 0;
            
            this.lastUserPrompt = `📸 Uploaded ${imgCount} Screenshot(s) & Triggered AI`;
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Solving...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();

            await ipcRenderer.invoke('send-oa-automation', this.getFinalLanguage());

            this.isSolving = false;
            this.syncWidgetState(); this.requestUpdate();
        }
    }

    async handleRefactor() {
        if (!this.validateSetup()) return;
        if (window.require) {
            this.lastUserPrompt = "🛠️ Triggered Code Refactoring";
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Refactoring...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            await window.require('electron').ipcRenderer.invoke('send-oa-refactor');
        }
    }

    async handleSendProfileContext() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};
            
            if (!prefs.customPrompt || prefs.customPrompt.trim().length === 0) return;
            
            let payload = `[SYSTEM DIRECTIVE: Act as an expert candidate interviewing for the role of "${prefs.interviewRole || 'Candidate'}".]\n`;
            payload += `[CRITICAL RULE 1: You are the candidate. ALWAYS use FIRST-PERSON pronouns ("I", "my", "we"). NEVER refer to the candidate in the third person.]\n`;
            payload += `[CANDIDATE BACKGROUND/RESUME DATA:\n${prefs.customPrompt}]\n\n`;
            payload += `Please acknowledge that you have received this resume and are ready for the interview. Keep it brief.`;

            this.lastUserPrompt = "📄 Sent Resume/Profile Context to AI";
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Ingesting context...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();

            await ipcRenderer.invoke('send-manual-text', payload);
        }
    }

    async handleSetEngine(index, isBoot = false) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.currentProviderName = await ipcRenderer.invoke('set-ai-provider', index);
            await window.cheatingDaddy.storage.updatePreference('lastAiEngine', index);
            await ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', false);
            this.requestUpdate();
        }
    }

    async handleNewChat() {
        if (window.require) {
            this.isMicOn = false; 
            this.lastUserPrompt = "✨ Fresh Chat Context Started";
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Ready for new input...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            await window.require('electron').ipcRenderer.invoke('new-chat');
        }
    }

    async handleToggleMic() {
        if (!this.validateSetup()) return;
        this.isMicOn = !this.isMicOn;
        if (window.require) await window.require('electron').ipcRenderer.invoke('toggle-ai-mic', this.isMicOn);
        this.requestUpdate();
    }

    setGhostMode(ignore) {
        if (this._isCurrentlyGhosting === ignore) return;
        this._isCurrentlyGhosting = ignore;
        if (window.require) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', ignore);
    }

    toggleDropdown(name) { this.activeDropdown = this.activeDropdown === name ? null : name; this.requestUpdate(); }
    closeDropdown() { this.activeDropdown = null; this.requestUpdate(); }

    renderEngineSelector() {
        const engines = { 0: '🤖 ChatGPT', 1: '🤖 Gemini', 2: '🐺 Grok' };
        const currentEngineIdx = this.currentProviderName === 'Gemini' ? 1 : (this.currentProviderName === 'Grok' ? 2 : 0);
        return html`
            <div class="custom-dropdown">
                <div class="dropdown-trigger" @click=${() => this.toggleDropdown('engine')}>${engines[currentEngineIdx]}</div>
                ${this.activeDropdown === 'engine' ? html`
                    <div class="dropdown-menu">
                        ${Object.entries(engines).map(([id, label]) => html`
                            <div class="dropdown-option ${parseInt(id) === currentEngineIdx ? 'selected' : ''}" 
                                 @click=${() => { this.handleSetEngine(parseInt(id)); this.closeDropdown(); }}>${label}</div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderLanguageSelector() {
        const languages = ['Auto / Text', 'C++', 'Python', 'Java', 'JavaScript', 'Custom'];
        return html`
            <div style="display: flex; gap: 4px; align-items: center;">
                <div class="custom-dropdown">
                    <div class="dropdown-trigger" @click=${() => this.toggleDropdown('language')}>💻 ${this.programmingLanguage === 'Custom' ? 'Custom...' : this.programmingLanguage}</div>
                    ${this.activeDropdown === 'language' ? html`
                        <div class="dropdown-menu">
                            ${languages.map(lang => html`
                                <div class="dropdown-option ${this.programmingLanguage === lang ? 'selected' : ''}" 
                                     @click=${() => { this.handleLanguageChange({target: {value: lang}}); this.closeDropdown(); }}>${lang === 'Custom' ? '✏️ Custom...' : `💻 ${lang}`}</div>
                            `)}
                        </div>
                    ` : ''}
                </div>
                ${this.programmingLanguage === 'Custom' ? html`<input type="text" class="prompt-input" style="width: 80px; padding: 4px 8px;" placeholder="Language" .value=${this.customLanguage} @input=${e => this.customLanguage = e.target.value}>` : ''}
            </div>
        `;
    }

    renderProfileSelector() {
        let currentAiIdx = 0;
        if (this.currentProviderName === 'Gemini') currentAiIdx = 1;
        if (this.currentProviderName === 'Grok') currentAiIdx = 2;
        const availableProfiles = (this.aiProfiles || []).filter(p => p.loggedAIs && p.loggedAIs.includes(currentAiIdx));
        if (availableProfiles.length === 0) return html`<div class="custom-dropdown"><div class="dropdown-trigger" style="border-color: #f14c4c; color: #f14c4c;">⚠️ No Login Found</div></div>`;
        const currentProfile = availableProfiles.find(p => p.id === this.currentProfileId) || availableProfiles[0];
        return html`
            <div class="custom-dropdown">
                <div class="dropdown-trigger" @click=${() => this.toggleDropdown('profile')}>👤 ${currentProfile ? currentProfile.name : 'Select'}</div>
                ${this.activeDropdown === 'profile' ? html`
                    <div class="dropdown-menu">
                        ${availableProfiles.map(p => html`
                            <div class="dropdown-option ${this.currentProfileId === p.id ? 'selected' : ''}" 
                                 @click=${() => { this.handleProfileChange({target: {value: p.id}}); this.closeDropdown(); }}>👤 ${p.name}</div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 🎯 THE NEW CLEAN SNIPER VIEW
    renderTyperMode() {
        return html`
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg-primary);">
                
                <div style="padding: 12px 16px;">
                    <div style="background: rgba(161, 66, 244, 0.15); border: 1px solid rgba(161, 66, 244, 0.5); padding: 10px 14px; border-radius: 6px; color: var(--text-color); font-size: 13px; line-height: 1.5;">
                        <strong style="color: #a142f4;">Select Range to Type.</strong> Area in purple will be written as it is.<br/>
                        <span style="color: #f14c4c; font-weight: bold; font-size: 12px;">[Note: Auto Typer can make mistakes, Recheck Yourself before submitting]</span>
                    </div>
                </div>
                
                <div class="typer-code-container" style="flex: 1; overflow-y: auto; padding: 0 16px 20px 16px; font-family: 'SF Mono', Consolas, monospace; font-size: var(--response-font-size, 13px); line-height: 1.6; color: var(--text-color);">
                    ${this.typerCodeLines.map((line, idx) => {
                        const isHighlighted = idx >= this.typerStartLine && idx <= this.typerEndLine;
                        
                        // 🟢 LIVE HIGHLIGHTER CSS INJECTION
                        const isCurrentTypingLine = (this.typingState === 'typing') && isHighlighted && (idx === this.typerStartLine + this.typingCurrentLineIndex);
                        
                        let bgStyle = 'transparent';
                        let borderStyle = '1px solid transparent';
                        let textColor = 'var(--text-color)';
                        let numColor = '#666';

                        if (isCurrentTypingLine) {
                            bgStyle = 'rgba(0, 204, 102, 0.25)'; 
                            borderStyle = '1px solid #00cc66';
                            textColor = '#fff';
                            numColor = '#00cc66';
                        } else if (isHighlighted) {
                            bgStyle = 'rgba(161, 66, 244, 0.2)'; 
                            borderStyle = '1px solid rgba(161, 66, 244, 0.3)';
                            textColor = 'var(--text-color)';
                            numColor = '#a142f4';
                        }

                        return html`
                            <div id="typer-line-${idx}" style="display: flex; cursor: pointer; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; transition: 0.2s; background: ${bgStyle}; border: ${borderStyle}; color: ${textColor};" 
                                 @click=${() => this.handleLineClick(idx)}>
                                <div style="width: 40px; min-width: 40px; text-align: right; padding-right: 12px; font-weight: bold; color: ${numColor}; user-select: none;">${idx + 1}</div>
                                <div style="white-space: pre-wrap; word-wrap: break-word; flex: 1;">${line || ' '}</div>
                            </div>
                        `;
                    })}
                </div>
                
                <div class="bottom-controls" style="padding: 12px; border-top: 1px solid #444;">
                    <div class="control-row">
                        <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-secondary); padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color);">
                            <span style="font-size: 11px; color: var(--text-color); font-weight: bold;">Speed: ${this.wpmSpeed}</span>
                            <input type="range" min="10" max="180" step="10" .value=${this.wpmSpeed} @input=${(e) => { this.wpmSpeed = parseInt(e.target.value); this.requestUpdate(); }} style="width: 80px; accent-color: #a142f4; background: transparent;">
                        </div>
                        
                        ${this.typingState === 'idle' ? html`
                            <button class="action-btn success" @click=${this.startTyperCountdown}>
                                ▶ Start Typing
                            </button>
                        ` : html`
                            <button class="action-btn danger" style="animation: pulse 1s infinite;" @click=${this.handleStopTyping}>
                                ${this.typingState === 'countdown' ? `⏳ Starts in ${this.typingCountdown}s...` : '🛑 Stop Typing'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderHelpingMode() {
        // 🟢 SHOW NAME APPROVAL SCREEN
        if (this.helperStatus === 'handshake') {
            return html`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: var(--bg-primary);">
                    <div style="font-size: 45px; margin-bottom: 10px;">🛡️</div>
                    <h2 style="color: var(--text-color); margin: 0 0 5px 0;">Incoming Link Request</h2>
                    <p style="color: #888; font-size: 13px; margin-bottom: 20px;">Someone is trying to connect to your session.</p>
                    
                    <div style="background: rgba(161, 66, 244, 0.1); border: 1px solid rgba(161, 66, 244, 0.4); padding: 15px 30px; border-radius: 6px; margin-bottom: 25px;">
                        <span style="color: #888; font-size: 12px; display: block; text-align: center; margin-bottom: 5px;">USER VERIFICATION:</span>
                        <strong style="color: #a142f4; font-size: 24px; letter-spacing: 2px;">${this.handshakeName}</strong>
                    </div>

                    <div style="display: flex; gap: 15px;">
                        <button class="action-btn danger" style="padding: 10px 20px;" @click=${this.rejectHandshake}>❌ Reject</button>
                        <button class="action-btn success" style="padding: 10px 20px;" @click=${this.approveHandshake}>✅ Approve</button>
                    </div>
                </div>
            `;
        }

        // Default PIN Entry Screen
        return html`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: var(--bg-primary);">
                <div style="font-size: 45px; margin-bottom: 15px;">🤝</div>
                <h2 style="color: var(--text-color); margin: 0 0 10px 0;">Connect to Companion</h2>
                <p style="color: #888; font-size: 13px; margin-bottom: 25px; text-align: center;">Enter the 6-character code from your friend's screen.</p>
                
                <input class="prompt-input" style="width: 250px; text-align: center; font-size: 24px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 20px; padding: 15px;" 
                       placeholder="------" maxlength="6" 
                       .value=${this.helperPinInput} 
                       @input=${(e) => { this.helperPinInput = e.target.value.toUpperCase(); this.requestUpdate(); }}>
                
                <button class="action-btn success" style="padding: 10px 30px; font-size: 14px;" @click=${this.connectToCompanion}>
                    ${this.helperStatus === 'connecting' ? 'Connecting...' : 'Establish Link'}
                </button>
                
                ${this.helperStatus === 'error' ? html`<p style="color: #f14c4c; margin-top: 15px; font-size: 12px; font-weight: bold;">Connection failed. Check code.</p>` : ''}
            </div>
        `;
    }

    render() {
        if (this.viewMode === 'typer') return this.renderTyperMode();
        if (this.isHelpingMode && this.helperStatus !== 'connected') return this.renderHelpingMode();

        let m = "🟢 **System Online. Awaiting inputs...**";
        if (!this.aiProfiles || this.aiProfiles.length === 0) m = "⚠️ **SYSTEM WARNING: No AI Accounts**\n\nPlease go to **Settings > Accounts** to log in to at least one AI provider.";
        
        const c = this.localChatHistory.length > 0 && this.localChatIndex >= 0 ? this.localChatHistory[this.localChatIndex] : m;

        return html`
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg-primary);">
                ${this.activeDropdown ? html`<div class="dropdown-backdrop" @click=${this.closeDropdown}></div>` : ''}
                <div class="markdown-body" @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(c)}></div>
                <div class="bottom-controls" @mousemove=${() => this.setGhostMode(false)}>                    
                    
                    <div class="control-row" style="display: flex; gap: 8px; width: 100%; align-items: flex-end;">
                        <textarea id="manualPromptInput" class="prompt-input" rows="1" placeholder="Ask AI a follow-up... (Shift+Enter for newline)" 
                                  @input=${function(e) { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }}
                                  @keydown=${(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          this.handleSendManualText();
                                          setTimeout(() => {
                                              const ta = this.shadowRoot.querySelector('#manualPromptInput');
                                              if(ta) ta.style.height = 'auto';
                                          }, 10);
                                      }
                                  }} style="flex: 1; resize: none; overflow: hidden; min-height: 38px; padding-top: 10px; font-family: inherit; font-size: 13px;"></textarea>
                        
                        ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                            <textarea id="whisperInput" class="prompt-input" rows="1" placeholder="Whisper to Friend... (Shift+Enter for newline)" 
                                      @input=${function(e) { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }}
                                      @keydown=${(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              this.handleWhisper();
                                              setTimeout(() => {
                                                  const ta = this.shadowRoot.querySelector('#whisperInput');
                                                  if(ta) ta.style.height = 'auto';
                                              }, 10);
                                          }
                                      }} style="flex: 1; border-color: #a142f4; resize: none; overflow: hidden; min-height: 38px; padding-top: 10px; font-family: inherit; font-size: 13px;"></textarea>
                        ` : ''}

                        <button class="action-btn ${this.isAiVisible ? 'danger' : ''}" @click=${this.handleToggleAiVisibility} style="flex-shrink: 0;">
                            ${this.isAiVisible ? '👻 Hide AI' : '👁️ Show AI'}
                        </button>
                    </div>

                    ${this.currentMode === 'interview' ? html`
                        <div class="control-row">
                            <button class="action-btn" @click=${this.handleNewChat}>✨ Reset</button>
                            <button class="action-btn" @click=${async () => {
                                this.tacThinkMode = !this.tacThinkMode;
                                this.isSwitchingMode = true; setTimeout(() => { this.isSwitchingMode = false; }, 3000);
                                if(window.require) window.require('electron').ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', true);
                                await window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode);
                                this.requestUpdate();
                            }}>
                                ${this.tacThinkMode ? '🧠 THINK' : '⚡ FAST'}
                            </button>
                            ${this.renderEngineSelector()}
                            ${this.renderLanguageSelector()}
                            <button class="action-btn primary" @click=${this.handleSendProfileContext}>📄 Send Profile</button>
                            <button class="action-btn ${this.isMicOn ? 'success' : ''}" @click=${this.handleToggleMic}>
                                🎙️ Mic: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div class="control-row">
                            <div class="format-toggles" style="font-size: 11px; color: #a0a0a0; display: flex; gap: 10px; align-items: center;">
                                <label><input type="checkbox" .checked=${this.tacBrief} @change=${(e)=>{this.tacBrief=e.target.checked; this.requestUpdate();}}> Brief</label>
                                <label><input type="checkbox" .checked=${this.tacBullets} @change=${(e)=>{this.tacBullets=e.target.checked; this.requestUpdate();}}> Bullets</label>
                                <label><input type="checkbox" .checked=${this.tacStar} @change=${(e)=>{this.tacStar=e.target.checked; this.requestUpdate();}}> STAR</label>
                                <label><input type="checkbox" .checked=${this.tacConversational} @change=${(e)=>{this.tacConversational=e.target.checked; this.requestUpdate();}}> Human Tone</label>
                            </div>
                        </div>
                        <div class="control-row">
                            ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                <button class="action-btn ${this.autoSyncMode ? 'success' : 'danger'}" @click=${() => { this.autoSyncMode = !this.autoSyncMode; this.requestUpdate(); }}>
                                    ${this.autoSyncMode ? '📡 Auto-Sync: ON' : '🛡️ Draft Mode (Vetting)'}
                                </button>
                            ` : ''}
                            
                            ${this.renderProfileSelector()}
                            </div>
                            <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color);">
                                <button class="nav-button" @click=${() => this.changeFontSize(-2)}>A-</button>
                                <span style="font-size: 11px; color: var(--text-color); padding: 0 4px; display: flex; align-items: center;">Text Size</span>
                                <button class="nav-button" @click=${() => this.changeFontSize(2)}>A+</button>
                            </div>
                            <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color);">
                                <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.localChatIndex <= 0}>◀</button>
                                <span style="font-size: 11px; color: var(--text-color); font-family: monospace; padding: 8px 8px;">${this.localChatHistory.length ? `${this.localChatIndex + 1} / ${this.localChatHistory.length}` : '0 / 0'}</span>
                                <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.localChatIndex >= this.localChatHistory.length - 1}>▶</button>
                                
                                ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                    <button class="nav-button" style="color: #00cc66; font-weight: bold; border-left: 1px solid var(--border-color); padding-left: 10px;" 
                                            @click=${() => this.transmitCleanPayload(this.localChatHistory[this.localChatIndex])}>
                                        🚀 PUSH TO SCREEN
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    ` : html`
                        <div class="control-row">
                            <button class="action-btn" @click=${this.handleNewChat}>✨ Reset</button>
                            <button class="action-btn" @click=${async () => {
                                this.tacThinkMode = !this.tacThinkMode;
                                this.isSwitchingMode = true; setTimeout(() => { this.isSwitchingMode = false; }, 3000);
                                if(window.require) window.require('electron').ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', true);
                                await window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode);
                                this.requestUpdate();
                            }}>
                                ${this.tacThinkMode ? '🧠 THINK' : '⚡ FAST'}
                            </button>
                            ${this.renderEngineSelector()}
                            ${this.renderLanguageSelector()}
                            <button class="action-btn highlight" @click=${this.handleRefactor}>🛠️ Refactor</button>
                            <button class="action-btn ${this.isMicOn ? 'success' : ''}" @click=${this.handleToggleMic}>
                                🎙️ Mic: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        <div class="control-row">
                            ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                <button class="action-btn ${this.autoSyncMode ? 'success' : 'danger'}" @click=${() => { this.autoSyncMode = !this.autoSyncMode; this.requestUpdate(); }}>
                                    ${this.autoSyncMode ? '📡 Auto-Sync: ON' : '🛡️ Draft Mode (Vetting)'}
                                </button>
                            ` : ''}
                            
                            ${this.renderProfileSelector()}
                            <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color);">
                                <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.localChatIndex <= 0}>◀</button>
                                <span style="font-size: 11px; color: var(--text-color); font-family: monospace; padding: 8px 8px;">${this.localChatHistory.length ? `${this.localChatIndex + 1} / ${this.localChatHistory.length}` : '0 / 0'}</span>
                                <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.localChatIndex >= this.localChatHistory.length - 1}>▶</button>
                                
                                ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                    <button class="nav-button" style="color: #00cc66; font-weight: bold; border-left: 1px solid var(--border-color); padding-left: 10px;" 
                                            @click=${() => this.transmitCleanPayload(this.localChatHistory[this.localChatIndex])}>
                                        🚀 PUSH TO SCREEN
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
}
customElements.define('assistant-view', AssistantView);