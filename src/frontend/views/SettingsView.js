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
            padding: 10px 15px;
            text-align: left;
            font-size: 13px;
            transition: 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%; /* 🟢 FIX: Forces the tab to span the entire sidebar width */
            box-sizing: border-box;
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
            cursor: default !important;
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
        editingZone: { type: String },
        audioDevices: { type: Object }
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
        this.audioDevices = { mics: [], speakers: [] };
        this.activeDropdown = null;
        
        this.tabs = [
            { id: 'accounts', icon: '👥', label: 'AI Accounts' },
            { id: 'profile', icon: '🧠', label: 'Context Vault' },
            { id: 'oa_mode', icon: '🎯', label: 'Proctored OA Mode' },
            { id: 'instant', icon: '⚡', label: 'Instant Interview' },
            { id: 'shortcuts', icon: '⌨️', label: 'Keyboard Shortcuts' },
            { id: 'appearance', icon: '🎨', label: 'Appearance' },
            { id: 'audio', icon: '🔊', label: 'Audio Devices' },
            { id: 'search', icon: '🔍', label: 'Web Search' },
            { id: 'zoom', icon: '📹', label: 'Stealth Zoom' },
            { id: 'advanced', icon: '⚠️', label: 'Advanced' }
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
        
        this.loadAudioDevices();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('sync-preference', this.syncListener);
        if (window.require) {
            window.require('electron').ipcRenderer.send('preview-radial-hud', false);
        }
    }

    // 🟢 NEW: Live Hardware Scanner
    async loadAudioDevices() {
        try {
            // Request temporary permission to force the OS to unmask device labels
            await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(()=>{});
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const mics = devices.filter(d => d.kind === 'audioinput').map(d => ({ value: d.deviceId, label: d.label || 'Unknown Microphone' }));
            const speakers = devices.filter(d => d.kind === 'audiooutput').map(d => ({ value: d.deviceId, label: d.label || 'Unknown Speaker' }));
            
            mics.unshift({ value: 'default', label: 'Default System Microphone' });
            speakers.unshift({ value: 'default', label: 'Default System Speaker' });
            
            this.audioDevices = { mics, speakers };
            this.requestUpdate();
            this.showToast('🔄 Devices Refreshed');
        } catch (e) { console.error("Error loading devices", e); }
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
            
            if (this.listeningKey.startsWith('tp_')) {
                // 🟢 Trackpad Trigger Routing
                const tkId = this.listeningKey.replace('tp_', '');
                // const currentTk = this.prefs.trackpadKeys || {
                //     tap_3: 'Ctrl+Alt+H', swipe_up_3: 'Ctrl+Alt+W', swipe_down_3: 'Ctrl+Alt+S', swipe_left_3: 'Ctrl+Alt+A', swipe_right_3: 'Ctrl+Alt+D',
                //     tap_4: 'Ctrl+Alt+C', swipe_up_4: 'Ctrl+Alt+Enter', swipe_down_4: 'Ctrl+Alt+P', swipe_left_4: 'Ctrl+Alt+O', swipe_right_4: 'Ctrl+Alt+R'
                // };
                const currentTk = this.prefs.trackpadKeys || {
                    tap_3: 'F13', swipe_up_3: 'F14', swipe_down_3: 'F15', swipe_left_3: 'F16', swipe_right_3: 'F17',
                    tap_4: 'F18', swipe_up_4: 'F19', swipe_down_4: 'F20', swipe_left_4: 'F21', swipe_right_4: 'F22'
                };
                currentTk[tkId] = shortcutStr;
                this.savePref('trackpadKeys', currentTk);
                if (window.require) window.require('electron').ipcRenderer.send('reload-trackpad-gestures');
            } else {
                // Standard Shortcut Routing
                this.keybinds = { ...this.keybinds, [this.listeningKey]: shortcutStr };
                this.saveKeybinds();
            }
            this.listeningKey = null;
        }
    }

    startListening(key) { this.listeningKey = key; }

    async resetTrackpadKeysToDefault() {
        if (confirm("Reset all trackpad bindings to F13 - F22?")) {
            const defaultTk = {
                tap_3: 'Ctrl+Alt+num0', 
                swipe_up_3: 'Ctrl+Alt+num1', 
                swipe_down_3: 'Ctrl+Alt+num2', 
                swipe_left_3: 'Ctrl+Alt+num3', 
                swipe_right_3: 'Ctrl+Alt+num4',
                tap_4: 'Ctrl+Alt+num5', 
                swipe_up_4: 'Ctrl+Alt+num6', 
                swipe_down_4: 'Ctrl+Alt+num7', 
                swipe_left_4: 'Ctrl+Alt+num8', 
                swipe_right_4: 'Ctrl+Alt+num9'
            };
            // Update local state instantly
            this.prefs = { ...this.prefs, trackpadKeys: defaultTk };

            // Save to DB and alert main process
            await this.savePref('trackpadKeys', defaultTk);
            if (window.require) window.require('electron').ipcRenderer.send('reload-trackpad-gestures');

            this.triggerToast();
            this.requestUpdate();
        }
    }

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
            'fix_error': '🌟', 'language': '💻 Language', 'mic': '🎙️ Mic', 'toggle_ai_vis': '👁️',
            'auto_type': '⌨️',       'trim_top': '✂️⬇️',      'trim_bottom': '✂️⬆️',  'abort_typer': '🛑', 'abort_oa': '🚪',
            'expand_top': '➕⬆️',    'expand_bottom': '➕⬇️', 'reset_typer': '✨',
            'toggle_page2': '🔄', 'regenerate': '🔄 Regen',    'toggle_theme': '🌓',   'sync_followup': '🔍',
            'fusion_dry_run': '🎯', 'on_the_go': '🏃'
        };
        return labels[action] || '—';
    }

    getHotCornerLabel(action) {
        const labels = {
            'none': '—', 'capture': '📸 Capture', 'send_ai': '🚀 Send AI',
            'hide_unhide': '👻 Hide/Show', 'scroll_up': '⬆️ Scroll Up', 'scroll_down': '⬇️ Scroll Dn',
            'prev_resp': '◀ Prev', 'next_resp': '▶ Next', 'change_ai': '🤖 Change AI',
            'change_profile': '👤 Swap Pane', 'fast_think': '🧠 Fast/Think', 'refactor': '🛠️ Refactor',
            'reset': '✨ Reset', 'text_inc': 'A+ Text', 'text_dec': 'A- Text',
            'bg_inc': '⬛ Opacity+', 'bg_dec': '⬜ Opacity-', 'toggle_ai_vis': '👁️ Toggle AI',
            'fix_error': '🔧 Fix Error', 'language': '💻 Language', 'mic': '🎙️ Mic',
            'trim_top': '✂️ Unselect Top', 'trim_bottom': '✂️ Unselect Bot', 'abort_typer': '🛑 Abort',
            'auto_type': '⌨️ Auto-Type', 'expand_top': '➕ Expand Top', 'expand_bottom': '➕ Expand Bot', 
            'reset_typer': '🔄 Reset', 'abort_oa': '🚪 Abort OA', 'toggle_page2': '🔄 Page 1 / 2',
            'regenerate': '🔄 Regen', 'toggle_theme': '🌓 Theme Flip', 'sync_followup': '🔍 Follow-up Image',
            'fusion_dry_run': '🎯 Fusion Dry Run', 'on_the_go': '🏃 On-The-Go Dictator',
        };
        return labels[action] || action || '—';
    }

    syncRadialToBackend() {
        if (!window.require) return;
        const defaultPage1 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'mic', right_mid_top: 'change_ai', middle_left: 'prev_resp', middle_right: 'next_resp', left_mid_bottom: 'fast_think', right_mid_bottom: 'change_profile', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };
        const defaultPage2 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'bg_inc', right_mid_top: 'text_inc', middle_left: 'reset', middle_right: 'language', left_mid_bottom: 'bg_dec', right_mid_bottom: 'text_dec', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };

        const page = this.editingPage || 1;
        let activeMap = page === 2 ? (this.prefs?.interviewCornersPage2 || {}) : (this.prefs?.interviewCorners || {});
        
        if (Object.keys(activeMap).length === 0) {
            activeMap = page === 2 ? defaultPage2 : defaultPage1;
        }

        const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
        const labelsArray = clockWiseGrid.map(key => this.getHotCornerLabel(activeMap[key] || 'none'));
        window.require('electron').ipcRenderer.send('sync-radial-labels', labelsArray);
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
                return html`
                    <div class="scrollable-tab">
                        <h2>Appearance & Display</h2>
                        <div class="form-group">
                            <label>Background Transparency (${Math.round(this.prefs.backgroundTransparency * 100)}%)</label>
                            <input type="range" min="0" max="1" step="0.05" .value=${this.prefs.backgroundTransparency} @input=${(e) => this.savePref('backgroundTransparency', parseFloat(e.target.value))}>
                        </div>
                        <div class="form-group">
                            <label>Response Font Size (${this.prefs.fontSize}px)</label>
                            <input type="range" min="12" max="32" step="1" .value=${this.prefs.fontSize} @input=${(e) => this.savePref('fontSize', parseInt(e.target.value, 10))}>
                        </div>
            
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 15px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 15px; color: #fff;">OA Main Display Geometry</h3>
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
                return html`
                    <div class="scrollable-tab">
                        <h2>Audio Devices</h2>
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h3 style="margin: 0; font-size: 14px;">🎙️ Hardware Devices (Bluetooth Support)</h3>
                                <button @click=${() => this.loadAudioDevices()} style="background: rgba(66, 133, 244, 0.1); color: #4285f4; border: 1px solid #4285f4; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: default !important;">🔄 Refresh Devices</button>
                            </div>
                            <div class="form-group">
                                <label>Microphone Source (Your Voice)</label>
                                ${this.renderCustomDropdown('selectedMic', this.audioDevices.mics.length ? this.audioDevices.mics : [{value:'default', label:'Default'}], this.prefs.selectedMic || 'default', (val) => {
                                    this.savePref('selectedMic', val);
                                    if (window.require) window.require('electron').ipcRenderer.invoke('switch-ai-profile');
                                })}
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Audio Output Source (Interviewer's Voice)</label>
                                ${this.renderCustomDropdown('selectedSpeaker', this.audioDevices.speakers.length ? this.audioDevices.speakers : [{value:'default', label:'Default'}], this.prefs.selectedSpeaker || 'default', (val) => {
                                    this.savePref('selectedSpeaker', val);
                                    if (window.require) window.require('electron').ipcRenderer.invoke('switch-ai-profile');
                                })}
                            </div>
                        </div>
                    </div>
                `;

            case 'language':
                const spokenLangOpts = [
                    {value: 'en-US', label: 'English (US)'}, {value: 'en-GB', label: 'English (UK)'},
                    {value: 'es-ES', label: 'Spanish'}, {value: 'fr-FR', label: 'French'},
                    {value: 'de-DE', label: 'German'}, {value: 'hi-IN', label: 'Hindi'},
                    {value: 'zh-CN', label: 'Chinese (Simplified)'}
                ];
                const codeLangOpts = [
                    {value: 'C++', label: 'C++'},
                    {value: 'Python', label: 'Python'},
                    {value: 'Java', label: 'Java'},
                    {value: 'JavaScript', label: 'JavaScript'},
                    {value: 'Go', label: 'GoLang'}
                ];
                return html`
                    <div class="scrollable-tab">
                        <h2>Language Settings</h2>
                        
                        <div style="background: rgba(66, 133, 244, 0.1); padding: 15px; border-radius: 6px; border: 1px solid rgba(66, 133, 244, 0.3); margin-bottom: 25px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px; color: #4285f4;">💻 Target Programming Language</h3>
                            <p style="font-size: 11px; color: #ccc; margin-bottom: 15px;">The AI will exclusively write solutions in this language.</p>
                            <div class="form-group" style="margin-bottom: 0;">
                                ${this.renderCustomDropdown('programmingLanguage', codeLangOpts, this.prefs.programmingLanguage || 'C++', (val) => this.savePref('programmingLanguage', val))}
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; border: 1px solid var(--border-color);">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px;">🗣️ Speech Recognition</h3>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Primary Spoken Language</label>
                                ${this.renderCustomDropdown('selectedLanguage', spokenLangOpts, this.prefs.selectedLanguage, (val) => this.savePref('selectedLanguage', val))}
                            </div>
                        </div>
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
              
            case 'oa_mode': {
                const cornerActions = [
                    {value: 'none', label: 'None (Disabled)'}, {value: 'capture', label: '📸 Capture Screen'},
                    {value: 'send_ai', label: '🚀 Send to AI'}, {value: 'fix_error', label: '🌟 Sync Optimized'},
                    {value: 'auto_type', label: '⌨️ Trigger Auto-Type'}, {value: 'abort_oa', label: '🚪 Abort OA & Exit'},
                    {value: 'hide_unhide', label: '👻 Hide / Unhide (INSTANT)'}, {value: 'toggle_ai_vis', label: '👁️ Show / Hide AI'},
                    {value: 'scroll_up', label: '⬆️ Scroll Up'}, {value: 'scroll_down', label: '⬇️ Scroll Down'},
                    {value: 'prev_resp', label: '◀ Previous Response'}, {value: 'next_resp', label: '▶ Next Response'},
                    {value: 'change_profile', label: '👤 Switch Profile'}, {value: 'fast_think', label: '🧠 Toggle Fast/Think'},
                    {value: 'language', label: '💻 Change Language'}, {value: 'reset', label: '✨ Reset Session'},
                    {value: 'toggle_page2', label: '🔄 Toggle Page 1/2'}, {value: 'toggle_theme', label: '🌓 Toggle Light/Dark Mode'},
                    {value: 'sync_followup', label: '🔍 Sync Follow-up Image'}, {value: 'fusion_dry_run', label: '🎯 Fusion Dry Run'}
                ];

                const typerActionsList = [
                    {value: 'none', label: 'None (Disabled)'}, {value: 'auto_type', label: '▶️ Start / Pause / Resume'},
                    {value: 'trim_top', label: '✂️ Unselect Top Line'}, {value: 'expand_top', label: '➕ Expand Top Line'},
                    {value: 'trim_bottom', label: '✂️ Unselect Bottom Line'}, {value: 'expand_bottom', label: '➕ Expand Bottom Line'},
                    {value: 'reset_typer', label: '🔄 Reset Selection'}, {value: 'abort_typer', label: '🛑 Abort & Go Back'},
                    {value: 'abort_oa', label: '🚪 Abort OA & Exit'}, {value: 'hide_unhide', label: '👻 Hide / Unhide'},
                    {value: 'scroll_up', label: '⬆️ Scroll Up'}, {value: 'scroll_down', label: '⬇️ Scroll Down'}
                ];

                this.editingPage = this.editingPage || 1;
                const b = this.prefs.hotCornerBounds || { cornerSize: 20, centerX: 20, centerY: 20, dwellTime: 3, hideTime: 0 };
                const activeMapName = this.editingPage === 1 ? 'hotCorners' : 'hotCornersPage2';
                const currentCorners = this.prefs[activeMapName] || {};
                const currentTyperCorners = this.prefs.typerHotCorners || {};

                let midX = Math.max(0, (100 - (2 * b.cornerSize) - b.centerX) / 2);
                let midY = Math.max(0, (100 - (2 * b.cornerSize) - b.centerY) / 2);
                const gridCols = `${b.cornerSize}fr ${midX}fr ${b.centerX}fr ${midX}fr ${b.cornerSize}fr`;
                const gridRows = `${b.cornerSize}fr ${midY}fr ${b.centerY}fr ${midY}fr ${b.cornerSize}fr`;

                const loadouts = this.prefs.dualBrainLoadouts || [];
                const activeLoadout = loadouts[0] || {};

                return html`
                    <div class="scrollable-tab">
                        <h2>Proctored OA Environment</h2>
                        
                        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px; color: #fff;">🧠 OA AI Accounts</h3>
                            <p style="font-size: 11px; color: #ccc; margin-bottom: 15px;">Select which AI engine and profile will solve the questions in OA Mode.</p>
                            <div style="display: flex; gap: 15px;">
                                <div style="flex: 1; border: 1px dashed #4285f4; padding: 10px; border-radius: 4px; background: rgba(66, 133, 244, 0.05);">
                                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #4285f4;">💻 Primary Code AI</div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${this.renderCustomDropdown('oa_codeEngine', [{value: '0', label: 'ChatGPT'}, {value: '1', label: 'Gemini'}, {value: '2', label: 'Grok'}], activeLoadout.codeEngine || 1, (val) => { 
                                            let l = [...loadouts]; if(!l[0]) l[0] = {}; l[0].codeEngine = parseInt(val); this.savePref('dualBrainLoadouts', l); 
                                        })}
                                        ${this.renderCustomDropdown('oa_codeProfile', (this.prefs.aiProfiles || []).map(p => ({value: p.id, label: p.name})), activeLoadout.codeProfileId || '', (val) => { 
                                            let l = [...loadouts]; if(!l[0]) l[0] = {}; l[0].codeProfileId = val; this.savePref('dualBrainLoadouts', l); 
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h3 style="margin-top: 0; margin-bottom: 5px;">Main OA Hot Corners</h3>
                            <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                                <div style="display: flex; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 3px;">
                                    <button @click=${() => { this.editingPage = 1; this.requestUpdate(); }} style="background: ${this.editingPage === 1 ? '#4285f4' : 'transparent'}; color: ${this.editingPage === 1 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold;">📄 Page 1 (Primary)</button>
                                    <button @click=${() => { this.editingPage = 2; this.requestUpdate(); }} style="background: ${this.editingPage === 2 ? '#a142f4' : 'transparent'}; color: ${this.editingPage === 2 ? '#fff' : 'var(--text-secondary)'}; border: none; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold;">📄 Page 2 (Shift)</button>
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

                                ${this.renderMatrixCell('middle_left', 3, 1, 'Left Edge', activeMapName)}
                                ${this.renderMatrixCell('middle_right', 3, 5, 'Right Edge', activeMapName)}

                                ${this.renderMatrixCell('left_mid_bottom', 4, 1, 'Left-Mid-B', activeMapName)}
                                ${this.renderMatrixCell('right_mid_bottom', 4, 5, 'Right-Mid-B', activeMapName)}

                                ${this.renderMatrixCell('bottom_left', 5, 1, 'Bot-L Corner', activeMapName)}
                                ${this.renderMatrixCell('bottom_mid_left', 5, 2, 'Bot-Mid-L', activeMapName)}
                                ${this.renderMatrixCell('bottom_center', 5, 3, 'Bot Center', activeMapName)}
                                ${this.renderMatrixCell('bottom_mid_right', 5, 4, 'Bot-Mid-R', activeMapName)}
                                ${this.renderMatrixCell('bottom_right', 5, 5, 'Bot-R Corner', activeMapName)}
                                
                                <div class="matrix-center" style="padding: 6px 12px; border-color: #4285f4; background: rgba(66, 133, 244, 0.1);">
                                    <h3 style="margin-top: 0; color: #fff; font-size: 11px; text-align: center; margin-bottom: 6px;">GEOMETRY CONFIG</h3>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; width: 100%;">
                                        <div class="slider-row"><label><span>Corner %</span> <span style="color: #4285f4;">${b.cornerSize}%</span></label><input type="range" min="5" max="30" step="1" .value=${b.cornerSize} @input=${(e) => this.savePref('hotCornerBounds', {...b, cornerSize: parseInt(e.target.value)})}></div>
                                        <div class="slider-row"><label><span>Dwell Delay</span> <span style="color: #f59e0b;">${b.dwellTime || 3}s</span></label><input type="range" min="0" max="5" step="0.5" .value=${b.dwellTime || 3} @input=${(e) => this.savePref('hotCornerBounds', {...b, dwellTime: parseFloat(e.target.value)})}></div>
                                        <div class="slider-row"><label><span>Top/Bot Width</span> <span style="color: #00cc66;">${b.centerX}%</span></label><input type="range" min="10" max="70" step="5" .value=${b.centerX} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerX: parseInt(e.target.value)})}></div>
                                        <div class="slider-row"><label><span>L/R Height</span> <span style="color: #00cc66;">${b.centerY}%</span></label><input type="range" min="10" max="70" step="5" .value=${b.centerY} @input=${(e) => this.savePref('hotCornerBounds', {...b, centerY: parseInt(e.target.value)})}></div>
                                        <div class="slider-row" style="grid-column: span 2;"><label><span>Unhide Delay</span> <span style="color: #ff4444;">${(b.hideTime || 0) === 0 ? 'Instant' : (b.hideTime || 0) + 's'}</span></label><input type="range" min="0" max="5" step="0.5" .value=${b.hideTime || 0} @input=${(e) => this.savePref('hotCornerBounds', {...b, hideTime: parseFloat(e.target.value)})}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style="margin-top: 0; margin-bottom: 5px;">Ghost Typer Corners</h3>
                            <div class="monitor-matrix" style="grid-template-columns: ${gridCols}; grid-template-rows: ${gridRows};">
                                ${this.renderMatrixCell('top_left', 1, 1, 'Top-L Corner', 'typerHotCorners')}
                                ${this.renderMatrixCell('top_mid_left', 1, 2, 'Top-Mid-L', 'typerHotCorners')}
                                ${this.renderMatrixCell('top_center', 1, 3, 'Top Center', 'typerHotCorners')}
                                ${this.renderMatrixCell('top_mid_right', 1, 4, 'Top-Mid-R', 'typerHotCorners')}
                                ${this.renderMatrixCell('top_right', 1, 5, 'Top-R Corner', 'typerHotCorners')}
                                
                                ${this.renderMatrixCell('left_mid_top', 2, 1, 'Left-Mid-T', 'typerHotCorners')}
                                ${this.renderMatrixCell('right_mid_top', 2, 5, 'Right-Mid-T', 'typerHotCorners')}
                                
                                ${this.renderMatrixCell('middle_left', 3, 1, 'Left Edge', 'typerHotCorners')}
                                ${this.renderMatrixCell('middle_right', 3, 5, 'Right Edge', 'typerHotCorners')}
                                
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
                                        <div class="slider-row"><label><span>Start Delay</span> <span style="color: #a142f4;">${this.prefs.typerDelay ?? 5}s</span></label><input type="range" min="0" max="10" step="1" .value=${this.prefs.typerDelay ?? 5} @input=${(e) => this.savePref('typerDelay', parseInt(e.target.value))}></div>
                                        <div class="slider-row"><label><span>Select Speed</span> <span style="color: #00cc66;">${this.prefs.typerSelectionSpeed ?? 0.5}s</span></label><input type="range" min="0.1" max="2.0" step="0.1" .value=${this.prefs.typerSelectionSpeed ?? 0.5} @input=${(e) => this.savePref('typerSelectionSpeed', parseFloat(e.target.value))}></div>
                                        <div class="slider-row"><label><span>Typer Speed</span> <span style="color: #a142f4;">${this.prefs.wpmSpeed || 60}</span></label><input type="range" min="10" max="180" step="10" .value=${this.prefs.wpmSpeed || 60} @input=${(e) => this.savePref('wpmSpeed', parseInt(e.target.value))}></div>
                                        <div class="slider-row"><label><span>Mistakes</span> <span style="color: #f14c4c;">${this.prefs.typerMistakes ?? 2}%</span></label><input type="range" min="0" max="15" step="1" .value=${this.prefs.typerMistakes ?? 2} @input=${(e) => this.savePref('typerMistakes', parseInt(e.target.value))}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                    ${this.editingZone ? html`
                        <div class="dropdown-backdrop" @click=${() => this.editingZone = null}></div>
                        <div class="zone-editor-modal">
                            <h3 style="margin-top: 0; margin-bottom: 15px; color: #fff;">Assign Action</h3>
                            <div class="zone-action-grid">
                                ${(this.editingMap === 'typerHotCorners' ? typerActionsList : cornerActions).map(act => html`
                                    <button class="action-select-btn ${(this.prefs[this.editingMap] || {})[this.editingZone] === act.value ? 'selected' : ''}" 
                                        @click=${() => { this.savePref(this.editingMap, { ...(this.prefs[this.editingMap] || {}), [this.editingZone]: act.value }); this.editingZone = null; }}>
                                        ${act.label}
                                    </button>
                                `)}
                            </div>
                        </div>
                    ` : ''}
                `;
            }

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
            
            case 'zoom':
                return html`
                    <div class="scrollable-tab">
                        <h2>Stealth Zoom Environment</h2>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 0; margin-bottom: 25px;">
                            This launches a native Zoom Web Client browser inside the app. Closing the window with the 'X' will only minimize it to ensure you never accidentally drop a call. It remains visible during Emergency Stealth.
                        </p>
                        <div style="background: rgba(45, 140, 255, 0.1); border: 1px solid #2D8CFF; padding: 20px; border-radius: 8px; text-align: center;">
                            <button @click=${() => {
                                if (window.require) window.require('electron').ipcRenderer.invoke('toggle-zoom-window');
                            }} style="background: #2D8CFF; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: default !important; transition: 0.2s;">
                                📹 Launch / Show Zoom
                            </button>
                        </div>
                    </div>
                `;

            case 'instant': {
                const iiPrefs = this.prefs.instantInterview || {
                    codeW: 48, codeH: 85, codeX: 1, codeY: 7,
                    voiceW: 48, voiceH: 85, voiceX: 51, voiceY: 7,
                    tap_3: 'hide_unhide', swipe_left_3: 'sync_right_to_left', swipe_right_3: 'sync_left_to_right',
                    swipe_up_3: 'restart_voice', swipe_down_3: 'swap_windows',
                    tap_4: 'capture', swipe_down_4: 'send_pro', swipe_left_4: 'on_the_go', swipe_right_4: 'dry_run', swipe_up_4: 'abort'
                };

                const iiActions = [
                    {value: 'none', label: 'None (Disabled)'},
                    {value: 'hide_unhide', label: '👻 Hide / Unhide Windows'},
                    {value: 'sync_left_to_right', label: '➡️ Sync Left Window to Right Window'},
                    {value: 'sync_right_to_left', label: '⬅️ Sync Right Window to Left Window'},
                    {value: 'sync_v_to_c', label: '⬇️ Force Sync Voice to Code'},
                    {value: 'sync_c_to_v', label: '⬇️ Force Sync Code to Voice'},
                    {value: 'restart_voice', label: '🔄 Restart Voice & Dump Vaults'},
                    {value: 'swap_windows', label: '🔀 Swap Windows'},
                    {value: 'capture', label: '📸 Capture Screen'},
                    {value: 'send_pro', label: '🚀 Send to AI (@Pro)'},
                    {value: 'on_the_go', label: '🏃 On-The-Go Dictator'},
                    {value: 'dry_run', label: '🎯 Fusion Dry Run'},
                    {value: 'abort', label: '🚪 Abort to Main Hub'}
                ];

                const gestureList = [
                    { id: 'tap_3', label: '3 Finger Tap', keyStr: 'Ctrl + Alt + Num 0' },
                    { id: 'swipe_left_3', label: '3 Finger Swipe Left', keyStr: 'Ctrl + Alt + Num 3' },
                    { id: 'swipe_right_3', label: '3 Finger Swipe Right', keyStr: 'Ctrl + Alt + Num 4' },
                    { id: 'swipe_up_3', label: '3 Finger Swipe Up', keyStr: 'Ctrl + Alt + Num 1' },
                    { id: 'swipe_down_3', label: '3 Finger Swipe Down', keyStr: 'Ctrl + Alt + Num 2' },
                    { id: 'tap_4', label: '4 Finger Tap', keyStr: 'Ctrl + Alt + Num 5' },
                    { id: 'swipe_down_4', label: '4 Finger Swipe Down', keyStr: 'Ctrl + Alt + Num 7' },
                    { id: 'swipe_left_4', label: '4 Finger Swipe Left', keyStr: 'Ctrl + Alt + Num 8' },
                    { id: 'swipe_right_4', label: '4 Finger Swipe Right', keyStr: 'Ctrl + Alt + Num 9' },
                    { id: 'swipe_up_4', label: '4 Finger Swipe Up', keyStr: 'Ctrl + Alt + Num 6' }
                ];

                const panicZones = [
                    {value: 'none', label: '🚫 None (Disabled)'},
                    {value: 'top_left', label: '↖️ Top Left Corner'},
                    {value: 'top_mid_left', label: '⬆️ Top Edge (Left)'},
                    {value: 'top_center', label: '⬆️ Top Edge (Center)'},
                    {value: 'top_mid_right', label: '⬆️ Top Edge (Right)'},
                    {value: 'top_right', label: '↗️ Top Right Corner'},
                    {value: 'right_mid_top', label: '➡️ Right Edge (Top)'},
                    {value: 'middle_right', label: '➡️ Right Edge (Center)'},
                    {value: 'right_mid_bottom', label: '➡️ Right Edge (Bottom)'},
                    {value: 'bottom_right', label: '↘️ Bottom Right Corner'},
                    {value: 'bottom_mid_right', label: '⬇️ Bottom Edge (Right)'},
                    {value: 'bottom_center', label: '⬇️ Bottom Edge (Center)'},
                    {value: 'bottom_mid_left', label: '⬇️ Bottom Edge (Left)'},
                    {value: 'bottom_left', label: '↙️ Bottom Left Corner'},
                    {value: 'left_mid_bottom', label: '⬅️ Left Edge (Bottom)'},
                    {value: 'middle_left', label: '⬅️ Left Edge (Center)'},
                    {value: 'left_mid_top', label: '⬅️ Left Edge (Top)'}
                ];

                return html`
                    <div class="scrollable-tab">
                        <h2>Instant Interview (Lightweight)</h2>

                        <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 10px; color: #fff;">🧠 Instant Mode Accounts</h3>
                            <div style="display: flex; gap: 15px;">
                                <div style="flex: 1; border: 1px dashed rgba(66, 133, 244, 0.5); padding: 10px; border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #4285f4;">💻 Left Window AI</div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${this.renderCustomDropdown('ii_codeEngine', [
                                            {value: '0', label: 'ChatGPT'}, {value: '1', label: 'Gemini'}, {value: '2', label: 'Grok'}
                                        ], iiPrefs.codeEngine || 1, (val) => { this.savePref('instantInterview', { ...iiPrefs, codeEngine: val }); })}
                                        ${this.renderCustomDropdown('ii_codeProfile', (this.prefs.aiProfiles || []).map(p => ({value: p.id, label: p.name})), iiPrefs.codeProfileId || '', (val) => { this.savePref('instantInterview', { ...iiPrefs, codeProfileId: val }); })}
                                    </div>
                                </div>
                                <div style="flex: 1; border: 1px dashed rgba(161, 66, 244, 0.5); padding: 10px; border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #a142f4;">🗣️ Right Window AI</div>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${this.renderCustomDropdown('ii_voiceEngine', [
                                            {value: '0', label: 'ChatGPT'}, {value: '1', label: 'Gemini'}, {value: '2', label: 'Grok'}
                                        ], iiPrefs.voiceEngine || 0, (val) => { this.savePref('instantInterview', { ...iiPrefs, voiceEngine: val }); })}
                                        ${this.renderCustomDropdown('ii_voiceProfile', (this.prefs.aiProfiles || []).map(p => ({value: p.id, label: p.name})), iiPrefs.voiceProfileId || '', (val) => { this.savePref('instantInterview', { ...iiPrefs, voiceProfileId: val }); })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                            <h3 style="margin-top: 0; font-size: 13px; color: #fff;">Independent Window Geometry</h3>
                            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 15px;">Adjust the physical size and location of the AI windows. Click <strong>Test Live Windows</strong> to view your changes in real-time on your screen.</p>
                                    
                            <div style="width: 100%; display: flex; gap: 15px;">
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; border: 1px solid #4285f4; padding: 10px; border-radius: 6px; background: rgba(66, 133, 244, 0.05);">
                                    <h4 style="margin:0; color:#4285f4; font-size: 12px;">💻 Left Pane Configuration</h4>
                                    <div class="slider-row"><label><span>Width</span> <span>${iiPrefs.codeW}%</span></label>
                                        <input type="range" min="10" max="100" step="1" .value=${iiPrefs.codeW} @input=${(e) => {
                                            const newP = {...iiPrefs, codeW: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>Height</span> <span>${iiPrefs.codeH}%</span></label>
                                        <input type="range" min="10" max="100" step="1" .value=${iiPrefs.codeH} @input=${(e) => {
                                            const newP = {...iiPrefs, codeH: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>X Position (Left)</span> <span>${iiPrefs.codeX}%</span></label>
                                        <input type="range" min="0" max="100" step="1" .value=${iiPrefs.codeX} @input=${(e) => {
                                            const newP = {...iiPrefs, codeX: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>Y Position (Top)</span> <span>${iiPrefs.codeY}%</span></label>
                                        <input type="range" min="0" max="100" step="1" .value=${iiPrefs.codeY} @input=${(e) => {
                                            const newP = {...iiPrefs, codeY: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                </div>
                                    
                                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; border: 1px solid #a142f4; padding: 10px; border-radius: 6px; background: rgba(161, 66, 244, 0.05);">
                                    <h4 style="margin:0; color:#a142f4; font-size: 12px;">🗣️ Right Pane Configuration</h4>
                                    <div class="slider-row"><label><span>Width</span> <span>${iiPrefs.voiceW}%</span></label>
                                        <input type="range" min="10" max="100" step="1" .value=${iiPrefs.voiceW} @input=${(e) => {
                                            const newP = {...iiPrefs, voiceW: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>Height</span> <span>${iiPrefs.voiceH}%</span></label>
                                        <input type="range" min="10" max="100" step="1" .value=${iiPrefs.voiceH} @input=${(e) => {
                                            const newP = {...iiPrefs, voiceH: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>X Position (Left)</span> <span>${iiPrefs.voiceX}%</span></label>
                                        <input type="range" min="0" max="100" step="1" .value=${iiPrefs.voiceX} @input=${(e) => {
                                            const newP = {...iiPrefs, voiceX: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                    <div class="slider-row"><label><span>Y Position (Top)</span> <span>${iiPrefs.voiceY}%</span></label>
                                        <input type="range" min="0" max="100" step="1" .value=${iiPrefs.voiceY} @input=${(e) => {
                                            const newP = {...iiPrefs, voiceY: parseInt(e.target.value)};
                                            this.savePref('instantInterview', newP);
                                            if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newP);
                                        }}>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; gap: 10px; margin-top: 15px; width: 100%; justify-content: center;">
                                <button @click=${() => {
                                    if(window.require) window.require('electron').ipcRenderer.send('preview-instant-windows');
                                }} style="background: rgba(0, 204, 102, 0.2); color: #00cc66; border: 1px solid #00cc66; padding: 6px 15px; border-radius: 4px; font-weight: bold; cursor: default; transition: 0.2s;">👀 Test Live Windows</button>
                                <button @click=${() => {
                                    const resetP = {...iiPrefs, codeW: 48, codeH: 85, codeX: 1, codeY: 7, voiceW: 48, voiceH: 85, voiceX: 51, voiceY: 7};
                                    this.savePref('instantInterview', resetP);
                                    if (window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', resetP);
                                }} style="background: rgba(241, 76, 76, 0.2); color: #f14c4c; border: 1px solid #f14c4c; padding: 6px 15px; border-radius: 4px; font-weight: bold; cursor: default; transition: 0.2s;">🔄 Reset Bounds</button>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid #333;">
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                                <span style="color: #00cc66; font-weight: bold; font-size: 13px;">🎯 Stealth Panic Zone</span>
                                <div style="width: 220px;">
                                    ${this.renderCustomDropdown('ii_panicZone', panicZones, iiPrefs.panicZone || 'top_right', (val) => {
                                        // 🟢 FIX: Correctly saves to your settings file and pushes to the backend!
                                        const newPrefs = { ...iiPrefs, panicZone: val };
                                        this.savePref('instantInterview', newPrefs);
                                        if(window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newPrefs);
                                    })}
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #00cc66; font-weight: bold; font-size: 13px;">⏱️ Zone Unhide Delay</span>
                                <span style="color: #a0a0a0; font-size: 12px; font-family: monospace;">${iiPrefs.unhideDelay !== undefined ? iiPrefs.unhideDelay : 5}s</span>
                            </div>
                            <p style="font-size: 11px; color: #888; margin-top: 0; margin-bottom: 12px; line-height: 1.4;">
                                Shoving your mouse into the configured screen zone instantly hides and locks the AI windows. Hold your mouse perfectly in the zone for this duration to unlock and unhide them.
                            </p>
                            <input type="range" min="1" max="10" step="1" 
                                .value=${iiPrefs.unhideDelay !== undefined ? iiPrefs.unhideDelay : 5}
                                @input=${(e) => {
                                    // 🟢 FIX: Correctly saves to your settings file and pushes to the backend!
                                    const newPrefs = { ...iiPrefs, unhideDelay: parseInt(e.target.value) };
                                    this.savePref('instantInterview', newPrefs);
                                    if(window.require) window.require('electron').ipcRenderer.send('live-update-instant-bounds', newPrefs);
                                }}
                                style="width: 100%; accent-color: #f14c4c; cursor: default;" 
                            />
                        </div>

                        <div style="background: rgba(0, 204, 102, 0.05); padding: 20px; border-radius: 8px; border: 1px solid rgba(0, 204, 102, 0.3);">
                            <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 15px; color: #00cc66;">⚡ Instant Mode Gestures</h3>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${gestureList.map(t => html`
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                                        <div style="display: flex; flex-direction: column;">
                                            <span style="font-weight: bold; font-size: 13px; color: var(--text-color);">${t.label}</span>
                                            <div style="font-size: 11px; font-family: monospace; color: #00cc66; margin-top: 5px;">
                                                Hardcoded to: 
                                                <span style="background: rgba(0,204,102,0.1); border: 1px dashed #00cc66; color: #00cc66; font-size: 10px; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                                                    ${t.keyStr} (via Injector)
                                                </span>
                                            </div>
                                        </div>
                                        <div style="width: 240px;">
                                            ${this.renderCustomDropdown('ii_' + t.id, iiActions, iiPrefs[t.id], (val) => {
                                                const newActions = { ...iiPrefs, [t.id]: val };
                                                this.savePref('instantInterview', newActions);
                                            })}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>
                `;
            }
                
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