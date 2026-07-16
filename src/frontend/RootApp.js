import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './components/AppHeader.js';
import { MainHub } from './views/MainHub.js';
import { ProctoredOA } from './views/ProctoredOA.js';
// import { LiveInterview } from './views/LiveInterview.js';
import { Companion } from './views/Companion.js';
import { SettingsView } from './views/SettingsView.js';
import { HelpView } from './views/HelpView.js';
import { HistoryView } from './views/HistoryView.js';
import { InstantWidget } from './views/InstantWidget.js';

export class RootApp extends LitElement {
    static styles = css`
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: #444; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; cursor: default !important; user-select: none; }

        :host { display: block; width: 100%; height: 100vh; background-color: var(--background-transparent); color: var(--text-color); }
        .window-container { height: 100vh; overflow: hidden; background: var(--bg-primary); }
        .container { display: flex; flex-direction: column; height: 100%; padding: 0 45px; }
        .main-content { flex: 1; padding: var(--main-content-padding); overflow-y: auto; background: var(--main-content-background); }
        .view-container { opacity: 1; height: 100%; }

        /* Sliders */
        .vertical-slider-wrapper { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 12px; background: transparent !important; padding: 15px 8px; z-index: 9999; -webkit-app-region: no-drag; transition: opacity 0.3s ease; }
        .slider-left { left: 5px; }
        .slider-right { right: 5px; }
        .vertical-slider-wrapper span { font-size: 11px; color: var(--text-muted); font-weight: bold; }
        .vertical-slider { writing-mode: vertical-lr; direction: rtl; width: 8px; height: 120px; background: transparent; margin: 0; padding: 0; -webkit-appearance: none !important; outline: none !important; }
        .vertical-slider::-webkit-slider-runnable-track { background: rgba(255, 255, 255, 0.1) !important; border-radius: 10px; }
        .vertical-slider::-webkit-slider-thumb { -webkit-appearance: none !important; background: rgba(255, 255, 255, 0.5) !important; border-radius: 50%; height: 14px; width: 14px; }
    `;

    static properties = {
        currentView: { type: String },
        sessionMode: { type: String },
        bgTransparency: { type: Number },
        fontSize: { type: Number },
        missingAccount: { type: Boolean },
        missingContext: { type: Boolean },
    };

    constructor() {
        super();
        this.currentView = 'main';
        this.sessionMode = 'none';
        this.bgTransparency = 0.8;
        this.fontSize = 12;
        this.missingAccount = false;
        this.missingContext = false;
    }

    async connectedCallback() {
        super.connectedCallback();
        
        window.addEventListener('return-to-main', () => this.handleHubNavigation('main'));

        // 🟢 FIX: The missing IPC Listener that catches the signal from the Widget Window
        if (window.require) {
            window.require('electron').ipcRenderer.on('force-route', (_, route) => {
                this.currentView = route;
                this.requestUpdate();
            });
        }

        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};
            
            this.bgTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 12;
            this.theme = prefs.theme || 'dark';
            
            this.applyBackgroundAppearance(prefs.backgroundColor ?? '#1e1e1e', this.bgTransparency, this.theme);
            document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
            
