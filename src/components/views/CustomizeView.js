import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class CustomizeView extends LitElement {
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
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            padding: 10px 0;
            overflow-y: auto;
        }
        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            padding: 12px 15px;
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
            background: var(--bg-tertiary);
            color: var(--text-color);
            border-left: 3px solid #4285f4;
            font-weight: bold;
        }
        .content {
            flex: 1;
            padding: 25px 40px;
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
            cursor: pointer !important;
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
    `;

    static properties = {
        activeTab: { type: String },
        prefs: { type: Object },
        keybinds: { type: Object },
        showToast: { type: Boolean },
        listeningKey: { type: String },
        activeDropdown: { type: String }
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
            hardwareSetup: 'headphones'
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
            { id: 'search', icon: '🔍', label: 'Search' },
            { id: 'advanced', icon: '⚠️', label: 'Advanced' }
        ];

        this.shortcutLabels = {
            moveUp: 'Move Window Up', moveDown: 'Move Window Down', moveLeft: 'Move Window Left', moveRight: 'Move Window Right',
            toggleVisibility: 'Toggle Hide/Show', toggleClickThrough: 'Toggle Click-Through', nextStep: 'Capture/Send Prompt',
            previousResponse: 'Previous Response', nextResponse: 'Next Response', scrollUp: 'Scroll Up', scrollDown: 'Scroll Down', emergencyErase: 'Emergency Erase & Quit'
        };
        this.newProfileName = '';
        this.newProfileAI = '0'; 
    }

    async connectedCallback() {
        super.connectedCallback();
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const prefs = await window.cheatingDaddy.storage.getPreferences();
            this.prefs = { ...this.prefs, ...prefs };
            
            const keybinds = await window.cheatingDaddy.storage.getKeybinds();
            if (keybinds) this.keybinds = { ...keybinds };
            else {
                this.keybinds = {
                    moveUp: 'Ctrl+Up', moveDown: 'Ctrl+Down', moveLeft: 'Ctrl+Left', moveRight: 'Ctrl+Right',
                    toggleVisibility: 'Ctrl+\\', toggleClickThrough: 'Ctrl+M', nextStep: 'Ctrl+Enter',
                    previousResponse: 'Ctrl+[', nextResponse: 'Ctrl+]', scrollUp: 'Ctrl+Shift+Up',
                    scrollDown: 'Ctrl+Shift+Down', emergencyErase: 'Ctrl+Shift+E'
                };
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
            
            if (key === 'theme' || key === 'backgroundTransparency') {
                window.cheatingDaddy.theme.apply(this.prefs.theme, this.prefs.backgroundTransparency);
            }
            if (key === 'fontSize') {
                document.documentElement.style.setProperty('--response-font-size', `${value}px`);
                if (window.cheatingDaddy.e()) window.cheatingDaddy.e().fontSize = value;
            }
            if (key === 'backgroundTransparency') {
                if (window.cheatingDaddy.e()) window.cheatingDaddy.e().bgTransparency = value;
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
        
        let currentPrefs = await window.cheatingDaddy.storage.getPreferences();
        let profiles = currentPrefs.aiProfiles || [];
        let existingIndex = profiles.findIndex(p => p.name.toLowerCase() === targetName.toLowerCase());
        
        let profileId = existingIndex >= 0 ? profiles[existingIndex].id : Date.now().toString();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            alert(`A window will now open for ${aiNames[aiIdx]}.\nPlease log in manually, verify any captchas, and then CLOSE the window when you are done.`);
            
            await ipcRenderer.invoke('open-login-window', profileId, aiIdx);
            
            currentPrefs = await window.cheatingDaddy.storage.getPreferences();
            profiles = currentPrefs.aiProfiles || [];
            let finalIndex = profiles.findIndex(p => p.id === profileId);
            
            if (finalIndex === -1) profiles.push({ id: profileId, name: targetName, loggedAIs: [aiIdx] });
            else {
                if (!profiles[finalIndex].loggedAIs) profiles[finalIndex].loggedAIs = [];
                if (!profiles[finalIndex].loggedAIs.includes(aiIdx)) profiles[finalIndex].loggedAIs.push(aiIdx); 
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
                        <div class="form-group">
                            <label>Resume & Raw Experience Data</label>
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
                    {value: 'dark', label: 'Dark'}, {value: 'light', label: 'Light'}, {value: 'midnight', label: 'Midnight Blue'},
                    {value: 'sepia', label: 'Sepia'}, {value: 'nord', label: 'Nord'}, {value: 'dracula', label: 'Dracula'}, {value: 'abyss', label: 'Abyss'}
                ];
                const layoutOpts = [
                    {value: 'normal', label: 'Normal'}, {value: 'compact', label: 'Compact'}
                ];
                return html`
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
                        <button class="tab-btn ${this.activeTab === tab.id ? 'active' : ''}" @click=${() => { this.activeTab = tab.id; this.requestUpdate(); }}>
                            <span style="font-size: 16px;">${tab.icon}</span> ${tab.label}
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
customElements.define('customize-view', CustomizeView);