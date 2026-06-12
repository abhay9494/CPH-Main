import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class InstantWidget extends LitElement {
    static styles = css`
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; user-select: none; cursor: default !important; }
        
        :host { 
            display: flex; justify-content: center; 
            align-items: flex-end; 
            width: 100%; height: 100%; 
            padding-bottom: 15px; /* Hovers perfectly above taskbar */
            pointer-events: none;
            overflow: visible;
        }

        .pill-bar {
            pointer-events: auto;
            display: flex; align-items: center; gap: 12px;
            background: var(--bg-primary, rgba(30, 30, 30, 0.95));
            border: 1px solid #444; border-radius: 24px;
            padding: 8px 15px;
            -webkit-app-region: drag;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            color: white; position: relative;
        }
        
        .interactive { -webkit-app-region: no-drag; }

        .pane-group {
            display: flex; align-items: center; gap: 6px;
            background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 12px;
            border: 1px solid #444;
        }

        .pane-label { font-size: 11px; font-weight: bold; }
        .code-label { color: #4285f4; }
        .voice-label { color: #a142f4; }

        .custom-dropdown { position: relative; font-size: 10px; }
        .dropdown-trigger {
            background: #222; color: #fff; border: 1px solid #555;
            border-radius: 4px; padding: 4px 8px; min-width: 60px;
            display: flex; justify-content: space-between; align-items: center;
        }
        .dropdown-trigger:hover { border-color: #888; }
        .dropdown-menu {
            position: absolute; 
            bottom: 100%; 
            left: 0; 
            margin-bottom: 6px; 
            background: #222; border: 1px solid #555; border-radius: 6px;
            min-width: 100%; z-index: 1000; 
            box-shadow: 0 -4px 15px rgba(0,0,0,0.8);
            max-height: 180px; overflow-y: auto; display: flex; flex-direction: column;
        }
        .dropdown-item { padding: 6px 8px; color: #ccc; white-space: nowrap; }
        .dropdown-item:hover { background: #4285f4; color: #fff; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }

        .slider-row {
            display: flex; align-items: center; gap: 6px;
            background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 12px;
            border: 1px solid #444;
        }
        input[type="range"] {
            width: 60px; margin: 0; padding: 0; outline: none;
            -webkit-appearance: none; background: transparent;
        }
        input[type="range"]::-webkit-slider-runnable-track {
            width: 100%; height: 4px; background: #555; border-radius: 2px;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; height: 12px; width: 12px;
            border-radius: 50%; background: #fff; margin-top: -4px;
        }

        .btn {
            width: 26px; height: 26px; border-radius: 50%; font-size: 12px;
            border: none; display: flex; align-items: center; justify-content: center;
            transition: 0.2s;
        }
        .btn svg { width: 14px; height: 14px; color: inherit; }
        
        .btn-abort { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border: 1px solid #f14c4c; }
        .btn-abort:hover { background: #f14c4c; color: white; }

        .btn-apply { 
            background: rgba(255, 255, 255, 0.05); color: #666; border: 1px solid #444; 
            pointer-events: none;
        }
        
        .btn-apply.dirty { 
            background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66; 
            pointer-events: auto;
            animation: pulse-green 1.5s infinite;
        }
        .btn-apply.dirty:hover { background: #00cc66; color: black; }

        .btn-apply.syncing { 
            background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: #f59e0b; 
            pointer-events: none;
        }
        .btn-apply.syncing svg.spin { animation: spin 1s linear infinite; }

        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(0, 204, 102, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(0, 204, 102, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 204, 102, 0); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .save-toast {
            position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
            background: #00cc66; color: black; padding: 4px 10px; border-radius: 10px;
            font-size: 10px; font-weight: bold; opacity: 0; transition: 0.3s ease; pointer-events: none;
            display: flex; align-items: center; gap: 4px;
        }
        .save-toast svg { width: 10px; height: 10px; }
        .save-toast.visible { opacity: 1; transform: translateX(-50%) translateY(40px); }

        .backdrop {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999;
        }
    `;

    static properties = {
        prefs: { type: Object },
        profiles: { type: Array },
        cIdx: { type: Number },
        vIdx: { type: Number },
        cProfile: { type: String },
        vProfile: { type: String },
        savedCIdx: { type: Number },
        savedVIdx: { type: Number },
        savedCProfile: { type: String },
        savedVProfile: { type: String },
        isSyncingLeft: { type: Boolean },
        isSyncingRight: { type: Boolean },
        bgTransparency: { type: Number },
        showToast: { type: Boolean },
        activeDropdown: { type: String }
    };

    constructor() {
        super();
        this.prefs = {};
        this.profiles = [];
        this.cIdx = 1;
        this.vIdx = 0;
        this.cProfile = '';
        this.vProfile = '';
        this.bgTransparency = 0.8;
        this.showToast = false;
        this.activeDropdown = null;
        
        this.aiOptions = [
            { value: '0', label: 'ChatGPT' },
            { value: '1', label: 'Gemini' },
            { value: '2', label: 'Grok' }
        ];
    }

    async connectedCallback() {
        super.connectedCallback();
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            this.prefs = raw?.data || raw || {};
            this.profiles = this.prefs.aiProfiles || [];
            
            const iiPrefs = this.prefs.instantInterview || {};
            this.cIdx = iiPrefs.codeEngine !== undefined ? iiPrefs.codeEngine : 1;
            this.vIdx = iiPrefs.voiceEngine !== undefined ? iiPrefs.voiceEngine : 0;
            this.cProfile = iiPrefs.codeProfileId || '';
            this.vProfile = iiPrefs.voiceProfileId || '';
            this.bgTransparency = this.prefs.backgroundTransparency ?? 0.8;

            this.savedCIdx = this.cIdx;
            this.savedVIdx = this.vIdx;
            this.savedCProfile = this.cProfile;
            this.savedVProfile = this.vProfile;

            this.requestUpdate();
        }
    }

    async syncLeft() {
        this.isSyncingLeft = true;
        this.requestUpdate();
        
        await new Promise(r => setTimeout(r, 600)); 
        
        if (window.require) {
            window.require('electron').ipcRenderer.send('apply-instant-settings', 'code', parseInt(this.cIdx), this.cProfile);
            this.triggerToast();
        }
        
        this.savedCIdx = this.cIdx;
        this.savedCProfile = this.cProfile;
        this.isSyncingLeft = false;
        this.requestUpdate();
    }

    async syncRight() {
        this.isSyncingRight = true;
        this.requestUpdate();
        
        await new Promise(r => setTimeout(r, 600)); 
        
        if (window.require) {
            window.require('electron').ipcRenderer.send('apply-instant-settings', 'voice', parseInt(this.vIdx), this.vProfile);
            this.triggerToast();
        }
        
        this.savedVIdx = this.vIdx;
        this.savedVProfile = this.vProfile;
        this.isSyncingRight = false;
        this.requestUpdate();
    }

    abort() {
        if (window.require) {
            window.require('electron').ipcRenderer.send('abort-instant-interview');
        }
    }

    handleSliderChange(e) {
        this.bgTransparency = parseFloat(e.target.value);
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            window.cheatingDaddy.storage.updatePreference('backgroundTransparency', this.bgTransparency);
            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: this.bgTransparency } }));
            if (window.require) {
                window.require('electron').ipcRenderer.send('rebuild-radial-hud');
            }
        }
    }

    triggerToast() {
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 2000);
    }

    toggleDropdown(id) {
        this.activeDropdown = this.activeDropdown === id ? null : id;
    }

    renderCustomDropdown(id, options, currentValue, onChange) {
        const selectedLabel = options.find(o => String(o.value) === String(currentValue))?.label || 'Select';
        return html`
            <div class="custom-dropdown interactive">
                <div class="dropdown-trigger" @click=${() => this.toggleDropdown(id)}>
                    <span>${selectedLabel}</span>
                    <span style="font-size: 8px; margin-left: 6px;">▼</span>
                </div>
                ${this.activeDropdown === id ? html`
                    <div class="dropdown-menu">
                        ${options.map(opt => html`
                            <div class="dropdown-item" @click=${() => { onChange(opt.value); this.activeDropdown = null; }}>
                                ${opt.label}
                            </div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCheckIcon() {
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }

    getSpinIcon() {
        return html`<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>`;
    }

    getCrossIcon() {
        return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    }

    render() {
        const profileOpts = this.profiles.map(p => ({ value: p.id, label: p.name }));
        
        // 🟢 Check if current dropdown values differ from the saved states
        const isLeftDirty = String(this.cIdx) !== String(this.savedCIdx) || String(this.cProfile) !== String(this.savedCProfile);
        const isRightDirty = String(this.vIdx) !== String(this.savedVIdx) || String(this.vProfile) !== String(this.savedVProfile);

        return html`
            ${this.activeDropdown ? html`<div class="backdrop interactive" @click=${() => this.activeDropdown = null}></div>` : ''}
            
            <div class="pill-bar">
                <div class="save-toast ${this.showToast ? 'visible' : ''}">
                    ${this.getCheckIcon()} Synced
                </div>
                
                <div class="drag-handle">⋮⋮</div>
                
                <div class="pane-group">
                    <span class="pane-label code-label">💻</span>
                    ${this.renderCustomDropdown('c-ai', this.aiOptions, this.cIdx, (val) => this.cIdx = val)}
                    ${this.renderCustomDropdown('c-profile', profileOpts, this.cProfile, (val) => this.cProfile = val)}
                    <button class="btn btn-apply interactive ${isLeftDirty ? 'dirty' : ''} ${this.isSyncingLeft ? 'syncing' : ''}" @click=${this.syncLeft}>
                        ${this.isSyncingLeft ? this.getSpinIcon() : this.getCheckIcon()}
                    </button>
                </div>

                <div class="pane-group">
                    <span class="pane-label voice-label">🗣️</span>
                    ${this.renderCustomDropdown('v-ai', this.aiOptions, this.vIdx, (val) => this.vIdx = val)}
                    ${this.renderCustomDropdown('v-profile', profileOpts, this.vProfile, (val) => this.vProfile = val)}
                    <button class="btn btn-apply interactive ${isRightDirty ? 'dirty' : ''} ${this.isSyncingRight ? 'syncing' : ''}" @click=${this.syncRight}>
                        ${this.isSyncingRight ? this.getSpinIcon() : this.getCheckIcon()}
                    </button>
                </div>

                <div class="slider-row interactive">
                    <span class="pane-label" style="color: #ccc;">⬛</span>
                    <input type="range" min="0" max="1" step="0.05" .value=${this.bgTransparency} @input=${this.handleSliderChange}>
                </div>

                <button class="btn btn-abort interactive" @click=${this.abort}>
                    ${this.getCrossIcon()}
                </button>
            </div>
        `;
    }
}
customElements.define('instant-widget', InstantWidget);