            this.checkSetupState(prefs);
            this.syncInterval = setInterval(async () => {
                const r = await window.cheatingDaddy.storage.getPreferences();
                this.checkSetupState(r?.data || r || {});
            }, 3000);
        }

        window.addEventListener('sync-preference', (e) => {
            if (e.detail.key === 'backgroundTransparency') {
                this.bgTransparency = e.detail.value;
                this.applyBackgroundAppearance('#1e1e1e', this.bgTransparency, this.theme);
            }
            if (e.detail.key === 'fontSize') {
                this.fontSize = e.detail.value;
                document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
            }
            if (e.detail.key === 'theme') {
                this.theme = e.detail.value;
                this.applyBackgroundAppearance('#1e1e1e', this.bgTransparency, this.theme);
            }
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.syncInterval) clearInterval(this.syncInterval);
    }

    checkSetupState(prefs) {
        const profiles = prefs.aiProfiles || [];
        this.missingAccount = profiles.length === 0;
        this.missingContext = !(prefs.customPrompt && prefs.customPrompt.trim().length > 0);
        this.requestUpdate();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 30, g: 30, b: 30 };
    }
    lightenColor(rgb, amount) {
        return { r: Math.min(255, rgb.r + amount), g: Math.min(255, rgb.g + amount), b: Math.min(255, rgb.b + amount) };
    }

    applyBackgroundAppearance(backgroundColor, alpha, theme = 'dark') {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor || '#1e1e1e');
        let textColor, textSecondary, textMuted;
        
        if (theme === 'light') {
            textColor = '#000000'; 
            textSecondary = '#222222';
            textMuted = '#444444';
        } else {
            textColor = '#ffffff'; 
            textSecondary = '#cccccc';
            textMuted = '#888888';
        }

        const secondary = this.lightenColor(baseRgb, 7);
        const tertiary = this.lightenColor(baseRgb, 15);
        const hover = this.lightenColor(baseRgb, 20);

        root.style.setProperty('--bg-alpha', alpha);
        root.style.setProperty('--header-background', `transparent`);
        root.style.setProperty('--main-content-background', `transparent`);
        root.style.setProperty('--scrollbar-background', `transparent`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--border-color', `rgba(60, 60, 60, ${alpha})`);
        
        root.style.setProperty('--text-color', textColor);
        root.style.setProperty('--text-secondary', textSecondary);
        root.style.setProperty('--text-muted', textMuted);
    }

    async handleHubNavigation(destination) {
        if (!window.require) {
            this.currentView = destination;
            return;
        }
        
        const { ipcRenderer } = window.require('electron');
        
        if (destination === 'main') {
            ipcRenderer.send('set-session-mode', 'main');
            ipcRenderer.send('stop-hot-corners');
            ipcRenderer.send('toggle-radial-permanent', false);
            ipcRenderer.send('set-ignore-mouse-events', false); 
            ipcRenderer.send('view-changed', 'main');
            
            this.sessionMode = 'none';
            this.currentView = 'main';
            this.requestUpdate();
            return;
        }

        this.sessionMode = destination;
        ipcRenderer.send('set-session-mode', destination);
        
        if (destination === 'proctored_oa') {
            await ipcRenderer.invoke('set-ai-provider', 1);
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const bounds = (raw?.data || raw || {}).hotCornerBounds || { cornerSize: 15, centerX: 40, centerY: 40 };
            ipcRenderer.send('start-hot-corners', bounds);
            ipcRenderer.send('set-ignore-mouse-events', true); 
            ipcRenderer.send('toggle-radial-permanent', false); 
        }
        else if (destination === 'proctored_live_interview') {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const bounds = (raw?.data || raw || {}).hotCornerBounds || { cornerSize: 15, centerX: 40, centerY: 40 };
            ipcRenderer.send('start-hot-corners', bounds);
            ipcRenderer.send('toggle-radial-permanent', true);
            setTimeout(() => ipcRenderer.send('set-ignore-mouse-events', true), 200); 
        }
        else if (destination === 'instant_interview') {
            ipcRenderer.send('stop-hot-corners');
            ipcRenderer.send('toggle-radial-permanent', false);
            ipcRenderer.send('set-ignore-mouse-events', true);
            ipcRenderer.send('launch-instant-interview');
        }
        else if (destination === 'companion') {
            ipcRenderer.send('stop-hot-corners');
            ipcRenderer.send('set-ignore-mouse-events', false); 
            ipcRenderer.send('toggle-radial-permanent', false);
        }

        this.currentView = destination;
        ipcRenderer.send('view-changed', 'assistant');
        this.requestUpdate();
    }

    getDynamicHeaderTitle() {
        switch (this.currentView) {
            case 'main': return 'CP Helper 20';
            case 'settings': return 'CP Helper 20 - Settings';
            case 'history': return 'CP Helper 20 - History';
            case 'help': return 'CP Helper 20 - Help';
            case 'proctored_oa': return 'CP Helper 20 - Online Assessment';
            case 'instant_interview': return 'CP Helper 20 - Instant Interview (Lightweight)';
            case 'companion': return 'CP Helper 20 - Helping Other';
            default: return 'CP Helper 20';
        }
    }

    renderCurrentView() {
        switch (this.currentView) {
            case 'main':
                return html`<main-hub .missingAccount=${this.missingAccount} .missingContext=${this.missingContext} .onNavigate=${(dest) => this.handleHubNavigation(dest)}></main-hub>`;
            
            case 'instant_interview': 
                return html`
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-secondary);">
                        <div style="font-size: 40px; margin-bottom: 20px;">⚡</div>
                        <h2 style="margin-top: 0; color: #00cc66;">Instant Interview Active</h2>
                        <p style="font-size: 13px; max-width: 400px; line-height: 1.5;">
                            The UI has been stripped away. Your two native AI windows are now running in the background.<br><br>
                            Use your <strong>3-Finger and 4-Finger Trackpad Gestures</strong> to hide, sync, and control the flow.
                        </p>
                    </div>
                `;

            case 'settings': return html`<settings-view></settings-view>`;
            case 'history': return html`<history-view></history-view>`;
            case 'help': return html`<help-view></help-view>`;
            case 'proctored_oa': return html`<proctored-oa></proctored-oa>`;
            case 'companion': return html`<companion-view></companion-view>`;
            
            default:
                return html`<div style="padding: 20px; text-align: center;">View router is building: ${this.currentView}</div>`;
        }
    }

    render() {
        // 🟢 FIX: Return ONLY the raw component for Widget and OA mode! No backgrounds, no headers.
        if (this.currentView === 'instant_widget') {
            return html`<instant-widget></instant-widget>`;
        }
        if (this.currentView === 'proctored_oa') {
            return html`<proctored-oa></proctored-oa>`;
        }

        return html`
            <div class="window-container">
                <div class="vertical-slider-wrapper slider-left">
                    <span>BG</span>
                    <input type="range" class="vertical-slider" min="0" max="1" step="0.05" .value=${this.bgTransparency} @input=${async (e) => {
                        this.bgTransparency = parseFloat(e.target.value);
                        this.applyBackgroundAppearance('#1e1e1e', this.bgTransparency);
                        if(window.require) {
                            window.require('electron').ipcRenderer.send('rebuild-radial-hud');
                            await window.cheatingDaddy.storage.updatePreference('backgroundTransparency', this.bgTransparency);
                        }
                        window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: this.bgTransparency } }));
                    }} />
                </div>

                <div class="vertical-slider-wrapper slider-right">
                    <span>Aa</span>
                    <input type="range" class="vertical-slider" min="12" max="32" step="1" .value=${this.fontSize} 
                        @input=${(e) => {
                            this.fontSize = parseInt(e.target.value);
                            document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
                            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'fontSize', value: this.fontSize } }));
                        }} />
                </div>

                <div class="container">
                    <app-header
                        .title=${this.getDynamicHeaderTitle()}
                        .currentView=${this.currentView}
                        .missingAccount=${this.missingAccount}
                        .missingContext=${this.missingContext}
                        .onBackClick=${() => this.handleHubNavigation('main')}
                        .onHideClick=${async () => {
                            if (window.require) await window.require('electron').ipcRenderer.invoke('trigger-ghost-hide');
                        }}
                    ></app-header>

                    <div class="main-content">
                        <div class="view-container">
                            ${this.renderCurrentView()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('root-app', RootApp);