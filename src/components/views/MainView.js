import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class MainView extends LitElement {
    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
        }
        .hub-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 24px;
            color: var(--text-color);
            letter-spacing: 0.5px;
            text-transform: uppercase;
            opacity: 0.8;
        }
        .button-group {
            display: flex;
            flex-wrap: wrap; /* Allows wrapping if window is small */
            gap: 12px;
            align-items: center;
            justify-content: center;
            max-width: 700px;
        }
        .sleek-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: bold;
            transition: all 0.2s ease;
        }
        .sleek-btn:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
        }
        .btn-oa {
            background: rgba(161, 66, 244, 0.2);
            color: #a142f4;
            border: 1px solid rgba(161, 66, 244, 0.5);
            box-shadow: 0 2px 8px rgba(161, 66, 244, 0.1);
        }
        .btn-oa:hover { background: rgba(161, 66, 244, 0.3); }

        .btn-interview {
            background: rgba(66, 133, 244, 0.2);
            color: #4285f4;
            border: 1px solid rgba(66, 133, 244, 0.5);
            box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
        }
        .btn-interview:hover { background: rgba(66, 133, 244, 0.3); }

        .btn-secondary {
            background: var(--bg-secondary);
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
            color: #fff;
            border-color: var(--border-color);
            background: var(--bg-hover);
        }
    `;

    static properties = {
        onNavigate: { type: Function }
    };

    render() {
        return html`
            <div class="hub-title">Select Mode</div>
            <div class="button-group">
                <button class="sleek-btn btn-oa" @click=${() => this.onNavigate('oa')}>
                    <span style="font-size: 14px;">⚡</span> Online Assessment
                </button>
                <button class="sleek-btn btn-interview" @click=${() => this.onNavigate('interview')}>
                    <span style="font-size: 14px;">🎤</span> Live Interview
                </button>
                <button class="sleek-btn btn-secondary" @click=${() => this.onNavigate('companion')}>
                    <span style="font-size: 14px;">🤝</span> Help a Friend
                </button>
                <button class="sleek-btn btn-secondary" @click=${() => this.onNavigate('customize')}>
                    <span style="font-size: 14px;">⚙️</span> Settings
                </button>
                <button class="sleek-btn btn-secondary" @click=${() => this.onNavigate('history')}>
                    <span style="font-size: 14px;">📜</span> History
                </button>
                <button class="sleek-btn btn-secondary" @click=${() => this.onNavigate('help')}>
                    <span style="font-size: 14px;">❓</span> Help
                </button>
            </div>
        `;
    }
}
customElements.define('main-view', MainView);