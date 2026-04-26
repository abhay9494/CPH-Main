import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class SettingsView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            box-sizing: border-box;
            cursor: default !important;
        }
        :host {
            display: block;
            height: 100%;
            width: 100%;
            color: var(--text-color);
            overflow: hidden;
        }
        .settings-container {
            display: flex;
            height: calc(100vh - 55px); /* Account for app header */
            width: 100%;
            overflow: hidden;
        }
        .sidebar {
            width: 180px;
            min-width: 180px; /* 🟢 FIX: Prevent squishing */
            flex-shrink: 0; /* 🟢 FIX: Lock the width */
            background: transparent;
            border-right: 1px solid var(--border-color);
            display: block; /* 🟢 FIX: Changed from flex to block to force scrollbar visibility */
            padding: 0;
            padding-bottom: 25px; /* 🟢 FIX: Extra space at the bottom so the last tab isn't cut off */
            overflow-y: auto;
            overflow-x: hidden;
        }
        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 10px 15px; /* 🐛 FIX: Squished from 12px to 10px */
            text-align: left;
            font-size: 13px;
            transition: 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .tab-btn:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }
        .tab-btn.active {
            background: rgba(255, 255, 255, 0.05); /* 🐛 FIX: Use pure flat overlay instead of alpha-stacking --bg-tertiary */
            color: var(--text-color);
            border-left: 3px solid #4285f4;
            font-weight: bold;
        }
        .content {
            flex: 1;
            padding: 15px 40px; /* 🐛 FIX: Reduced top/bottom padding from 25px to 15px */
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        .scrollable-tab {
            overflow-y: auto;
            flex: 1;
            padding-right: 10px;
        }
        
        /* Standard Scrollbars */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #444); }

        h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 20px;
            font-weight: 600;
        }
        .form-group {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        label {
            font-size: 13px;
            font-weight: bold;
            color: var(--text-secondary);
        }
        textarea, input[type="text"] {
            background: var(--bg-tertiary);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            outline: none;
            font-family: inherit;
        }
        input[type="range"] {
            width: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
            accent-color: #4285f4;
            cursor: default !important;
        }
        textarea {
            resize: vertical;
            min-height: 150px;
        }

        /* 🐛 FIX: Custom Dropdown CSS */
        .custom-dropdown {
            position: relative;
            width: 100%;
        }
        .dropdown-trigger {
            background: var(--bg-tertiary); color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px; border-radius: 4px;
            font-size: 14px; font-family: inherit;
            display: flex; align-items: center; justify-content: space-between;
        }
        .dropdown-trigger:hover { background: var(--hover-background); }
        .dropdown-trigger::after { content: '▼'; font-size: 10px; opacity: 0.5; }
        
        .dropdown-menu {
            position: absolute; top: 100%; left: 0; right: 0;
            background: var(--bg-primary); border: 1px solid var(--border-color);
            border-radius: 4px; margin-top: 4px;
            z-index: 1000; display: flex; flex-direction: column;
            box-shadow: 0 4px 15px rgba(0,0,0,0.8);
            max-height: 200px; overflow-y: auto;
        }
        .dropdown-option {
            padding: 10px; font-size: 14px; color: #ccc;
        }
        .dropdown-option:hover { background: var(--hover-background); color: #fff; }
        .dropdown-option.selected { background: #4285f4; color: #fff; font-weight: bold; }
        .dropdown-menu::-webkit-scrollbar { width: 8px; }
        .dropdown-menu::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        .dropdown-backdrop {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 999;
        }

        .shortcut-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid var(--border-color);
        }
        .shortcut-btn {
            background: var(--bg-tertiary);
            color: #fff;
            border: 1px solid #555;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            min-width: 120px;
            text-align: center;
            transition: 0.2s;
        }
        .shortcut-btn:hover {
            border-color: #888;
        }
        .shortcut-btn.listening {
            background: #a142f4;
            border-color: #a142f4;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        .danger-btn {
            background: rgba(241, 76, 76, 0.1);
            color: #f14c4c;
            border: 1px solid #f14c4c;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 10px;
        }
        .danger-btn:hover {
            background: #f14c4c;
            color: white;
        }
        .save-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #00cc66;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: bold;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            pointer-events: none;
        }
        .save-toast.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* 🎯 NEW: 16-Zone Monitor Matrix CSS */
        .monitor-matrix {
            display: grid;
            width: 100%;
            height: 310px; /* 🐛 FIX: Aggressively shrunk from 380px to 310px */
            background: #0a0a0a;
            border: 6px solid #222; /* 🐛 Thinner outer bezel */
            border-radius: 10px;
            gap: 4px;
            padding: 4px;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
            position: relative;
            transition: all 0.2s ease-out;
            overflow: hidden;
        }
        .matrix-cell {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            cursor: pointer !important;
            overflow: hidden;
        }
        .matrix-cell:hover {
            background: rgba(161, 66, 244, 0.2);
            border-color: #a142f4;
            transform: scale(0.96);
        }
        .matrix-center {
            grid-area: 2 / 2 / 5 / 5; 
            background: rgba(0,0,0,0.6);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px; /* 🐛 FIX: Reduced padding inside the hollow center */
            border: 1px dashed rgba(255,255,255,0.15);
        }
        .zone-editor-modal {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: var(--bg-primary); border: 1px solid var(--border-color);
            padding: 20px; border-radius: 8px; z-index: 1001; width: 420px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9);
        }
        .zone-action-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
            margin-top: 15px; max-height: 300px; overflow-y: auto; padding-right: 5px;
        }
        .action-select-btn {
            background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color);
            padding: 8px 12px; border-radius: 4px; text-align: left; font-size: 12px; transition: 0.2s;
        }
        .action-select-btn:hover { background: var(--hover-background); border-color: #888; }
        .action-select-btn.selected { background: rgba(66, 133, 244, 0.2); border-color: #4285f4; color: #4285f4; font-weight: bold; }
        
        .slider-row { width: 100%; margin-bottom: 4px; } /* 🐛 FIX: Reduced spacing between sliders */
        .slider-row label { display: flex; justify-content: space-between; font-size: 10px; color: #ccc; margin-bottom: 2px; font-weight: bold; } /* 🐛 Thinner text */
    `;

    static properties = {
        activeTab: { type: String },
        prefs: { type: Object },
        keybinds: { type: Object },
        showToast: { type: Boolean },
        listeningKey: { type: String },
        activeDropdown: { type: String },
        editingZone: { type: String }
    };

    constructor() {
        super();
        this.activeTab = 'accounts';
        this.prefs = {
            customPrompt: '',
            theme: 'dark',
            layoutMode: 'normal',
            backgroundTransparency: 0.8,
            fontSize: 12,
            audioMode: 'speaker_only',
            selectedLanguage: 'en-US',
            selectedImageQuality: 'medium',
            googleSearchEnabled: false, 
            interviewRole: 'Software Development Engineer',
            hardwareSetup: 'headphones',
            hotCornerBounds: { cornerSize: 15, centerX: 40, centerY: 40, dwellTime: 3, hideTime: 0 },
            hotCorners: {
                top_left: 'capture', top_center: 'change_ai', top_right: 'hide_unhide',
                middle_left: 'scroll_up', middle_right: 'scroll_down',
                bottom_left: 'send_ai', bottom_center: 'fast_think', bottom_right: 'change_profile'
            }
        };
        this.keybinds = {};
        this.showToast = false;
        this.listeningKey = null;
        this.activeDropdown = null;
        
        this.tabs = [
            { id: 'accounts', icon: '👥', label: 'Accounts' },
            { id: 'profile', icon: '🧠', label: 'Context' },
            { id: 'appearance', icon: '🎨', label: 'Appearance' },
            { id: 'audio', icon: '🔊', label: 'Audio' },
            { id: 'language', icon: '🌍', label: 'Language' },
            { id: 'capture', icon: '📸', label: 'Capture' },
            { id: 'shortcuts', icon: '⌨️', label: 'Shortcuts' },
            { id: 'hotcorners', icon: '🖱️', label: 'Hot Corners' },
            { id: 'typercorners', icon: '🎯', label: 'Typer Corners' },
            { id: 'interviewcorners', icon: '🕵️', label: 'Interview HUD' },
            { id: 'minimap', icon: '🧭', label: 'Minimap Settings' },
            { id: 'search', icon: '🔍', label: 'Search' },
            { id: 'advanced', icon: '⚠️', label: 'Advanced' },  
        ];

        this.shortcutLabels = {
            moveUp: 'Move Window Up', moveDown: 'Move Window Down', moveLeft: 'Move Window Left', moveRight: 'Move Window Right',
            toggleVisibility: 'Toggle Hide/Show', toggleClickThrough: 'Toggle Click-Through', nextStep: 'Capture/Send Prompt',
            previousResponse: 'Previous Response', nextResponse: 'Next Response', scrollUp: 'Scroll Up', scrollDown: 'Scroll Down', 
            emergencyErase: 'Emergency Erase (Wipe Data)', emergencyKill: 'Emergency Kill (Instant Quit)', toggleRadial: '🎯 Spawn Radial HUD (Wrist Flick)'
        };
        this.newProfileName = '';
        this.newProfileAI = '0'; 
        this.editingZone = null;
    }

    async connectedCallback() {
        super.connectedCallback();
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            // 🐛 FIX: Properly extract the data payload!
            const prefs = raw?.data || raw || {};
            this.prefs = { ...this.prefs, ...prefs };

            const keybinds = await window.cheatingDaddy.storage.getKeybinds();
            const defaultKeybinds = {
                moveUp: 'Ctrl+Up', moveDown: 'Ctrl+Down', moveLeft: 'Ctrl+Left', moveRight: 'Ctrl+Right',
                toggleVisibility: 'Ctrl+\\', toggleClickThrough: 'Ctrl+M', nextStep: 'Ctrl+Enter',
                previousResponse: 'Ctrl+[', nextResponse: 'Ctrl+]', scrollUp: 'Ctrl+Shift+Up', scrollDown: 'Ctrl+Shift+Down',
                emergencyErase: 'Ctrl+Shift+E', emergencyKill: 'Ctrl+Shift+Q'
            };
            
            if (keybinds && Object.keys(keybinds).length > 0) {
                this.keybinds = { ...defaultKeybinds, ...keybinds };
            } else {
                this.keybinds = { ...defaultKeybinds };
            }
            
            this.requestUpdate();
        }

        this.handleKeyDown = this.handleKeyDown.bind(this);
        window.addEventListener('keydown', this.handleKeyDown);

        this.syncListener = (e) => {
            if (e.detail && e.detail.key && e.detail.value !== undefined) {
                this.prefs = { ...this.prefs, [e.detail.key]: e.detail.value };
                this.requestUpdate();
            }
        };
        window.addEventListener('sync-preference', this.syncListener);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('sync-preference', this.syncListener);
        if (window.require) {
            window.require('electron').ipcRenderer.send('preview-radial-hud', false);
        }
    }

    // 🐛 FIX: Custom Dropdown Handlers
    toggleDropdown(name) {
        this.activeDropdown = this.activeDropdown === name ? null : name;
        this.requestUpdate();
    }

    closeDropdown() {
        this.activeDropdown = null;
        this.requestUpdate();
    }

    // 🐛 FIX: Custom Dropdown Generator to replace <select>
    renderCustomDropdown(id, options, currentValue, onChangeCallback, width = '100%') {
        const selectedLabel = options.find(o => o.value === String(currentValue))?.label || 'Select';
        return html`
            <div class="custom-dropdown" style="width: ${width};">
                <div class="dropdown-trigger" @click=${(e) => { e.stopPropagation(); this.toggleDropdown(id); }}>
                    ${selectedLabel}
                </div>
                ${this.activeDropdown === id ? html`
                    <div class="dropdown-menu">
                        ${options.map(opt => html`
                            <div class="dropdown-option ${String(currentValue) === opt.value ? 'selected' : ''}" 
                                 @click=${(e) => { 
                                     e.stopPropagation();
                                     onChangeCallback(opt.value); 
                                     this.closeDropdown(); 
                                 }}>
                                ${opt.label}
                            </div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    async savePref(key, value) {
        this.prefs = { ...this.prefs, [key]: value };
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            await window.cheatingDaddy.storage.updatePreference(key, value);
            
            if (key === 'fontSize') {
                document.documentElement.style.setProperty('--response-font-size', `${value}px`);
            }
            
            this.triggerToast();
            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key, value } }));
        }
        this.requestUpdate();
    }

    async saveKeybinds() {
        if (window.cheatingDaddy && window.cheatingDaddy.storage && window.require) {
            await window.cheatingDaddy.storage.setKeybinds(this.keybinds);
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
            this.triggerToast();
        }
    }

    triggerToast() {
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 2000);
    }

    handleKeyDown(e) {
        if (!this.listeningKey) return;
        e.preventDefault(); e.stopPropagation();

        let keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.metaKey) keys.push('Cmd');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        
        if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            let keyName = e.key.toUpperCase();
            if (e.code.startsWith('Arrow')) keyName = e.code.replace('Arrow', '');
            else if (e.code === 'Enter') keyName = 'Enter';
            else if (e.code === 'Space') keyName = 'Space';
            else if (e.key === '\\') keyName = '\\';
            else if (e.key === '[') keyName = '[';
            else if (e.key === ']') keyName = ']';
            keys.push(keyName);
            
            const shortcutStr = keys.join('+');
            this.keybinds = { ...this.keybinds, [this.listeningKey]: shortcutStr };
            this.listeningKey = null;
            this.saveKeybinds();
        }
    }

    startListening(key) { this.listeningKey = key; }

    async handleClearData() {
        if (confirm("⚠️ Are you sure? This will wipe all history, settings, and profiles. The app will immediately close.")) {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                try {
                    await ipcRenderer.invoke('storage:clear-all');
                    await ipcRenderer.invoke('quit-application');
                } catch (e) { console.error("Failed to clear data:", e); }
            }
        }
    }

    async handleLoginAndSave() {
        if (!this.newProfileName.trim()) return alert("Please enter a Profile Nickname!");
        
        const aiIdx = parseInt(this.newProfileAI);
        const aiNames = ['ChatGPT', 'Gemini', 'Grok'];
        const targetName = this.newProfileName.trim();
        
        // 🟢 FIX 1: Properly unpack the database payload before opening the window!
        let raw1 = await window.cheatingDaddy.storage.getPreferences();
        let currentPrefs = raw1?.data || raw1 || {};
        let profiles = currentPrefs.aiProfiles || [];
        
        let existingIndex = profiles.findIndex(p => p.name.toLowerCase() === targetName.toLowerCase());
        let profileId = existingIndex >= 0 ? profiles[existingIndex].id : Date.now().toString();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            alert(`A window will now open for ${aiNames[aiIdx]}.\nPlease log in manually, verify any captchas, and then CLOSE the window when you are done.`);
            
            await ipcRenderer.invoke('open-login-window', profileId, aiIdx);
            
            // 🟢 FIX 2: Properly unpack the database payload AGAIN after the window closes!
            let raw2 = await window.cheatingDaddy.storage.getPreferences();
            currentPrefs = raw2?.data || raw2 || {};
            profiles = currentPrefs.aiProfiles || [];
            
            let finalIndex = profiles.findIndex(p => p.id === profileId);

            if (finalIndex === -1) {
                profiles.push({ id: profileId, name: targetName, loggedAIs: [aiIdx] });
            } else {
                if (!profiles[finalIndex].loggedAIs) profiles[finalIndex].loggedAIs = [];
                if (!profiles[finalIndex].loggedAIs.includes(aiIdx)) {
                    profiles[finalIndex].loggedAIs.push(aiIdx);
                }
            }
            
            await this.savePref('aiProfiles', profiles);
            this.newProfileName = '';
            this.requestUpdate();
        }
    }

    async handleDeleteProfile(profileId) {
        if (!confirm("Are you sure you want to delete this profile?")) return;
        let profiles = this.prefs.aiProfiles ? [...this.prefs.aiProfiles] : [];
        profiles = profiles.filter(p => p.id !== profileId);
        await this.savePref('aiProfiles', profiles);
        this.requestUpdate();
    }

    getShortLabel(action) {
        const labels = {
            'none': '—',              'capture': '📸',         'send_ai': '🚀',        'hide_unhide': '👻',
            'scroll_up': '⬆️',       'scroll_down': '⬇️',      'prev_resp': '◀',       'next_resp': '▶',
            'change_ai': '🤖',       'change_profile': '👤',   'fast_think': '⚡🧠',     'refactor': '🛠️',
            'reset': '✨',           'text_inc': 'A+',         'text_dec': 'A-',        'bg_inc': '⬛',      'bg_dec': '⬜',
            'fix_error': '🔧',       'language': '💻',         'mic': '🎙️',            'toggle_ai_vis': '👁️', 
            'auto_type': '⌨️',       'trim_top': '✂️⬇️',      'trim_bottom': '✂️⬆️',  'abort_typer': '🛑', 'abort_oa': '🚪',
            'expand_top': '➕⬆️',    'expand_bottom': '➕⬇️', 'reset_typer': '✨',
            'toggle_page2': '🔄', 'regenerate': '🔄 Regen'
        };
        return labels[action] || '—';
    }

    renderMatrixCell(id, row, col, label, mapName = 'hotCorners') {
        const currentCorners = this.prefs[mapName] || {};
        const action = currentCorners[id] || 'none';
        const shortLabel = this.getShortLabel(action);
        
        return html`
            <div class="matrix-cell" style="grid-area: ${row} / ${col};" @click=${() => { this.editingZone = id; this.editingMap = mapName; }}>
                <div style="font-size: 16px; margin-bottom: 2px;">${shortLabel}</div>
                <div style="font-size: 8px; opacity: 0.4; text-align: center; line-height: 1.1; padding: 0 2px;">${label}</div>
            </div>
        `;
    }

    renderContent() {
        switch(this.activeTab) {
            case 'accounts':
                const profiles = this.prefs.aiProfiles || [];
                const accountOptions = [
                    {value: '0', label: 'ChatGPT'},
                    {value: '1', label: 'Gemini'},
                    {value: '2', label: 'Grok'}
                ];

                return html`
                    <div class="scrollable-tab">
                        <h2>AI Accounts & Profiles</h2>
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 25px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px;">Add / Update Profile Login</h3>
                            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                                <input type="text" placeholder="Nickname (e.g. John)" 
                                    .value=${this.newProfileName} 
                                    @input=${e => this.newProfileName = e.target.value}
                                    style="flex: 1; min-width: 150px; background: #000; color: #fff; border: 1px solid #444; padding: 8px; border-radius: 4px;">
                                
                                ${this.renderCustomDropdown('newProfileAI', accountOptions, this.newProfileAI, (val) => this.newProfileAI = val, '120px')}

                                <button @click=${this.handleLoginAndSave} style="background: #4285f4; color: white; border: none; padding: 10px 15px; border-radius: 4px; font-weight: bold;">
                                    Login & Save
                                </button>
                            </div>
                        </div>

                        <h3 style="font-size: 14px; margin-bottom: 10px;">Saved Profiles</h3>
                        ${profiles.length === 0 ? html`<p style="color: #888; font-size: 13px;">No profiles added yet.</p>` : html`
                            <div style="border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: var(--bg-tertiary);">
                                    <thead>
                                        <tr style="background: rgba(0,0,0,0.4); border-bottom: 1px solid var(--border-color);">
                                            <th style="padding: 12px 15px; font-weight: 600; color: var(--text-secondary);">Nickname</th>
                                            <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: var(--text-secondary);">ChatGPT</th>
                                            <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: var(--text-secondary);">Gemini</th>
                                            <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: var(--text-secondary);">Grok</th>
                                            <th style="padding: 12px 15px; text-align: center; font-weight: 600; color: var(--text-secondary);">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${profiles.map((p, index) => html`
                                            <tr style="border-bottom: ${index === profiles.length - 1 ? 'none' : '1px solid var(--border-color)'};">
                                                <td style="padding: 12px 15px; font-weight: bold; color: var(--text-color);">👤 ${p.name}</td>
                                                <td style="padding: 12px 15px; text-align: center;">${p.loggedAIs.includes(0) ? html`<span style="color: #00cc66;">✅</span>` : html`<span style="color: #444;">❌</span>`}</td>
                                                <td style="padding: 12px 15px; text-align: center;">${p.loggedAIs.includes(1) ? html`<span style="color: #00cc66;">✅</span>` : html`<span style="color: #444;">❌</span>`}</td>
                                                <td style="padding: 12px 15px; text-align: center;">${p.loggedAIs.includes(2) ? html`<span style="color: #00cc66;">✅</span>` : html`<span style="color: #444;">❌</span>`}</td>
                                                <td style="padding: 12px 15px; text-align: center;">
                                                    <button @click=${() => this.handleDeleteProfile(p.id)} style="background: rgba(241, 76, 76, 0.1); color: #f14c4c; border: 1px solid #f14c4c; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold;">Delete</button>
                                                </td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            </div>
                        `}

                        <div style="background: rgba(161, 66, 244, 0.05); padding: 15px; border-radius: 6px; border: 1px solid rgba(161, 66, 244, 0.3); margin-top: 25px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 5px; color: #a142f4;">🧠 Dual-Brain Loadouts (Live Interview)</h3>
                            <p style="font-size: 11px; color: #ccc; margin-bottom: 15px;">Configure which AI engine and profile handles Audio (Fast) and which handles Vision/Code (Thinking).</p>
                            
                            <div style="display: flex; gap: 15px;">
                                <div style="flex: 1; border: 1px dashed rgba(255,255,255,0.1); padding: 10px; border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #00cc66;">🗣️ Voice Brain</div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${this.renderCustomDropdown('voiceEngine', accountOptions, this.prefs.dualBrainLoadouts?.[0]?.voiceEngine || 0, (val) => {
                                            let l = [...(this.prefs.dualBrainLoadouts || [])];
                                            if(!l[0]) l[0] = {}; l[0].voiceEngine = parseInt(val); this.savePref('dualBrainLoadouts', l);
                                        })}
                                        ${this.renderCustomDropdown('voiceProfile', profiles.map(p => ({value: p.id, label: p.name})), this.prefs.dualBrainLoadouts?.[0]?.voiceProfileId || '', (val) => {
                                            let l = [...(this.prefs.dualBrainLoadouts || [])];
                                            if(!l[0]) l[0] = {}; l[0].voiceProfileId = val; this.savePref('dualBrainLoadouts', l);
                                        })}
                                    </div>
                                </div>
                                <div style="flex: 1; border: 1px dashed rgba(255,255,255,0.1); padding: 10px; border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #4285f4;">💻 Code Brain</div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${this.renderCustomDropdown('codeEngine', accountOptions, this.prefs.dualBrainLoadouts?.[0]?.codeEngine || 1, (val) => {
                                            let l = [...(this.prefs.dualBrainLoadouts || [])];
                                            if(!l[0]) l[0] = {}; l[0].codeEngine = parseInt(val); this.savePref('dualBrainLoadouts', l);
                                        })}
                                        ${this.renderCustomDropdown('codeProfile', profiles.map(p => ({value: p.id, label: p.name})), this.prefs.dualBrainLoadouts?.[0]?.codeProfileId || '', (val) => {
                                            let l = [...(this.prefs.dualBrainLoadouts || [])];
                                            if(!l[0]) l[0] = {}; l[0].codeProfileId = val; this.savePref('dualBrainLoadouts', l);
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                `;

            case 'profile':
                return html`
                    <div class="scrollable-tab">
                        <h2>Context & Identity Vault</h2>
                        <div class="form-group" style="margin-bottom: 25px;">
                            <label>Target Interview Role</label>
                            <p style="font-size: 12px; color: var(--text-muted); margin-top: -5px;">(e.g., SDE, Product Manager, Business Analyst, Cyber Security)</p>
                            <input type="text" .value=${this.prefs.interviewRole || ''} @change=${(e) => this.savePref('interviewRole', e.target.value)} placeholder="e.g. Senior Frontend Developer">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;"> <label>Resume & Raw Experience Data</label>
                            <p style="font-size: 12px; color: var(--text-muted); margin-top: -5px; line-height: 1.4;">
                                Copy and paste your raw resume text here to prevent PDF formatting errors. <br>
                                The AI will use this strictly as background knowledge when answering.
                            </p>
                        <textarea .value=${this.prefs.customPrompt || ''} 
                              @change=${(e) => this.savePref('customPrompt', e.target.value)}
                              placeholder="Paste resume text, past projects, or specific metrics here..."></textarea>
                        </div>
                    </div> `;
            case 'appearance':
                const themeOpts = [
                    {value: 'dark', label: 'Dark'},
                    {value: 'light', label: 'Light'},
                    {value: 'midnight', label: 'Midnight Blue'},
                    {value: 'sepia', label: 'Sepia'},
                    {value: 'nord', label: 'Nord'},
                    {value: 'dracula', label: 'Dracula'},
                    {value: 'abyss', label: 'Abyss'}
                ];
                const layoutOpts = [
                    {value: 'normal', label: 'Normal'},
                    {value: 'compact', label: 'Compact'}
                ];
            
                return html`
                    <div class="scrollable-tab">
                        <h2>Appearance</h2>
                        <div class="form-group">
                            <label>Theme</label>
                            ${this.renderCustomDropdown('theme', themeOpts, this.prefs.theme, (val) => this.savePref('theme', val))}
                        </div>
                        <div class="form-group">
                            <label>Layout Mode</label>
                            ${this.renderCustomDropdown('layoutMode', layoutOpts, this.prefs.layoutMode, (val) => this.savePref('layoutMode', val))}
                        </div>
                        <div class="form-group">
                            <label>Background Transparency (${Math.round(this.prefs.backgroundTransparency * 100)}%)</label>
                            <input type="range" min="0" max="1" step="0.05" .value=${this.prefs.backgroundTransparency} @input=${(e) => this.savePref('backgroundTransparency', parseFloat(e.target.value))}>
                        </div>
                        <div class="form-group">
                            <label>Response Font Size (${this.prefs.fontSize}px)</label>
                            <input type="range" min="12" max="32" step="1" .value=${this.prefs.fontSize} @input=${(e) => this.savePref('fontSize', parseInt(e.target.value, 10))}>
                        </div>
            
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 15px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 15px; color: #fff;">Main Display Geometry</h3>
                            
                            <div class="slider-row" style="margin-bottom: 15px;">
                                <label style="font-size: 12px;"><span>Window Width</span> <span style="color: #4285f4;">${this.prefs.mainWindowWidth || 900}px</span></label>
                                <input type="range" min="400" max="1920" step="10" .value=${this.prefs.mainWindowWidth || 900} 
                                    @input=${(e) => {
                                        const val = parseInt(e.target.value);
                                        this.savePref('mainWindowWidth', val);
                                        if (window.require) window.require('electron').ipcRenderer.send('live-resize-main-window', { width: val, height: this.prefs.mainWindowHeight || 500 });
                                    }}>
                            </div>
                                
                            <div class="slider-row" style="margin: 0;">
                                <label style="font-size: 12px;"><span>Window Height</span> <span style="color: #00cc66;">${this.prefs.mainWindowHeight || 500}px</span></label>
                                <input type="range" min="300" max="1080" step="10" .value=${this.prefs.mainWindowHeight || 500} 
                                    @input=${(e) => {
                                        const val = parseInt(e.target.value);
                                        this.savePref('mainWindowHeight', val);
                                        if (window.require) window.require('electron').ipcRenderer.send('live-resize-main-window', { width: this.prefs.mainWindowWidth || 900, height: val });
                                    }}>
                            </div>
                        </div>
                    </div>
                `;

            case 'audio':
                const audioOpts = [
                    {value: 'speaker_only', label: 'Speaker Only (Interviewer)'},
                    {value: 'mic_only', label: 'Microphone Only (Me)'},
                    {value: 'both', label: 'Both Speaker & Microphone'}
                ];
                const hardwareOpts = [
                    {value: 'headphones', label: '🎧 Headphones (Clean Audio)'},
                    {value: 'speakers', label: '🔊 Laptop Speakers (Mixed/Echo Audio)'}
                ];
                return html`
                    <h2>Audio Capture & Environment</h2>
                    <div class="form-group">
                        <label>Hardware Environment</label>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: -5px; line-height: 1.4;">
                            Crucial for the AI to understand the transcript context. If using speakers, the AI will be primed to filter out your own echo.
                        </p>
                        ${this.renderCustomDropdown('hardwareSetup', hardwareOpts, this.prefs.hardwareSetup || 'headphones', (val) => this.savePref('hardwareSetup', val))}
                    </div>
                    <div class="form-group" style="margin-top: 15px;">
                        <label>Capture Mode</label>
                        ${this.renderCustomDropdown('audioMode', audioOpts, this.prefs.audioMode, (val) => this.savePref('audioMode', val))}
                    </div>
                `;
            case 'language':
                const langOpts = [
                    {value: 'en-US', label: 'English (US)'}, {value: 'en-GB', label: 'English (UK)'},
                    {value: 'es-ES', label: 'Spanish'}, {value: 'fr-FR', label: 'French'},
                    {value: 'de-DE', label: 'German'}, {value: 'hi-IN', label: 'Hindi'},
                    {value: 'zh-CN', label: 'Chinese (Simplified)'}
                ];
                return html`
                    <h2>Speech Recognition</h2>
                    <div class="form-group">
                        <label>Primary Language</label>
                        ${this.renderCustomDropdown('selectedLanguage', langOpts, this.prefs.selectedLanguage, (val) => this.savePref('selectedLanguage', val))}
                    </div>
                `;
            case 'capture':
                const qualOpts = [
                    {value: 'high', label: 'High Quality (Slower Upload)'},
                    {value: 'medium', label: 'Medium Quality (Balanced)'},
                    {value: 'low', label: 'Low Quality (Fast Upload)'}
                ];
                return html`
                    <h2>Screenshot Quality</h2>
                    <div class="form-group">
                        <label>Resolution Settings</label>
                        ${this.renderCustomDropdown('selectedImageQuality', qualOpts, this.prefs.selectedImageQuality, (val) => this.savePref('selectedImageQuality', val))}
                    </div>
                `;
            case 'shortcuts':
                return html`
                    <div class="scrollable-tab">
                    <h2>Keyboard Shortcuts</h2>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: -10px; margin-bottom: 20px;">
                        Click a button below, then press the new key combination you want to bind.
                    </p>
                    <div style="display: flex; flex-direction: column;">
                        ${Object.entries(this.shortcutLabels).map(([key, label]) => html`
                            <div class="shortcut-row">
                                <span>${label}</span>
                                <button class="shortcut-btn ${this.listeningKey === key ? 'listening' : ''}" @click=${() => this.startListening(key)}>
                                    ${this.listeningKey === key ? 'Press keys...' : this.keybinds[key] || 'Unbound'}
                                </button>
                            </div>
                        `)}
                    </div>
                    </div>
                `;
            
            case 'hotcorners': {
                const cornerActions = [
                    {value: 'none', label: 'None (Disabled)'}, {value: 'capture', label: '📸 Capture Screen'},
                    {value: 'send_ai', label: '🚀 Send to AI'}, {value: 'fix_error', label: '🔧 Fix Error'},
                    {value: 'auto_type', label: '⌨️ Trigger Auto-Type'}, {value: 'abort_oa', label: '🚪 Abort OA & Exit'},
                    {value: 'hide_unhide', label: '👻 Hide / Unhide (INSTANT)'}, {value: 'toggle_ai_vis', label: '👁️ Show / Hide AI'},
                    {value: 'scroll_up', label: '⬆️ Scroll Up'}, {value: 'scroll_down', label: '⬇️ Scroll Down'},
                    {value: 'prev_resp', label: '◀ Previous Response'}, {value: 'next_resp', label: '▶ Next Response'},
                    {value: 'change_ai', label: '🤖 Change AI Model'}, {value: 'change_profile', label: '👤 Change Profile'},
                    {value: 'fast_think', label: '🧠 Toggle Fast/Think'}, {value: 'language', label: '💻 Change Language'},
                    {value: 'refactor', label: '🛠️ Refactor Code'}, {value: 'mic', label: '🎙️ Toggle Mic'},
                    {value: 'reset', label: '✨ Reset Session'}, {value: 'text_inc', label: 'A+ Text Size'},
                    {value: 'text_dec', label: 'A- Text Size'}, {value: 'bg_inc', label: '⬛ Opacity +'}, {value: 'bg_dec', label: '⬜ Opacity -'},
                    {value: 'toggle_page2', label: '🔄 Toggle Page 1/2'} // 🟢 NEW
                ];
                
                this.editingPage = this.editingPage || 1; // Default to Page 1
                const b = this.prefs.hotCornerBounds || { cornerSize: 20, centerX: 20, centerY: 20, dwellTime: 3, hideTime: 0 };
                
                // Read from Page 1 or Page 2 based on toggle
                const activeMapName = this.editingPage === 1 ? 'hotCorners' : 'hotCornersPage2';
                const currentCorners = this.prefs[activeMapName] || {};
                
                // 🟢 CLUTTER FILTER: Find all used actions
                const usedActions = Object.values(currentCorners);

                let midX = Math.max(0, (100 - (2 * b.cornerSize) - b.centerX) / 2);
                let midY = Math.max(0, (100 - (2 * b.cornerSize) - b.centerY) / 2);

                const gridCols = `${b.cornerSize}fr ${midX}fr ${b.centerX}fr ${midX}fr ${b.cornerSize}fr`;
                const gridRows = `${b.cornerSize}fr ${midY}fr ${b.centerY}fr ${midY}fr ${b.cornerSize}fr`;

                return html`
                    <div class="scrollable-tab">
                        <h2 style="margin-bottom: 5px;">Interactive Monitor Map</h2>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
                            Click any zone on the screen to assign an action. Drag the sliders in the center to physically adjust your hitboxes in real-time.
                        </p>

                        <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                            <div style="display: flex; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 3px;">
                                <button @click=${() => { this.editingPage = 1; this.requestUpdate(); }} style="background: ${this.editingPage === 1 ? '#4285f4' : 'transparent'}; color: ${this.editingPage === 1 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: default !important; transition: 0.2s;">📄 Page 1 (Primary)</button>
                                <button @click=${() => { this.editingPage = 2; this.requestUpdate(); }} style="background: ${this.editingPage === 2 ? '#a142f4' : 'transparent'}; color: ${this.editingPage === 2 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: default !important; transition: 0.2s;">📄 Page 2 (Shift)</button>
                            </div>
                        </div>
                        
                        <div class="monitor-matrix" style="grid-template-columns: ${gridCols}; grid-template-rows: ${gridRows};">
                            
                            ${this.renderMatrixCell('top_left', 1, 1, 'Top-L Corner', activeMapName)}
                            ${this.renderMatrixCell('top_mid_left', 1, 2, 'Top-Mid-L', activeMapName)}
                            ${this.renderMatrixCell('top_center', 1, 3, 'Top Center', activeMapName)}
                            ${this.renderMatrixCell('top_mid_right', 1, 4, 'Top-Mid-R', activeMapName)}
                            ${this.renderMatrixCell('top_right', 1, 5, 'Top-R Corner', activeMapName)}

                            ${this.renderMatrixCell('left_mid_top', 2, 1, 'Left-Mid-T', activeMapName)}
                            ${this.renderMatrixCell('right_mid_top', 2, 5, 'Right-Mid-T', activeMapName)}

                            ${this.renderMatrixCell('middle_left', 3, 1, 'Left Center', activeMapName)}
                            ${this.renderMatrixCell('middle_right', 3, 5, 'Right Center', activeMapName)}

                            ${this.renderMatrixCell('left_mid_bottom', 4, 1, 'Left-Mid-B', activeMapName)}
                            ${this.renderMatrixCell('right_mid_bottom', 4, 5, 'Right-Mid-B', activeMapName)}

                            ${this.renderMatrixCell('bottom_left', 5, 1, 'Bot-L Corner', activeMapName)}
                            ${this.renderMatrixCell('bottom_mid_left', 5, 2, 'Bot-Mid-L', activeMapName)}
                            ${this.renderMatrixCell('bottom_center', 5, 3, 'Bot Center', activeMapName)}
                            ${this.renderMatrixCell('bottom_mid_right', 5, 4, 'Bot-Mid-R', activeMapName)}
                            ${this.renderMatrixCell('bottom_right', 5, 5, 'Bot-R Corner', activeMapName)}

                            <div class="matrix-center" style="padding: 6px 12px; border-color: #a142f4; background: rgba(161, 66, 244, 0.1);">
                                <h3 style="margin-top: 0; color: #fff; font-size: 11px; text-align: center; margin-bottom: 6px;">GEOMETRY CONFIG</h3>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; width: 100%;">
                                    <div class="slider-row">
                                        <label><span>Corner %</span> <span style="color: #4285f4;">${b.cornerSize}%</span></label>
                                        <input type="range" min="5" max="30" step="1" .value=${b.cornerSize} @input=${(e) => this.savePref('hotCornerBounds', {...b, cornerSize: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Dwell Delay</span> <span style="color: #f59e0b;">${b.dwellTime || 3}s</span></label>
                                        <input type="range" min="1" max="5" step="0.5" .value=${b.dwellTime || 3} @input=${(e) => this.savePref('hotCornerBounds', {...b, dwellTime: parseFloat(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Top/Bot Width</span> <span style="color: #00cc66;">${b.centerX}%</span></label>
                                        <input type="range" min="10" max="70" step="5" .value=${b.centerX} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerX: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>L/R Height</span> <span style="color: #00cc66;">${b.centerY}%</span></label>
                                        <input type="range" min="10" max="70" step="5" .value=${b.centerY} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerY: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row" style="grid-column: span 2;">
                                        <label><span>Unhide Delay</span> <span style="color: #ff4444;">${(b.hideTime || 0) === 0 ? 'Instant' : (b.hideTime || 0) + 's'}</span></label>
                                        <input type="range" min="0" max="5" step="0.5" .value=${b.hideTime || 0} @input=${(e) => this.savePref('hotCornerBounds', {...b, hideTime: parseFloat(e.target.value)})}>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.editingZone && (this.editingMap === 'hotCorners' || this.editingMap === 'hotCornersPage2') ? html`
                        <div class="dropdown-backdrop" @click=${() => this.editingZone = null}></div>
                        <div class="zone-editor-modal">
                            <h3 style="margin-top: 0; margin-bottom: 5px; color: #fff;">Assign Action</h3>
                            <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Select what happens when you hover over the <strong>${this.editingZone.replace(/_/g, ' ').toUpperCase()}</strong> zone.</p>
                            
                            <div class="zone-action-grid">
                                ${cornerActions.filter(act => act.value === 'none' || act.value === currentCorners[this.editingZone] || !usedActions.includes(act.value)).map(act => html`
                                    <button class="action-select-btn ${currentCorners[this.editingZone] === act.value ? 'selected' : ''}"
                                        @click=${() => {
                                            const newCorners = { ...currentCorners, [this.editingZone]: act.value };
                                            // 🟢 FIX: Save to the active map dynamically!
                                            this.savePref(this.editingMap, newCorners);
                                            this.editingZone = null;
                                        }}>
                                        ${act.label}
                                    </button>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                `;
            }

            case 'typercorners': {
                const typerActionsList = [
                    {value: 'none', label: 'None (Disabled)'},
                    {value: 'auto_type', label: '▶️ Start / Pause / Resume'},
                    {value: 'trim_top', label: '✂️ Unselect Top Line (Hold)'},
                    {value: 'expand_top', label: '➕ Expand Top Line (Hold)'},
                    {value: 'trim_bottom', label: '✂️ Unselect Bottom Line (Hold)'},
                    {value: 'expand_bottom', label: '➕ Expand Bottom Line (Hold)'},
                    {value: 'reset_typer', label: '🔄 Reset Selection'},
                    {value: 'abort_typer', label: '🛑 Abort & Go Back'},
                    {value: 'abort_oa', label: '🚪 Abort OA & Exit'},
                    {value: 'hide_unhide', label: '👻 Hide / Unhide'},
                    {value: 'scroll_up', label: '⬆️ Scroll Up'},
                    {value: 'scroll_down', label: '⬇️ Scroll Down'}
                ];
                
                const tb = this.prefs.hotCornerBounds || { cornerSize: 20, centerX: 20, centerY: 20, dwellTime: 3, hideTime: 0 };
                let tMidX = Math.max(0, (100 - (2 * tb.cornerSize) - tb.centerX) / 2);
                let tMidY = Math.max(0, (100 - (2 * tb.cornerSize) - tb.centerY) / 2);
                const tGridCols = `${tb.cornerSize}fr ${tMidX}fr ${tb.centerX}fr ${tMidX}fr ${tb.cornerSize}fr`;
                const tGridRows = `${tb.cornerSize}fr ${tMidY}fr ${tb.centerY}fr ${tMidY}fr ${tb.cornerSize}fr`;
                const currentTyperCorners = this.prefs.typerHotCorners || {};

                return html`
                    <div class="scrollable-tab">
                        <h2 style="margin-bottom: 5px;">Typer Ghost Mode Map</h2>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
                            When you switch to the Auto-Typer, the AI swaps to this brain. Holding the scissors will continuously trim lines.
                        </p>
                        <div class="monitor-matrix" style="grid-template-columns: ${tGridCols}; grid-template-rows: ${tGridRows};">
                            ${this.renderMatrixCell('top_left', 1, 1, 'Top-L Corner', 'typerHotCorners')}
                            ${this.renderMatrixCell('top_mid_left', 1, 2, 'Top-Mid-L', 'typerHotCorners')}
                            ${this.renderMatrixCell('top_center', 1, 3, 'Top Center', 'typerHotCorners')}
                            ${this.renderMatrixCell('top_mid_right', 1, 4, 'Top-Mid-R', 'typerHotCorners')}
                            ${this.renderMatrixCell('top_right', 1, 5, 'Top-R Corner', 'typerHotCorners')}
                            
                            ${this.renderMatrixCell('left_mid_top', 2, 1, 'Left-Mid-T', 'typerHotCorners')}
                            ${this.renderMatrixCell('right_mid_top', 2, 5, 'Right-Mid-T', 'typerHotCorners')}
                            ${this.renderMatrixCell('middle_left', 3, 1, 'Left Center', 'typerHotCorners')}
                            ${this.renderMatrixCell('middle_right', 3, 5, 'Right Center', 'typerHotCorners')}
                            ${this.renderMatrixCell('left_mid_bottom', 4, 1, 'Left-Mid-B', 'typerHotCorners')}
                            ${this.renderMatrixCell('right_mid_bottom', 4, 5, 'Right-Mid-B', 'typerHotCorners')}
                            
                            ${this.renderMatrixCell('bottom_left', 5, 1, 'Bot-L Corner', 'typerHotCorners')}
                            ${this.renderMatrixCell('bottom_mid_left', 5, 2, 'Bot-Mid-L', 'typerHotCorners')}
                            ${this.renderMatrixCell('bottom_center', 5, 3, 'Bot Center', 'typerHotCorners')}
                            ${this.renderMatrixCell('bottom_mid_right', 5, 4, 'Bot-Mid-R', 'typerHotCorners')}
                            ${this.renderMatrixCell('bottom_right', 5, 5, 'Bot-R Corner', 'typerHotCorners')}
                            
                            <div class="matrix-center" style="padding: 6px 12px; border-color: #a142f4; background: rgba(161, 66, 244, 0.1);">
                                <h3 style="margin-top: 0; color: #fff; font-size: 11px; text-align: center; margin-bottom: 6px;">TYPER SETTINGS</h3>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; width: 100%;">
                                    <div class="slider-row">
                                        <label><span>Start Delay</span> <span style="color: #a142f4;">${this.prefs.typerDelay ?? 5}s</span></label>
                                        <input type="range" min="0" max="10" step="1" .value=${this.prefs.typerDelay ?? 5} @input=${(e) => this.savePref('typerDelay', parseInt(e.target.value))}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Select Speed</span> <span style="color: #00cc66;">${this.prefs.typerSelectionSpeed ?? 0.5}s</span></label>
                                        <input type="range" min="0.1" max="2.0" step="0.1" .value=${this.prefs.typerSelectionSpeed ?? 0.5} @input=${(e) => this.savePref('typerSelectionSpeed', parseFloat(e.target.value))}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Typer Speed</span> <span style="color: #a142f4;">${this.prefs.wpmSpeed || 60}</span></label>
                                        <input type="range" min="10" max="180" step="10" .value=${this.prefs.wpmSpeed || 60} @input=${(e) => this.savePref('wpmSpeed', parseInt(e.target.value))}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Mistakes</span> <span style="color: #f14c4c;">${this.prefs.typerMistakes ?? 2}%</span></label>
                                        <input type="range" min="0" max="15" step="1" .value=${this.prefs.typerMistakes ?? 2} @input=${(e) => this.savePref('typerMistakes', parseInt(e.target.value))}>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.editingZone && this.editingMap === 'typerHotCorners' ? html`
                        <div class="dropdown-backdrop" @click=${() => this.editingZone = null}></div>
                        <div class="zone-editor-modal">
                            <h3 style="margin-top: 0; margin-bottom: 5px; color: #fff;">Assign Typer Action</h3>
                            <div class="zone-action-grid">
                                ${typerActionsList.filter(act => act.value === 'none' || act.value === currentTyperCorners[this.editingZone] || !Object.values(currentTyperCorners).includes(act.value)).map(act => html`
                                    <button class="action-select-btn ${currentTyperCorners[this.editingZone] === act.value ? 'selected' : ''}" 
                                            @click=${() => {
                                                const newCorners = { ...currentTyperCorners, [this.editingZone]: act.value };
                                                this.savePref('typerHotCorners', newCorners);
                                                this.editingZone = null;
                                            }}>
                                        ${act.label}
                                    </button>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                `;
            }

            case 'interviewcorners': {
                const interviewActions = [
                    {value: 'none', label: 'None (Disabled)'}, 
                    {value: 'capture', label: '📸 Capture Screen'},
                    {value: 'send_ai', label: '🚀 Send to AI'}, 
                    {value: 'fix_error', label: '🔧 Fix Error'},
                    {value: 'regenerate', label: '🔄 Regenerate Response'}, 
                    {value: 'abort_oa', label: '🚪 Abort Interview & Exit'},
                    {value: 'hide_unhide', label: '👻 Hide / Unhide (INSTANT)'}, 
                    {value: 'toggle_ai_vis', label: '👁️ Show / Hide AI'},
                    {value: 'scroll_up', label: '⬆️ Scroll Up'}, 
                    {value: 'scroll_down', label: '⬇️ Scroll Down'},
                    {value: 'prev_resp', label: '◀ Previous Response'}, 
                    {value: 'next_resp', label: '▶ Next Response'},
                    {value: 'change_ai', label: '🤖 Change AI Model'}, 
                    {value: 'change_profile', label: '👤 Switch Profile'},
                    {value: 'fast_think', label: '🧠 Toggle Fast/Think'}, 
                    {value: 'language', label: '💻 Change Language'},
                    {value: 'reset', label: '✨ Reset Session'}, 
                    {value: 'text_inc', label: 'A+ Text Size'}, 
                    {value: 'text_dec', label: 'A- Text Size'}, 
                    {value: 'bg_inc', label: '⬛ Opacity +'}, 
                    {value: 'bg_dec', label: '⬜ Opacity -'},
                    {value: 'toggle_page2', label: '🔄 Toggle Page 1/2'}
                ];
                this.editingPage = this.editingPage || 1;
                const activeMapName = this.editingPage === 1 ? 'interviewCorners' : 'interviewCornersPage2';
                const currentCorners = this.prefs[activeMapName] || {};
                
                // 🟢 FIX: Dynamic Layout & Sliders (Exact match to Hot Corners)
                const b = this.prefs.hotCornerBounds || { cornerSize: 20, centerX: 20, centerY: 20, dwellTime: 3, hideTime: 0 };
                let midX = Math.max(0, (100 - (2 * b.cornerSize) - b.centerX) / 2);
                let midY = Math.max(0, (100 - (2 * b.cornerSize) - b.centerY) / 2);
                const gridCols = `${b.cornerSize}fr ${midX}fr ${b.centerX}fr ${midX}fr ${b.cornerSize}fr`;
                const gridRows = `${b.cornerSize}fr ${midY}fr ${b.centerY}fr ${midY}fr ${b.cornerSize}fr`;

                return html`
                    <div class="scrollable-tab">
                        
                        <div style="background: rgba(241, 76, 76, 0.1); border: 1px solid #f14c4c; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px; color: #f14c4c;">🚨 Emergency Edge Stealth</h3>
                            <p style="font-size: 11px; color: #ccc; margin-bottom: 10px;">Pick a screen edge to instantly hide the app during an interview without using your keyboard. Unhide uses the delay slider below.</p>
                            ${this.renderCustomDropdown('interviewStealthEdge', [
                                {value: 'none', label: 'None (Disabled)'},
                                {value: 'top_left', label: 'Top-Left Corner'},
                                {value: 'top_mid_left', label: 'Top-Mid-Left Edge'},
                                {value: 'top_center', label: 'Top-Center Edge'},
                                {value: 'top_mid_right', label: 'Top-Mid-Right Edge'},
                                {value: 'top_right', label: 'Top-Right Corner'},
                                {value: 'left_mid_top', label: 'Left-Mid-Top Edge'},
                                {value: 'right_mid_top', label: 'Right-Mid-Top Edge'},
                                {value: 'middle_left', label: 'Middle-Left Edge'},
                                {value: 'middle_right', label: 'Middle-Right Edge'},
                                {value: 'left_mid_bottom', label: 'Left-Mid-Bottom Edge'},
                                {value: 'right_mid_bottom', label: 'Right-Mid-Bottom Edge'},
                                {value: 'bottom_left', label: 'Bottom-Left Corner'},
                                {value: 'bottom_mid_left', label: 'Bottom-Mid-Left Edge'},
                                {value: 'bottom_center', label: 'Bottom-Center Edge'},
                                {value: 'bottom_mid_right', label: 'Bottom-Mid-Right Edge'},
                                {value: 'bottom_right', label: 'Bottom-Right Corner'}
                            ], this.prefs.interviewStealthEdge || 'none', (val) => this.savePref('interviewStealthEdge', val))}
                        </div>

                        <h2 style="margin-bottom: 5px;">Live Interview Radial Map</h2>
                        <p style="font-size: 11px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">
                            Map the 16 zones for your Wrist-Flick Radial HUD. The physical grid represents the 360-degree circle.
                        </p>
                        <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                            <div style="display: flex; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 3px;">
                                <button @click=${() => { this.editingPage = 1; this.requestUpdate(); }} style="background: ${this.editingPage === 1 ? '#4285f4' : 'transparent'}; color: ${this.editingPage === 1 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; transition: 0.2s;">📄 Page 1 (Primary)</button>
                                <button @click=${() => { this.editingPage = 2; this.requestUpdate(); }} style="background: ${this.editingPage === 2 ? '#a142f4' : 'transparent'}; color: ${this.editingPage === 2 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: bold; transition: 0.2s;">📄 Page 2 (Shift)</button>
                            </div>
                        </div>
                        <div class="monitor-matrix" style="grid-template-columns: ${gridCols}; grid-template-rows: ${gridRows}; height: 260px;">
                            ${this.renderMatrixCell('top_left', 1, 1, 'Top-L', activeMapName)}
                            ${this.renderMatrixCell('top_mid_left', 1, 2, 'Top-Mid-L', activeMapName)}
                            ${this.renderMatrixCell('top_center', 1, 3, 'Top Center', activeMapName)}
                            ${this.renderMatrixCell('top_mid_right', 1, 4, 'Top-Mid-R', activeMapName)}
                            ${this.renderMatrixCell('top_right', 1, 5, 'Top-R', activeMapName)}

                            ${this.renderMatrixCell('left_mid_top', 2, 1, 'Left-Mid-T', activeMapName)}
                            ${this.renderMatrixCell('right_mid_top', 2, 5, 'Right-Mid-T', activeMapName)}
                            ${this.renderMatrixCell('middle_left', 3, 1, 'Left Center', activeMapName)}
                            ${this.renderMatrixCell('middle_right', 3, 5, 'Right Center', activeMapName)}
                            ${this.renderMatrixCell('left_mid_bottom', 4, 1, 'Left-Mid-B', activeMapName)}
                            ${this.renderMatrixCell('right_mid_bottom', 4, 5, 'Right-Mid-B', activeMapName)}

                            ${this.renderMatrixCell('bottom_left', 5, 1, 'Bot-L', activeMapName)}
                            ${this.renderMatrixCell('bottom_mid_left', 5, 2, 'Bot-Mid-L', activeMapName)}
                            ${this.renderMatrixCell('bottom_center', 5, 3, 'Bot Center', activeMapName)}
                            ${this.renderMatrixCell('bottom_mid_right', 5, 4, 'Bot-Mid-R', activeMapName)}
                            ${this.renderMatrixCell('bottom_right', 5, 5, 'Bot-R', activeMapName)}
                            
                            <div class="matrix-center" style="padding: 6px 12px; border-color: #a142f4; background: rgba(161, 66, 244, 0.1);">
                                <h3 style="margin-top: 0; color: #fff; font-size: 11px; text-align: center; margin-bottom: 6px;">GEOMETRY CONFIG</h3>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; width: 100%;">
                                    <div class="slider-row">
                                        <label><span>Corner %</span> <span style="color: #4285f4;">${b.cornerSize}%</span></label>
                                        <input type="range" min="5" max="30" step="1" .value=${b.cornerSize} @input=${(e) => this.savePref('hotCornerBounds', {...b, cornerSize: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Dwell Delay</span> <span style="color: #f59e0b;">${b.dwellTime || 3}s</span></label>
                                        <input type="range" min="1" max="5" step="0.5" .value=${b.dwellTime || 3} @input=${(e) => this.savePref('hotCornerBounds', {...b, dwellTime: parseFloat(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>Top/Bot Width</span> <span style="color: #00cc66;">${b.centerX}%</span></label>
                                        <input type="range" min="10" max="70" step="5" .value=${b.centerX} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerX: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row">
                                        <label><span>L/R Height</span> <span style="color: #00cc66;">${b.centerY}%</span></label>
                                        <input type="range" min="10" max="70" step="5" .value=${b.centerY} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerY: parseInt(e.target.value)})}>
                                    </div>
                                    <div class="slider-row" style="grid-column: span 2;">
                                        <label><span>Unhide Delay</span> <span style="color: #ff4444;">${(b.hideTime || 0) === 0 ? 'Instant' : (b.hideTime || 0) + 's'}</span></label>
                                        <input type="range" min="0" max="5" step="0.5" .value=${b.hideTime || 0} @input=${(e) => this.savePref('hotCornerBounds', {...b, hideTime: parseFloat(e.target.value)})}>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${this.editingZone && (this.editingMap === 'interviewCorners' || this.editingMap === 'interviewCornersPage2') ? html`
                        <div class="dropdown-backdrop" @click=${() => this.editingZone = null}></div>
                        <div class="zone-editor-modal">
                            <h3 style="margin-top: 0; margin-bottom: 15px; color: #fff;">Assign Action</h3>
                            <div class="zone-action-grid">
                                ${interviewActions.map(act => html`
                                    <button class="action-select-btn ${currentCorners[this.editingZone] === act.value ? 'selected' : ''}" 
                                        @click=${() => { this.savePref(this.editingMap, { ...currentCorners, [this.editingZone]: act.value }); this.editingZone = null; }}>
                                        ${act.label}
                                    </button>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                `;
            }

            case 'minimap':
                const rs = this.prefs.radialSettings || { size: 400, offsetX: 0, offsetY: 0, holdDelay: 2000 };
                return html`
                    <div class="scrollable-tab">
                        <h2 style="margin-bottom: 5px;">Radial Minimap Calibration</h2>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 25px;">
                            Adjust the physical size and screen location of the Ghost Minimap. Changes are applied instantly.
                        </p>

                        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 25px;">

                            <div class="slider-row" style="margin: 0;">
                                <label style="font-size: 13px;"><span>Ctrl Hold Delay (Activation Time)</span> <span style="color: #a142f4;">${(rs.holdDelay ?? 2000) / 1000}s</span></label>
                                <input type="range" min="100" max="4000" step="100" .value=${rs.holdDelay ?? 2000} 
                                    @input=${(e) => {
                                        const newRs = { ...rs, holdDelay: parseInt(e.target.value) };
                                        this.savePref('radialSettings', newRs);
                                    }}>
                                <p style="font-size: 10px; color: #888; margin-top: 5px;">How long you must hold the Ctrl key before the Minimap turns Green. (Min: 0.1s)</p>
                            </div>
                        
                            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; margin: 0;">

                            <div class="slider-row" style="margin: 0;">
                                <label style="font-size: 13px;"><span>Physical Size</span> <span style="color: #4285f4;">${rs.size}px</span></label>
                                <input type="range" min="150" max="800" step="10" .value=${rs.size} 
                                    @input=${(e) => {
                                        const newRs = { ...rs, size: parseInt(e.target.value) };
                                        this.savePref('radialSettings', newRs);
                                        if (window.require) window.require('electron').ipcRenderer.send('rebuild-radial-hud');
                                    }}>
                            </div>

                            <div class="slider-row" style="margin: 0;">
                                <label style="font-size: 13px;"><span>X-Axis Offset (Left/Right)</span> <span style="color: #00cc66;">${rs.offsetX}px</span></label>
                                <input type="range" min="-1500" max="1500" step="10" .value=${rs.offsetX} 
                                    @input=${(e) => {
                                        const newRs = { ...rs, offsetX: parseInt(e.target.value) };
                                        this.savePref('radialSettings', newRs);
                                        if (window.require) window.require('electron').ipcRenderer.send('rebuild-radial-hud');
                                    }}>
                            </div>

                            <div class="slider-row" style="margin: 0;">
                                <label style="font-size: 13px;"><span>Y-Axis Offset (Up/Down)</span> <span style="color: #f59e0b;">${rs.offsetY}px</span></label>
                                <input type="range" min="-1500" max="500" step="10" .value=${rs.offsetY} 
                                    @input=${(e) => {
                                        const newRs = { ...rs, offsetY: parseInt(e.target.value) };
                                        this.savePref('radialSettings', newRs);
                                        if (window.require) window.require('electron').ipcRenderer.send('rebuild-radial-hud');
                                    }}>
                                <p style="font-size: 10px; color: #888; margin-top: 5px;">Negative values push the minimap UP the screen.</p>
                            </div>
                        </div>
                    </div>
                `;

            case 'search':
                return html`
                    <h2>Google Search</h2>
                    <div class="form-group" style="flex-direction: row; align-items: center; gap: 15px;">
                        <input type="checkbox" id="searchEnabled" style="width: 20px; height: 20px;"
                            .checked=${this.prefs.googleSearchEnabled}
                            @change=${(e) => this.savePref('googleSearchEnabled', e.target.checked)}>
                        <label for="searchEnabled" style="font-size: 15px;">Enable AI Web Search</label>
                    </div>
                    <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
                        When enabled, the AI can browse the live internet for real-time information (e.g., current events, specific documentation). 
                    </p>
                `;
            case 'advanced':
                return html`
                    <h2>Advanced Settings</h2>
                    <div class="form-group">
                        <label style="color: #f14c4c;">Danger Zone</label>
                        <p style="font-size: 12px; color: var(--text-muted);">
                            This will completely wipe all your stored profiles, chat history, shortcuts, and custom settings. 
                        </p>
                        <button class="danger-btn" @click=${this.handleClearData}>Clear All Local Data</button>
                    </div>
                `;
        }
    }

    render() {
        return html`
            <div class="settings-container">
                <div class="sidebar">
                    ${this.tabs.map(tab => html`
                        <button class="tab-btn ${this.activeTab === tab.id ? 'active' : ''}" @click=${() => {
                            this.activeTab = tab.id;

                            // 🟢 LIVE PREVIEW: Tell backend to show/hide the minimap based on the active tab!
                            if (window.require) {
                                window.require('electron').ipcRenderer.send('preview-radial-hud', tab.id === 'minimap');
                            }

                            this.requestUpdate();
                        }}>
                            <span style="font-size: 16px;">${tab.icon}</span>
                            ${tab.label}
                        </button>
                    `)}
                </div>
                <div class="content">
                    ${this.renderContent()}
                </div>
            </div>
            
            ${this.activeDropdown ? html`<div class="dropdown-backdrop" @click=${this.closeDropdown}></div>` : ''}

            <div class="save-toast ${this.showToast ? 'visible' : ''}">
                ✓ Saved successfully
            </div>
        `;
    }
}
customElements.define('settings-view', SettingsView);