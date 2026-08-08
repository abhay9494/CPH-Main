import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class InstantWidget extends LitElement {
    static styles = css`
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; user-select: none; cursor: default !important; }
        
        :host { 
            display: flex; justify-content: center; 
            align-items: flex-end; 
            width: 100%; height: 100%; 
            padding-bottom: 15px;
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
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            transform-origin: bottom center;
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

        .btn-resume { background: rgba(66, 133, 244, 0.15); color: #4285f4; border: 1px solid #4285f4; }
        .btn-resume:hover { background: #4285f4; color: white; }

        .btn-adjust { background: rgba(161, 66, 244, 0.15); color: #a142f4; border: 1px solid #a142f4; }
        .btn-adjust:hover { background: #a142f4; color: white; }

        .btn-apply { background: rgba(255, 255, 255, 0.05); color: #666; border: 1px solid #444; pointer-events: none; }
        .btn-apply.dirty { background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66; pointer-events: auto; animation: pulse-green 1.5s infinite; }
        .btn-apply.dirty:hover { background: #00cc66; color: black; }
        .btn-apply.syncing { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: #f59e0b; pointer-events: none; }
        .btn-apply.syncing svg.spin { animation: spin 1s linear infinite; }

        /* 🟢 NEW: D-Pad Styles */
        .d-pad-group { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 8px; border: 1px solid #444; }
        .d-btn { 
            background: #222; color: #fff; border: 1px solid #555; border-radius: 4px; 
            width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; 
            font-size: 10px; cursor: pointer !important; transition: 0.1s;
        }
        .d-btn:active { background: #4285f4; border-color: #4285f4; transform: scale(0.95); }
        .d-btn.text-btn { width: auto; padding: 0 8px; font-weight: bold; }
        .d-btn.active-target { background: #00cc66; color: black; border-color: #00cc66; }
        
        .divider { width: 1px; height: 16px; background: #555; margin: 0 4px; }

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

        .backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
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
        activeDropdown: { type: String },
        isAdjustMode: { type: Boolean }, // 🟢 NEW
        dpadTarget: { type: String }, // 'code', 'voice', 'both', 'active'
        codeEnabled: { type: Boolean },
        voiceEnabled: { type: Boolean },
        meetEnabled: { type: Boolean },
        mProfile: { type: String },
        savedMProfile: { type: String },
        isSyncingMeet: { type: Boolean }
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
        this.isAdjustMode = false;
        this.dpadTarget = 'active'; // Default to auto-detecting the visible window
        this.codeEnabled = true;
        this.voiceEnabled = true;
        this.meetEnabled = false;
        this.mProfile = '';
        this.savedMProfile = '';
        this.isSyncingMeet = false;
        
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
            this.codeEnabled = iiPrefs.codeEnabled !== false;
            this.voiceEnabled = iiPrefs.voiceEnabled !== false;
            this.meetEnabled = iiPrefs.meetEnabled === true;
            this.mProfile = iiPrefs.meetProfileId || '';

            this.savedCIdx = this.cIdx;
            this.savedVIdx = this.vIdx;
            this.savedCProfile = this.cProfile;
            this.savedVProfile = this.vProfile;
            this.savedMProfile = this.mProfile;

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

    attachResume() {
        if (window.require) {
            window.require('electron').ipcRenderer.send('attach-resume-prompt');
            this.triggerToast(); // Show "Synced" toast as visual feedback
        }
    }

    async syncMeet() {
        if (!this.meetEnabled) this.togglePane('meet');

        this.isSyncingMeet = true;
        this.requestUpdate();
        await new Promise(r => setTimeout(r, 600)); 
        if (window.require) {
            window.require('electron').ipcRenderer.send('apply-instant-settings', 'meet', 0, this.mProfile);
            this.triggerToast();
        }
        this.savedMProfile = this.mProfile;
        this.isSyncingMeet = false;
        this.requestUpdate();
    }

    togglePane(pane) {
        if (pane === 'code') this.codeEnabled = !this.codeEnabled;
        if (pane === 'voice') this.voiceEnabled = !this.voiceEnabled;
        if (pane === 'meet') this.meetEnabled = !this.meetEnabled;
        
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const iiPrefs = this.prefs.instantInterview || {};
            iiPrefs[`${pane}Enabled`] = pane === 'code' ? this.codeEnabled : pane === 'voice' ? this.voiceEnabled : this.meetEnabled;
            window.cheatingDaddy.storage.updatePreference('instantInterview', iiPrefs);
        }
        this.requestUpdate();
        if (window.require) window.require('electron').ipcRenderer.send('toggle-instant-pane', pane, pane === 'code' ? this.codeEnabled : pane === 'voice' ? this.voiceEnabled : this.meetEnabled);
    }

    // 🟢 NEW: Programmatic Nudge Dispatcher
    nudge(dimension, direction) {
        if (window.require) {
            window.require('electron').ipcRenderer.send('nudge-instant-window', this.dpadTarget, dimension, direction);
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

    getCheckIcon() { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`; }
    getSpinIcon() { return html`<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>`; }
    getCrossIcon() { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`; }
    getRulerIcon() { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3l-2.6 2.6c-.4.4-1 .4-1.4 0l-12-12c-.4-.4-.4-1 0-1.4l2.6-2.6c.4-.4 1-.4 1.4 0l12 12c.4.4.4 1 0 1.4zm-14.7-6l2.1 2.1m2.1-4.9l2.1 2.1m2.1-4.9l2.1 2.1"></path></svg>`; }

    // 🟢 NEW: Render D-Pad Layout
    renderAdjustMode() {
        return html`
            <div class="d-pad-group interactive">
                <span class="pane-label" style="color:#aaa; padding: 0 4px;">TARGET</span>
                <button class="d-btn text-btn ${this.dpadTarget === 'active' ? 'active-target' : ''}" @click=${() => this.dpadTarget = 'active'}>👁️</button>
                <div class="divider"></div>
                <button class="d-btn text-btn ${this.dpadTarget === 'code' ? 'active-target' : ''}" @click=${() => this.dpadTarget = 'code'}>💻 L</button>
                <button class="d-btn text-btn ${this.dpadTarget === 'voice' ? 'active-target' : ''}" @click=${() => this.dpadTarget = 'voice'}>🗣️ R</button>
                <button class="d-btn text-btn ${this.dpadTarget === 'meet' ? 'active-target' : ''}" @click=${() => this.dpadTarget = 'meet'}>🎥 M</button>
                <button class="d-btn text-btn ${this.dpadTarget === 'both' ? 'active-target' : ''}" @click=${() => this.dpadTarget = 'both'}>🔗</button>
            </div>

            <div class="d-pad-group interactive">
                <span class="pane-label" style="color:#aaa; padding: 0 4px;">MOVE</span>
                <button class="d-btn" @click=${() => this.nudge('x', -1)}>◀</button>
                <button class="d-btn" @click=${() => this.nudge('y', -1)}>▲</button>
                <button class="d-btn" @click=${() => this.nudge('y', 1)}>▼</button>
                <button class="d-btn" @click=${() => this.nudge('x', 1)}>▶</button>
            </div>

            <div class="d-pad-group interactive">
                <span class="pane-label" style="color:#aaa; padding: 0 4px;">SIZE</span>
                <button class="d-btn" style="color: #f14c4c;" @click=${() => { this.nudge('w', -1); this.nudge('h', -1); }}>➖</button>
                <button class="d-btn" style="color: #00cc66;" @click=${() => { this.nudge('w', 1); this.nudge('h', 1); }}>➕</button>
            </div>
            
            <button class="btn btn-apply interactive dirty" @click=${() => this.isAdjustMode = false} style="margin-left: 4px;">
                ${this.getCheckIcon()}
            </button>
        `;
    }

    renderDefaultMode() {
        const profileOpts = this.profiles.map(p => ({ value: p.id, label: p.name }));
        const isLeftDirty = String(this.cIdx) !== String(this.savedCIdx) || String(this.cProfile) !== String(this.savedCProfile);
        const isRightDirty = String(this.vIdx) !== String(this.savedVIdx) || String(this.vProfile) !== String(this.savedVProfile);
        const isMeetDirty = String(this.mProfile) !== String(this.savedMProfile);

        const crossSvg = html`<svg style="position:absolute; top:-2px; left:-2px; width:18px; height:18px; color:#f14c4c; pointer-events:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        return html`
            <div class="pane-group">
                <span class="pane-label code-label interactive" @click=${() => this.togglePane('code')} style="cursor:pointer; position:relative; opacity: ${this.codeEnabled ? 1 : 0.4}">
                    💻
                    ${!this.codeEnabled ? crossSvg : ''}
                </span>
                ${this.renderCustomDropdown('c-ai', this.aiOptions, this.cIdx, (val) => this.cIdx = val)}
                ${this.renderCustomDropdown('c-profile', profileOpts, this.cProfile, (val) => this.cProfile = val)}
                <button class="btn btn-apply interactive ${isLeftDirty ? 'dirty' : ''} ${this.isSyncingLeft ? 'syncing' : ''}" @click=${this.syncLeft}>
                    ${this.isSyncingLeft ? this.getSpinIcon() : this.getCheckIcon()}
                </button>
            </div>

            <div class="pane-group">
                <span class="pane-label voice-label interactive" @click=${() => this.togglePane('voice')} style="cursor:pointer; position:relative; opacity: ${this.voiceEnabled ? 1 : 0.4}">
                    🗣️
                    ${!this.voiceEnabled ? crossSvg : ''}
                </span>
                ${this.renderCustomDropdown('v-ai', this.aiOptions, this.vIdx, (val) => this.vIdx = val)}
                ${this.renderCustomDropdown('v-profile', profileOpts, this.vProfile, (val) => this.vProfile = val)}
                <button class="btn btn-apply interactive ${isRightDirty ? 'dirty' : ''} ${this.isSyncingRight ? 'syncing' : ''}" @click=${this.syncRight}>
                    ${this.isSyncingRight ? this.getSpinIcon() : this.getCheckIcon()}
                </button>
            </div>

            <div class="pane-group">
                <span class="pane-label interactive" @click=${() => this.togglePane('meet')} style="cursor:pointer; position:relative; opacity: ${this.meetEnabled ? 1 : 0.4}">
                    🎥
                    ${!this.meetEnabled ? crossSvg : ''}
                </span>
                ${this.renderCustomDropdown('m-profile', profileOpts, this.mProfile, (val) => this.mProfile = val)}
                <button class="btn btn-apply interactive ${isMeetDirty ? 'dirty' : ''} ${this.isSyncingMeet ? 'syncing' : ''}" @click=${this.syncMeet}>
                    ${this.isSyncingMeet ? this.getSpinIcon() : this.getCheckIcon()}
                </button>
            </div>

            <div class="slider-row interactive">
                <span class="pane-label" style="color: #ccc;">⬛</span>
                <input type="range" min="0" max="1" step="0.05" .value=${this.bgTransparency} @input=${this.handleSliderChange}>
            </div>

            <button class="btn btn-adjust interactive" @click=${() => this.isAdjustMode = true}>
                ${this.getRulerIcon()}
            </button>

            <button class="btn btn-resume interactive" @click=${this.attachResume} title="Attach Resume & Persona">
                📄
            </button>

            <button class="btn btn-abort interactive" @click=${this.abort}>
                ${this.getCrossIcon()}
            </button>
        `;
    }

    render() {
        return html`
            ${this.activeDropdown && !this.isAdjustMode ? html`
                <div class="backdrop interactive" @click=${() => { 
                    this.activeDropdown = null; 
                    // 🟢 FIX: Drop the click wall again when closing the dropdown via backdrop
                    if (window.require) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', true);
                }}></div>
            ` : ''}
            
            <div class="pill-bar"
                 @mouseenter=${() => { if (window.require) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', false); }}
                 @mouseleave=${() => { if (window.require && !this.activeDropdown) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', true); }}>
                
                <div class="save-toast ${this.showToast ? 'visible' : ''}">
                    ${this.getCheckIcon()} Synced
                </div>
                
                <div class="drag-handle">⋮⋮</div>
                
                ${this.isAdjustMode ? this.renderAdjustMode() : this.renderDefaultMode()}
            </div>
        `;
    }
}
customElements.define('instant-widget', InstantWidget);