import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainView extends LitElement {
    static styles = css`
        :host {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; width: 100%; color: var(--text-color); background: transparent; 
            overflow-y: auto; /* 🟢 FIX: Allows smooth scrolling for the extra cards */
            padding: 20px 0;
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
        .hub-subtitle { font-size: 13px; color: var(--text-muted, #888); margin-bottom: 15px; }

        .primary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 12px;
            width: 100%;
            max-width: 800px;
            margin-bottom: 20px;
        }
        .mode-card {
            background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px;
            padding: 12px 15px; display: flex; flex-direction: column; align-items: flex-start;
            position: relative; overflow: hidden; text-align: left;
        }
        .mode-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: transparent; }

        .card-oa::before { background: rgba(161, 66, 244, var(--bg-alpha, 1)); }
        .card-oa .icon-wrapper { background: rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.15)); color: #a142f4; border: 1px solid rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.3)); }
        .card-interview::before { background: rgba(66, 133, 244, var(--bg-alpha, 1)); }
        .card-interview .icon-wrapper { background: rgba(66, 133, 244, calc(var(--bg-alpha, 1) * 0.15)); color: #4285f4; border: 1px solid rgba(66, 133, 244, calc(var(--bg-alpha, 1) * 0.3)); }
        .card-companion::before { background: rgba(245, 158, 11, var(--bg-alpha, 1)); }
        .card-companion .icon-wrapper { background: rgba(245, 158, 11, calc(var(--bg-alpha, 1) * 0.15)); color: #f59e0b; border: 1px solid rgba(245, 158, 11, calc(var(--bg-alpha, 1) * 0.3)); }

        .icon-wrapper { width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 8px; }
        .card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: var(--text-color); }
        .card-desc { font-size: 11px; color: var(--text-muted, #888); line-height: 1.4; }

        .secondary-actions { display: flex; gap: 10px; justify-content: center; width: 100%; }
        .utility-btn {
            background: var(--bg-secondary); color: var(--text-secondary, #ccc); border: 1px solid var(--border-color);
            padding: 6px 15px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px;
        }
    `;

    static properties = {
        onNavigate: { type: Function },
    };

    render() {
        return html`
            <div class="hub-wrapper">
                <div style="text-align: center;">
                    <div class="hub-title">Select Execution Mode</div>
                    <div class="hub-subtitle">Choose how you want the AI to assist you in this session.</div>
                </div>

                <div class="primary-grid">
                    <div class="mode-card card-oa" @click=${() => this.onNavigate('oa')}>
                        <div class="icon-wrapper">⚡</div>
                        <div class="card-title">Online Assessment</div>
                        <div class="card-desc">Capture your screen directly to instantly generate high-speed code solutions and algorithms.</div>
                    </div>

                    <div class="mode-card card-oa" @click=${() => this.onNavigate('proctored_oa')} style="border-top-color: #f14c4c;">
                        <div class="icon-wrapper" style="color: #f14c4c; background: rgba(241, 76, 76, 0.15); border-color: rgba(241, 76, 76, 0.3);">
                            🎯
                        </div>
                        <div class="card-title">Proctored OA</div>
                        <div class="card-desc">Zero-touch execution. Triggers AI captures and navigation via invisible mouse edge-dwells.</div>
                    </div>

                    <div class="mode-card card-interview" @click=${() => this.onNavigate('interview')}>
                        <div class="icon-wrapper">🎤</div>
                        <div class="card-title">Live Interview</div>
                        <div class="card-desc">Real-time stealth audio bridging. Get instant, conversational AI prompts while you speak.</div>
                    </div>

                    <div class="mode-card card-companion" @click=${() => this.onNavigate('companion')}>
                        <div class="icon-wrapper">🤝</div>
                        <div class="card-title">Help a Friend</div>
                        <div class="card-desc">Connect to a peer's session via secure WebRTC to quietly push answers and code to their screen.</div>
                    </div>
                    <div class="mode-card card-interview" @click=${() => this.onNavigate('proctored_live_interview')} style="border-top-color: #00cc66;">
                        <div class="icon-wrapper" style="color: #00cc66; background: rgba(0, 204, 102, 0.15); border-color: rgba(0, 204, 102, 0.3);">🕵️</div>
                        <div class="card-title">Proctored Live Interview</div>
                        <div class="card-desc">Dual-pane code & chat view. Zero-click 16-zone radial wrist-flicks to execute commands silently.</div>
                    </div>
                </div>

                <div class="secondary-actions">
                    <button class="utility-btn" @click=${() => this.onNavigate('history')}><span>📜</span> Chat Vault</button>
                    <button class="utility-btn" @click=${() => this.onNavigate('customize')}><span>⚙️</span> Preferences</button>
                    <button class="utility-btn" @click=${() => this.onNavigate('help')}><span>❓</span> Help & Guides</button>
                </div>
            </div>
        `;
    }
}
customElements.define('main-view', MainView);
