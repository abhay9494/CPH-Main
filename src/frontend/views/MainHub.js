import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainHub extends LitElement {
    static styles = css`
        :host {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; width: 100%; color: var(--text-color); background: transparent; 
            overflow-y: auto; padding: 20px 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default !important;
        }
        .hub-wrapper {
            display: flex; flex-direction: column; align-items: center;
            max-width: 900px; padding: 10px; animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .hub-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.5px; }
        .hub-subtitle { font-size: 13px; color: var(--text-muted, #888); margin-bottom: 25px; }

        .setup-warning {
            background: rgba(241, 76, 76, 0.1); border: 1px solid #f14c4c; border-radius: 8px;
            padding: 15px 20px; margin-bottom: 25px; width: 100%; max-width: 800px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .setup-warning-text { color: #f14c4c; font-size: 13px; font-weight: bold; }
        .setup-btn {
            background: #f14c4c; color: white; border: none; padding: 8px 16px; 
            border-radius: 4px; font-weight: bold; font-size: 12px; transition: 0.2s;
        }
        .setup-btn:hover { background: #ff6b6b; }

        .primary-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px; width: 100%; max-width: 800px; margin-bottom: 20px;
        }
        .mode-card {
            background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px;
            padding: 12px 15px; display: flex; flex-direction: column; align-items: flex-start;
            position: relative; overflow: hidden; text-align: left; transition: 0.2s;
        }
        .mode-card:not(.disabled):hover { transform: translateY(-2px); border-color: #888; }
        .mode-card.disabled { opacity: 0.4; filter: grayscale(100%); pointer-events: none; }
        
        .mode-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: transparent; }

        .card-oa::before { background: rgba(161, 66, 244, var(--bg-alpha, 1)); }
        .card-oa .icon-wrapper { background: rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.15)); color: #a142f4; border: 1px solid rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.3)); }
        
        .card-interview::before { background: rgba(66, 133, 244, var(--bg-alpha, 1)); }
        .card-interview .icon-wrapper { background: rgba(66, 133, 244, calc(var(--bg-alpha, 1) * 0.15)); color: #4285f4; border: 1px solid rgba(66, 133, 244, calc(var(--bg-alpha, 1) * 0.3)); }

        /* 🟢 NEW: Instant Interview Styling */
        .card-instant::before { background: rgba(0, 204, 102, var(--bg-alpha, 1)); }
        .card-instant .icon-wrapper { background: rgba(0, 204, 102, calc(var(--bg-alpha, 1) * 0.15)); color: #00cc66; border: 1px solid rgba(0, 204, 102, calc(var(--bg-alpha, 1) * 0.3)); }

        .card-companion::before { background: rgba(245, 158, 11, var(--bg-alpha, 1)); }
        .card-companion .icon-wrapper { background: rgba(245, 158, 11, calc(var(--bg-alpha, 1) * 0.15)); color: #f59e0b; border: 1px solid rgba(245, 158, 11, calc(var(--bg-alpha, 1) * 0.3)); }

        .icon-wrapper { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 8px; }
        .card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--text-color); }
        .card-desc { font-size: 11px; color: var(--text-muted, #888); line-height: 1.4; }

        .secondary-actions { display: flex; gap: 10px; justify-content: center; width: 100%; }
        .utility-btn {
            background: var(--bg-secondary); color: var(--text-secondary, #ccc); border: 1px solid var(--border-color);
            padding: 6px 15px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: 0.2s;
        }
        .utility-btn:hover { background: var(--hover-background); color: #fff; }
    `;

    static properties = {
        onNavigate: { type: Function },
        missingAccount: { type: Boolean },
        missingContext: { type: Boolean }
    };

    render() {
        const isSetupIncomplete = this.missingAccount || this.missingContext;

        return html`
            <div class="hub-wrapper">
                <div style="text-align: center;">
                    <div class="hub-title">Select Execution Mode</div>
                    <div class="hub-subtitle">Choose how you want the AI to assist you in this session.</div>
                </div>

                ${isSetupIncomplete ? html`
                    <div class="setup-warning">
                        <div class="setup-warning-text">
                            ⚠️ SETUP REQUIRED: ${this.missingAccount ? 'Log in to an AI Account.' : ''} 
                            ${this.missingAccount && this.missingContext ? ' | ' : ''} 
                            ${this.missingContext ? 'Add your Resume Context.' : ''}
                        </div>
                        <button class="setup-btn" @click=${() => this.onNavigate('settings')}>Complete Setup →</button>
                    </div>
                ` : ''}

                <div class="primary-grid">
                    <div class="mode-card card-oa ${isSetupIncomplete ? 'disabled' : ''}" @click=${() => !isSetupIncomplete && this.onNavigate('proctored_oa')}>
                        <div class="icon-wrapper">🎯</div>
                        <div class="card-title">Proctored OA</div>
                        <div class="card-desc">Single-Brain execution. Triggers AI captures and navigation via invisible mouse edge-dwells.</div>
                    </div>

                    <div class="mode-card card-interview ${isSetupIncomplete ? 'disabled' : ''}" @click=${() => !isSetupIncomplete && this.onNavigate('proctored_live_interview')}>
                        <div class="icon-wrapper">🕵️</div>
                        <div class="card-title">Proctored Live Interview</div>
                        <div class="card-desc">Heavy 5-Brain execution. UI Overlays and 16-zone radial wrist-flicks to execute commands silently.</div>
                    </div>

                    <!-- 🟢 NEW: Instant Interview Card -->
                    <div class="mode-card card-instant ${isSetupIncomplete ? 'disabled' : ''}" @click=${() => !isSetupIncomplete && this.onNavigate('instant_interview')}>
                        <div class="icon-wrapper">⚡</div>
                        <div class="card-title">Instant Interview</div>
                        <div class="card-desc">Ultra-lightweight 2-window mode. Zero UI overlays, direct OS-level gestures, and maximum CPU stealth.</div>
                    </div>

                    <div class="mode-card card-companion" @click=${() => this.onNavigate('companion')}>
                        <div class="icon-wrapper">🤝</div>
                        <div class="card-title">Help a Friend</div>
                        <div class="card-desc">Connect to a peer's session via secure WebRTC to quietly push answers and code to their screen.</div>
                    </div>
                </div>

                <div class="secondary-actions">
                    <button class="utility-btn" @click=${() => this.onNavigate('history')}><span>📜</span> Chat Vault</button>
                    <button class="utility-btn" @click=${() => this.onNavigate('settings')}><span>⚙️</span> Preferences</button>
                    <button class="utility-btn" @click=${() => this.onNavigate('help')}><span>❓</span> Help & Guides</button>
                </div>
            </div>
        `;
    }
}
customElements.define('main-hub', MainHub);