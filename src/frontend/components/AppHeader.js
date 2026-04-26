import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AppHeader extends LitElement {
    static styles = css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            cursor: default !important;
            user-select: none;
            box-sizing: border-box;
        }
        .header {
            -webkit-app-region: drag;
            display: flex;
            align-items: center;
            padding: var(--header-padding);
            background: transparent !important; /* 🐛 FIX: No more color stacking over the main window */
            border-bottom: 1px solid var(--border-color);
        }
        .back-btn {
            -webkit-app-region: no-drag;
            background: var(--bg-secondary);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 4px 10px;
            border-radius: 4px;
            margin-right: 15px;
            font-size: 12px;
            font-weight: bold;
            transition: 0.2s ease;
        }
        .back-btn:hover {
            background: var(--bg-hover);
        }
        .header-title {
            flex: 1;
            font-size: var(--header-font-size);
            font-weight: bold;
            color: var(--text-color);
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
        }

        .blinking-alert {
            -webkit-app-region: no-drag;
            background: rgba(241, 76, 76, calc(var(--bg-alpha, 1) * 0.15));
            color: #f14c4c;
            border: 1px solid rgba(241, 76, 76, var(--bg-alpha, 1));
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 15px;
            animation: pulse-alert 1.5s infinite;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: default !important;
        }
        .blinking-alert.stop-btn:hover {
            background: #f14c4c;
            color: #fff;
        }
        @keyframes pulse-alert {
            0% {
                opacity: 1;
            }
            50% {
                opacity: 0.4;
            }
            100% {
                opacity: 1;
            }
        }

        .status-badge {
            font-size: 10px;
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 12px;
            margin-right: 15px;
            margin-left: 10px;
            letter-spacing: 0.5px;
            transition: 0.3s;
            display: flex;
            align-items: center;
        }
        .status-badge.disconnected {
            color: #f14c4c;
            background: rgba(241, 76, 76, calc(var(--bg-alpha, 1) * 0.1));
        }
        .status-badge.connected {
            color: #00cc66;
            background: rgba(0, 204, 102, calc(var(--bg-alpha, 1) * 0.1));
            animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
            0% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(0, 204, 102, 0.4);
            }
            50% {
                opacity: 0.6;
                box-shadow: 0 0 0 4px rgba(0, 204, 102, 0);
            }
            100% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(0, 204, 102, 0);
            }
        }

        .header-pin {
            -webkit-app-region: no-drag;
            background: rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.15));
            color: #a142f4;
            border: 1px solid rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.4));
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 15px;
            letter-spacing: 1px;
            cursor: default !important;
            transition: 0.2s;
        }
        .header-pin:hover {
            background: rgba(161, 66, 244, 0.25);
        }

        /* 🟢 FIX: Clean Windows-Style Action Buttons */
        .header-actions {
            display: flex;
            gap: 4px;
            align-items: center;
            -webkit-app-region: no-drag;
            margin-left: 10px;
        }
        .icon-button {
            background: transparent;
            color: var(--text-secondary);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.15s ease;
            cursor: default !important;
        }
        .icon-button:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        .icon-button.danger:hover {
            background: #e81123;
            color: white;
        } /* Classic Windows Red */

        .ghost-badge {
            -webkit-app-region: no-drag; font-size: 10px; font-weight: bold; padding: 4px 10px; 
            border-radius: 4px; margin-right: 15px; cursor: default !important; transition: 0.2s;
        }
        .ghost-badge.active { background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); }
        .ghost-badge.broken { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border: 1px solid #f14c4c; animation: pulse-alert 1s infinite; }
    `;

    static properties = {
        title: { type: String },
        currentView: { type: String },
        onBackClick: { type: Function },
        onHideClick: { type: Function },
        /* Notice we ignored onQuitClick here to force our own logic */
        missingAccount: { type: Boolean },
        missingContext: { type: Boolean },
        typingState: { type: String },
        typingCountdown: { type: Number },
        isTyperMode: { type: Boolean },
        isHelpingMode: { type: Boolean },
        helperStatus: { type: String },
        connectionPin: { type: String },
        isGhostActive: { type: Boolean },
        isMicOn: { type: Boolean },
    };

    constructor() {
        super();
        this.missingAccount = false;
        this.missingContext = false;
        this.typingState = 'idle';
        this.typingCountdown = 0;
        this.isTyperMode = false;
        this.isHelpingMode = false;
        this.helperStatus = 'idle';
        this.connectionPin = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.checkSetupState();
        this.syncInterval = setInterval(() => this.checkSetupState(), 3000);

        this.typingStateHandler = e => {
            this.typingState = e.detail.state;
            this.typingCountdown = e.detail.count || 0;
            this.requestUpdate();
        };
        window.addEventListener('typing-state-changed', this.typingStateHandler);

        this.typerModeHandler = e => {
            this.isTyperMode = e.detail;
            this.requestUpdate();
        };
        window.addEventListener('typer-mode-toggled', this.typerModeHandler);

        this.helpModeHandler = e => {
            this.isHelpingMode = e.detail;
            this.requestUpdate();
        };
        window.addEventListener('help-mode-toggled', this.helpModeHandler);

        this.helperStatusHandler = e => {
            this.helperStatus = e.detail;
            this.requestUpdate();
        };
        window.addEventListener('helper-status-changed', this.helperStatusHandler);

        this.pinHandler = e => {
            this.connectionPin = e.detail;
            this.requestUpdate();
        };
        window.addEventListener('update-pin-display', this.pinHandler);

        // 🟢 Here is the modified block!
        if (window.require) {
            // 🟢 NEW: The Ghost State Tracker
            window.require('electron').ipcRenderer.on('ghost-state-changed', (event, state) => {
                this.isGhostActive = state;
                this.requestUpdate();
            });

            window.require('electron').ipcRenderer.on('typing-status', (event, status) => {
                if (!status) {
                    this.typingState = 'idle';
                    this.requestUpdate();
                }
            });

            window.require('electron').ipcRenderer.on('sync-mic-state', (event, state) => {
                this.isMicOn = state;
                this.requestUpdate();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.syncInterval) clearInterval(this.syncInterval);
        window.removeEventListener('typing-state-changed', this.typingStateHandler);
        window.removeEventListener('typer-mode-toggled', this.typerModeHandler);
        window.removeEventListener('help-mode-toggled', this.helpModeHandler);
        window.removeEventListener('helper-status-changed', this.helperStatusHandler);
        window.removeEventListener('update-pin-display', this.pinHandler);
    }

    handleStopTyping() {
        if (window.require) window.require('electron').ipcRenderer.send('stop-auto-type');
        window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'idle' } }));
    }

    async checkSetupState() {
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {}; // 🟢 FIX: Properly unpack the IPC payload!
            
            const profiles = prefs.aiProfiles || [];
            this.missingAccount = profiles.length === 0;
            this.missingContext = !(prefs.customPrompt && prefs.customPrompt.trim().length > 0);
            this.requestUpdate();
        }
    }

    // 🟢 FIX: The Graceful Teardown
    handleHardClose() {
        // 1. Tell the rest of the app we are about to die
        window.dispatchEvent(new CustomEvent('app-quitting'));
        
        // 2. Give WebRTC exactly 100ms to send the final disconnect payload before executing the kill command
        setTimeout(() => {
            if (window.require) {
                window.require('electron').ipcRenderer.invoke('quit-application');
            }
        }, 100);
    }

    render() {
        // 🟢 FIX: Capture the original mode state BEFORE we change the display title!
        const isOA = (this.title || '').includes('Proctored');

        let displayTitle = this.title || 'CP Helper 20';
        if (this.isTyperMode) displayTitle = 'CP Helper 20 - Auto Typer';
        if (this.isHelpingMode) displayTitle = 'CP Helper 20 - Helping Other';

        return html`
            <div class="header">
                ${!isOA && this.isTyperMode ? html`
                    <button class="back-btn" @click=${() => window.dispatchEvent(new CustomEvent('cancel-typer-mode'))}>◀ Display</button>
                ` : !isOA && this.isHelpingMode ? html`
                    <button class="back-btn" @click=${() => {
                        window.dispatchEvent(new CustomEvent('help-mode-toggled', { detail: false }));
                        if (this.onBackClick) this.onBackClick();
                    }}>◀ Back</button>
                ` : !isOA && this.currentView !== 'main' ? html`
                    <button class="back-btn" @click=${this.onBackClick}>◀ Hub</button>
                ` : ''}

                <div class="header-title">${displayTitle}</div>

                ${!isOA && this.isHelpingMode && this.connectionPin ? html`
                    <div class="header-pin" @click=${e => {
                        if (window.require) window.require('electron').clipboard.writeText(this.connectionPin);
                        const oldText = e.target.innerText;
                        e.target.innerText = '✅ Copied!';
                        setTimeout(() => { e.target.innerText = oldText; }, 1500);
                    }}>🔗 PIN: ${this.connectionPin}</div>
                ` : ''}

                ${!isOA && this.isHelpingMode ? html`
                    <div class="status-badge ${this.helperStatus === 'connected' ? 'connected' : 'disconnected'}">
                        ${this.helperStatus === 'connected' ? '🟢 LINKED' : '🔴 DISCONNECTED'}
                    </div>
                ` : ''}

                ${!isOA && (this.missingAccount || this.missingContext) && this.typingState === 'idle' && !this.isTyperMode && !this.isHelpingMode ? html`
                    <div class="blinking-alert" style="cursor: default !important;">
                        ⚠️ SETUP MISSING: ${this.missingAccount ? 'Accounts' : ''} ${this.missingAccount && this.missingContext ? ' & ' : ''} ${this.missingContext ? 'Resume' : ''}
                    </div>
                ` : ''}

                ${isOA ? html`
                    <div class="ghost-badge ${this.isGhostActive ? 'active' : 'broken'}">
                        ${this.isGhostActive ? '👻 GHOST MODE ON' : '⚠️ GHOST BROKEN'}
                    </div>
                ` : ''}

                <div class="header-actions" 
                    @mouseenter=${() => { if (window.require) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', false); }}
                    @mouseleave=${() => { if (window.require && this.title.includes('Proctored')) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', true); }}>
                    <button @click=${this.handleHardClose} class="icon-button danger">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <button @click=${this.onHideClick} class="icon-button window-close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }
}
customElements.define('app-header', AppHeader);
