import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AppHeader } from './AppHeader.js';
import { MainView } from '../views/MainView.js';
import { CustomizeView } from '../views/CustomizeView.js';
import { HelpView } from '../views/HelpView.js';
import { HistoryView } from '../views/HistoryView.js';
import { AssistantView } from '../views/AssistantView.js';
import { OnboardingView } from '../views/OnboardingView.js';

export class CheatingDaddyApp extends LitElement {
    static styles = css`
        /* Universal Scrollbar Styling */
        *::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        *::-webkit-scrollbar-track {
            background: transparent;
        }
        *::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }
        *::-webkit-scrollbar-thumb:hover {
            background: #444;
        }
        * {
            box-sizing: border-box;
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            margin: 0px;
            padding: 0px;
            cursor: default !important;
            user-select: none;
        }

        :host {
            display: block;
            width: 100%;
            height: 100vh;
            background-color: var(--background-transparent);
            color: var(--text-color);
        }

        .window-container {
            height: 100vh;
            overflow: hidden;
            background: var(--bg-primary);
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            flex: 1;
            padding: var(--main-content-padding);
            overflow-y: auto;
            background: var(--main-content-background);
        }

        .main-content.with-border {
            border-top: none;
        }

        .main-content.assistant-view {
            padding: 12px;
        }

        .main-content.onboarding-view {
            padding: 0;
            background: transparent;
        }

        .main-content.settings-view,
        .main-content.help-view,
        .main-content.history-view {
            padding: 0;
        }

        .view-container {
            opacity: 1;
            height: 100%;
        }

        .view-container.entering {
            opacity: 0;
        }

        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: transparent;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .vertical-slider-wrapper {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            background: transparent !important;
            padding: 15px 8px;
            border: none !important;
            z-index: 9999;
            -webkit-app-region: no-drag;
            box-shadow: none !important;
            // opacity: 0;
            transition: opacity 0.3s ease;
        }
        /* Only reveal them when the mouse is physically over the edge */
        // .vertical-slider-wrapper:hover {
        //     opacity: 1;
        // }

        /* Strip the ugly native browser styling */
        .vertical-slider-wrapper input[type='range'] {
            -webkit-appearance: none !important;
            background: transparent !important;
            border: none !important;
            outline: none !important;
        }

        /* Make the track a subtle, borderless frosted line */
        .vertical-slider-wrapper input[type='range']::-webkit-slider-runnable-track {
            background: rgba(255, 255, 255, 0.1) !important;
            border: none !important;
            border-radius: 10px;
        }

        /* Make the white thumb semi-transparent with no borders or shadows */
        .vertical-slider-wrapper input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            background: rgba(255, 255, 255, 0.5) !important; /* Soft frosted white */
            border: none !important;
            box-shadow: none !important;
            border-radius: 50%;
            height: 14px;
            width: 14px;
        }
        .slider-left {
            left: 5px;
        }
        .slider-right {
            right: 5px;
        }
        .vertical-slider-wrapper span {
            font-size: 11px;
            color: var(--text-muted);
            font-weight: bold;
        }
        .vertical-slider {
            writing-mode: vertical-lr;
            direction: rtl;
            width: 8px;
            height: 120px;
            background: transparent;
            margin: 0;
            padding: 0;
        }
    `;

    static properties = {
        currentView: { type: String },
        statusText: { type: String },
        startTime: { type: Number },
        isRecording: { type: Boolean },
        sessionActive: { type: Boolean },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        _viewInstances: { type: Object, state: true },
        _isClickThrough: { state: true },
        _awaitingNewResponse: { state: true },
        shouldAnimateResponse: { type: Boolean },
        _storageLoaded: { state: true },
        sessionMode: { type: String },
        bgTransparency: { type: Number },
        fontSize: { type: Number },
    };

    constructor() {
        super();
        // Set defaults - will be overwritten by storage
        this.currentView = 'main'; // Will check onboarding after storage loads
        this.statusText = '';
        this.startTime = null;
        this.isRecording = false;
        this.sessionActive = false;
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedScreenshotInterval = '5';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.responses = [];
        this.currentResponseIndex = -1;
        this._viewInstances = new Map();
        this._isClickThrough = false;
        this._awaitingNewResponse = false;
        this._currentResponseIsComplete = true;
        this.shouldAnimateResponse = false;
        this._storageLoaded = false;
        this.sessionMode = 'interview';
        this.bgTransparency = 0.8;
        this.fontSize = 12;

        // Load from storage
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            this.bgTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 12;

            this.applyBackgroundAppearance(prefs.backgroundColor ?? '#1e1e1e', this.bgTransparency);
            document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);

            // ALWAYS boot to the main hub menu
            this.currentView = 'main';
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 30, g: 30, b: 30 };
    }

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount),
        };
    }

    applyBackgroundAppearance(backgroundColor, alpha) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        const secondary = this.lightenColor(baseRgb, 7);
        const tertiary = this.lightenColor(baseRgb, 15);
        const hover = this.lightenColor(baseRgb, 20);

        // 🟢 FIX 1: Broadcast the raw alpha value so CSS calc() functions can use it inside the Shadow DOM!
        root.style.setProperty('--bg-alpha', alpha);

        // 🟢 FIX 2: Make nested container backgrounds transparent so they don't stack and multiply! (Fixes different shades of grey)
        root.style.setProperty('--header-background', `transparent`);
        root.style.setProperty('--main-content-background', `transparent`);
        root.style.setProperty('--scrollbar-background', `transparent`);

        // Standard Backgrounds
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--input-focus-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--hover-background', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);

        // 🟢 FIX 3: Map all standard borders and scrollbars directly to the alpha slider so they melt into glass!
        root.style.setProperty('--border-color', `rgba(60, 60, 60, ${alpha})`);
        root.style.setProperty('--border-subtle', `rgba(60, 60, 60, ${alpha})`);
        root.style.setProperty('--border-default', `rgba(74, 74, 74, ${alpha})`);
        root.style.setProperty('--button-border', `rgba(60, 60, 60, ${alpha})`);
        root.style.setProperty('--scrollbar-thumb', `rgba(60, 60, 60, ${alpha})`);
        root.style.setProperty('--scrollbar-thumb-hover', `rgba(74, 74, 74, ${alpha})`);
    }

    // Keep old function name for backwards compatibility
    applyBackgroundTransparency(alpha) {
        this.applyBackgroundAppearance('#1e1e1e', alpha);
    }

    connectedCallback() {
        super.connectedCallback();
        this.updateLayoutMode();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.on('new-response', (_, response) => {
                this.addNewResponse(response);
            });
            ipcRenderer.on('update-response', (_, response) => {
                this.updateCurrentResponse(response);
            });
            ipcRenderer.on('update-status', (_, status) => {
                this.setStatus(status);
            });
            ipcRenderer.on('click-through-toggled', (_, isEnabled) => {
                this._isClickThrough = isEnabled;
            });
            ipcRenderer.on('reconnect-failed', (_, data) => {
                this.addNewResponse(data.message);
            });

            // 🟢 FIX: The Global Phantom Mutator to cure the Electron Transparency Bug
            ipcRenderer.on('app-made-visible', () => {
                document.body.style.backgroundColor = 'rgba(0,0,0,0.01)';
                setTimeout(() => {
                    document.body.style.backgroundColor = 'transparent';
                }, 20);
                this.requestUpdate();
            });
        }
        this.syncListener = e => {
            if (e.detail && e.detail.key) {
                if (e.detail.key === 'backgroundTransparency') {
                    if (this.bgTransparency !== e.detail.value) {
                        this.bgTransparency = e.detail.value;
                        this.applyBackgroundAppearance('#1e1e1e', this.bgTransparency);
                        this.requestUpdate();
                        if (window.require) {
                            window.require('electron').ipcRenderer.invoke('sync-widget', { transparency: this.bgTransparency });
                        }
                    }
                } else if (e.detail.key === 'fontSize') {
                    if (this.fontSize !== e.detail.value) {
                        this.fontSize = e.detail.value;
                        document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
                        this.requestUpdate();
                    }
                }
            }
        };
        window.addEventListener('sync-preference', this.syncListener);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('new-response');
            ipcRenderer.removeAllListeners('update-response');
            ipcRenderer.removeAllListeners('update-status');
            ipcRenderer.removeAllListeners('click-through-toggled');
            ipcRenderer.removeAllListeners('reconnect-failed');
            ipcRenderer.removeAllListeners('app-made-visible'); // 🟢 NEW Cleanup
        }
        window.removeEventListener('sync-preference', this.syncListener);
    }

    setStatus(text) {
        this.statusText = text;

        // Mark response as complete when we get certain status messages
        if (text.includes('Ready') || text.includes('Listening') || text.includes('Error')) {
            this._currentResponseIsComplete = true;
            console.log('[setStatus] Marked current response as complete');
        }
    }

    addNewResponse(response) {
        // Add a new response entry (first word of a new AI response)
        this.responses = [...this.responses, response];
        this.currentResponseIndex = this.responses.length - 1;
        this._awaitingNewResponse = false;
        console.log('[addNewResponse] Added:', response);
        this.requestUpdate();
    }

    updateCurrentResponse(response) {
        // Update the current response in place (streaming subsequent words)
        if (this.responses.length > 0) {
            this.responses = [...this.responses.slice(0, -1), response];
            console.log('[updateCurrentResponse] Updated to:', response);
        } else {
            // Fallback: if no responses exist, add as new
            this.addNewResponse(response);
        }
        this.requestUpdate();
    }

    // Header event handlers
    handleCustomizeClick() {
        this.currentView = 'customize';
        this.requestUpdate();
    }

    handleHelpClick() {
        this.currentView = 'help';
        this.requestUpdate();
    }

    handleHistoryClick() {
        this.currentView = 'history';
        this.requestUpdate();
    }

    async handleClose() {
        if (this.currentView === 'customize' || this.currentView === 'help' || this.currentView === 'history') {
            this.currentView = 'main';
        } else if (this.currentView === 'assistant') {
            cheatingDaddy.stopCapture();

            // Close the session
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('close-session');
            }
            this.sessionActive = false;
            this.currentView = 'main';
            console.log('Session closed');
        } else {
            // Quit the entire application
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('quit-application');
            }
        }
    }

    async handleHideToggle() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            // 🐛 FIX: Tell the backend to hide BOTH the main window and the widget!
            await ipcRenderer.invoke('hide-all-overlays');
        }
    }

    // Main view event handlers
    async handleStart() {
        // check if api key is empty do nothing
        const apiKey = await cheatingDaddy.storage.getApiKey();
        if (!apiKey || apiKey === '') {
            // Trigger the red blink animation on the API key input
            const mainView = this.shadowRoot.querySelector('main-view');
            if (mainView && mainView.triggerApiKeyError) {
                mainView.triggerApiKeyError();
            }
            return;
        }

        await cheatingDaddy.initializeGemini(this.selectedProfile, this.selectedLanguage);
        // Pass the screenshot interval as string (including 'manual' option)
        cheatingDaddy.startCapture(this.selectedScreenshotInterval, this.selectedImageQuality);
        this.responses = [];
        this.currentResponseIndex = -1;
        this.startTime = Date.now();
        this.currentView = 'assistant';
    }

    async handleAPIKeyHelp() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://cheatingdaddy.com/help/api-key');
        }
    }

    async handleGroqAPIKeyHelp() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', 'https://console.groq.com/keys');
        }
    }

    // Customize view event handlers
    async handleProfileChange(profile) {
        this.selectedProfile = profile;
        await cheatingDaddy.storage.updatePreference('selectedProfile', profile);
    }

    async handleLanguageChange(language) {
        this.selectedLanguage = language;
        await cheatingDaddy.storage.updatePreference('selectedLanguage', language);
    }

    async handleScreenshotIntervalChange(interval) {
        this.selectedScreenshotInterval = interval;
        await cheatingDaddy.storage.updatePreference('selectedScreenshotInterval', interval);
    }

    async handleImageQualityChange(quality) {
        this.selectedImageQuality = quality;
        await cheatingDaddy.storage.updatePreference('selectedImageQuality', quality);
    }

    handleBackClick() {
        this.currentView = 'main';
        this.requestUpdate();
    }

    // Help view event handlers
    async handleExternalLinkClick(url) {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('open-external', url);
        }
    }

    // Assistant view event handlers
    async handleSendText(message) {
        const result = await window.cheatingDaddy.sendTextMessage(message);

        if (!result.success) {
            console.error('Failed to send message:', result.error);
            this.setStatus('Error sending message: ' + result.error);
        } else {
            this.setStatus('Message sent...');
            this._awaitingNewResponse = true;
        }
    }

    handleStart() {
        // NEUTERED: This catches legacy Ctrl+Enter commands from the old architecture
        // and prevents it from turning on navigator.mediaDevices (which triggers the Taskbar Mic warning).
        console.log('Legacy start intercepted and silenced for stealth.');
    }

    async handleHubNavigation(destination) {
        const { ipcRenderer } = window.require('electron');
        
        if (destination === 'quit') {
            await ipcRenderer.invoke('quit-application');
            return;
        }

        // 🟢 FIX: Turn off mouse sensors if we leave Proctored OA!
        if (destination !== 'proctored_oa') {
            ipcRenderer.send('stop-hot-corners');
        }

        if (destination === 'main') {
            window.dispatchEvent(new CustomEvent('help-mode-toggled', { detail: false }));
            ipcRenderer.send('toggle-radial-permanent', false);
            this.currentView = destination;
            this.requestUpdate();
            return;
        }

        if (destination === 'oa' || destination === 'interview' || destination === 'companion' || destination === 'proctored_oa' || destination === 'proctored_live_interview') {
            this.sessionMode = destination === 'interview' ? 'interview' : destination;
            const targetEngine = (destination === 'oa' || destination === 'proctored_oa') ? 1 : 0;
            await ipcRenderer.invoke('set-ai-provider', targetEngine);

            if (destination === 'proctored_oa') {
                const raw = await window.cheatingDaddy.storage.getPreferences();
                const bounds = (raw?.data || raw || {}).hotCornerBounds || { cornerSize: 15, centerX: 40, centerY: 40 };
                ipcRenderer.send('start-hot-corners', bounds);
                ipcRenderer.invoke('hide-widget'); 
                ipcRenderer.send('set-ignore-mouse-events', true); 
            } else if (destination === 'proctored_live_interview') {
                // 🟢 PROCTORED LIVE INTERVIEW LOCKS
                const raw = await window.cheatingDaddy.storage.getPreferences();
                const bounds = (raw?.data || raw || {}).hotCornerBounds || { cornerSize: 15, centerX: 40, centerY: 40 };
                ipcRenderer.send('start-hot-corners', bounds); // 🟢 Re-enable Edge Triggers!
                ipcRenderer.invoke('hide-widget'); 
                ipcRenderer.send('set-ignore-mouse-events', true); 
                ipcRenderer.send('toggle-radial-permanent', true); // 🟢 Show permanent Minimap HUD
            } else {
                ipcRenderer.send('set-ignore-mouse-events', false); 
            }
            
            // Turn off the HUD if we leave the mode
            if (destination !== 'proctored_live_interview') {
                ipcRenderer.send('toggle-radial-permanent', false);
            }

            this.currentView = 'assistant';
            this.requestUpdate();

            if (destination === 'companion') {
                setTimeout(() => window.dispatchEvent(new CustomEvent('help-mode-toggled', { detail: true })), 100);
            } else {
                setTimeout(() => window.dispatchEvent(new CustomEvent('help-mode-toggled', { detail: false })), 100);
            }
        } else {
            ipcRenderer.send('set-ignore-mouse-events', false); // Always restore clicks if returning to Hub
            this.currentView = destination; 
        }
        this.requestUpdate();
    }

    async handleTransparencyChange(e) {
        this.bgTransparency = parseFloat(e.target.value);
        await cheatingDaddy.storage.updatePreference('backgroundTransparency', this.bgTransparency);
        this.applyBackgroundAppearance('#1e1e1e', this.bgTransparency);

        // 🐛 FIX: Instantly sync the slider directly to the widget!
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('sync-widget', { transparency: this.bgTransparency });
        }
        window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: this.bgTransparency } }));
    }

    async handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        await cheatingDaddy.storage.updatePreference('fontSize', this.fontSize);
        document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
        window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'fontSize', value: this.fontSize } }));
    }

    handleResponseIndexChanged(e) {
        this.currentResponseIndex = e.detail.index;
        this.shouldAnimateResponse = false;
        this.requestUpdate();
    }

    // Onboarding event handlers
    handleOnboardingComplete() {
        this.currentView = 'main';
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        // Only notify main process of view change if the view actually changed
        if (changedProperties.has('currentView') && window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('view-changed', this.currentView);

            if (this.currentView !== 'assistant') {
                ipcRenderer.invoke('hide-widget').catch(() => {});
                ipcRenderer.invoke('hide-companion-chat').catch(() => {});
            }

            // Add a small delay to smooth out the transition
            const viewContainer = this.shadowRoot?.querySelector('.view-container');
            if (viewContainer) {
                viewContainer.classList.add('entering');
                requestAnimationFrame(() => {
                    viewContainer.classList.remove('entering');
                });
            }
        }

        if (changedProperties.has('layoutMode')) {
            this.updateLayoutMode();
        }
    }

    getDynamicHeaderTitle() {
        switch (this.currentView) {
            case 'main':
                return 'CP Helper 20';
            case 'assistant':
                if (this.sessionMode === 'oa') return 'CP Helper 20 - Online Assessment';
                if (this.sessionMode === 'proctored_oa') return 'CP Helper 20 - Proctored OA';
                if (this.sessionMode === 'proctored_live_interview') return 'CP Helper 20 - Proctored Live Interview';
                return 'CP Helper 20 - Live Interview';
            case 'customize':
                return 'CP Helper 20 - Settings';
            case 'history':
                return 'CP Helper 20 - History';
            case 'help':
                return 'CP Helper 20 - Help';
            default:
                return 'CP Helper 20';
        }
    }

    renderCurrentView() {
        // Only re-render the view if it hasn't been cached or if critical properties changed
        const viewKey = `${this.currentView}-${this.selectedProfile}-${this.selectedLanguage}`;

        switch (this.currentView) {
            case 'onboarding':
                return html`
                    <onboarding-view .onComplete=${() => this.handleOnboardingComplete()} .onClose=${() => this.handleClose()}></onboarding-view>
                `;

            case 'main':
                return html`
                    <main-view
                        .onStart=${() => this.handleStart()}
                        .onAPIKeyHelp=${() => this.handleAPIKeyHelp()}
                        .onGroqAPIKeyHelp=${() => this.handleGroqAPIKeyHelp()}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></main-view>
                `;

            case 'customize':
                return html`
                    <customize-view
                        .selectedProfile=${this.selectedProfile}
                        .selectedLanguage=${this.selectedLanguage}
                        .selectedScreenshotInterval=${this.selectedScreenshotInterval}
                        .selectedImageQuality=${this.selectedImageQuality}
                        .layoutMode=${this.layoutMode}
                        .onProfileChange=${profile => this.handleProfileChange(profile)}
                        .onLanguageChange=${language => this.handleLanguageChange(language)}
                        .onScreenshotIntervalChange=${interval => this.handleScreenshotIntervalChange(interval)}
                        .onImageQualityChange=${quality => this.handleImageQualityChange(quality)}
                        .onLayoutModeChange=${layoutMode => this.handleLayoutModeChange(layoutMode)}
                    ></customize-view>
                `;

            case 'help':
                return html` <help-view .onExternalLinkClick=${url => this.handleExternalLinkClick(url)}></help-view> `;

            case 'history':
                return html` <history-view></history-view> `;

            case 'assistant':
                return html`
                    <assistant-view
                        .responses=${this.responses}
                        .currentResponseIndex=${this.currentResponseIndex}
                        .selectedProfile=${this.selectedProfile}
                        .onSendText=${message => this.handleSendText(message)}
                        .shouldAnimateResponse=${this.shouldAnimateResponse}
                        @response-index-changed=${this.handleResponseIndexChanged}
                        @response-animation-complete=${() => {
                            this.shouldAnimateResponse = false;
                            this._currentResponseIsComplete = true;
                            console.log('[response-animation-complete] Marked current response as complete');
                            this.requestUpdate();
                        }}
                    ></assistant-view>
                `;

            default:
                return html`<div>Unknown view: ${this.currentView}</div>`;
        }
    }

    render() {
        return html`
            <div class="window-container">
                <div class="vertical-slider-wrapper slider-left">
                    <span>BG</span>
                    <input
                        type="range"
                        class="vertical-slider"
                        min="0"
                        max="1"
                        step="0.05"
                        .value=${this.bgTransparency}
                        @input=${this.handleTransparencyChange}
                    />
                </div>

                <div class="vertical-slider-wrapper slider-right">
                    <span>Aa</span>
                    <input
                        type="range"
                        class="vertical-slider"
                        min="12"
                        max="32"
                        step="1"
                        .value=${this.fontSize}
                        @input=${this.handleFontSizeChange}
                    />
                </div>

                <div class="container" style="padding: 0 45px;">
                    <app-header
                        .title=${this.getDynamicHeaderTitle()}
                        .currentView=${this.currentView}
                        .onBackClick=${() => this.handleHubNavigation('main')}
                        .onHideClick=${() => this.handleHideToggle()}
                        .onQuitClick=${async () => {
                            const { ipcRenderer } = window.require('electron');
                            await ipcRenderer.invoke('quit-application');
                        }}
                    ></app-header>

                    <div class="main-content">
                        <div class="view-container">
                            ${this.currentView === 'main'
                                ? html` <main-view .onNavigate=${dest => this.handleHubNavigation(dest)}></main-view> `
                                : this.currentView === 'customize'
                                  ? html` <customize-view></customize-view> `
                                  : this.currentView === 'history'
                                    ? html` <history-view></history-view> `
                                    : this.currentView === 'help'
                                      ? html` <help-view></help-view> `
                                      : this.currentView === 'assistant'
                                        ? html` <assistant-view .currentMode=${this.sessionMode}></assistant-view> `
                                        : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateLayoutMode() {
        // Apply or remove compact layout class to document root
        if (this.layoutMode === 'compact') {
            document.documentElement.classList.add('compact-layout');
        } else {
            document.documentElement.classList.remove('compact-layout');
        }
    }

    async handleLayoutModeChange(layoutMode) {
        this.layoutMode = layoutMode;
        await cheatingDaddy.storage.updateConfig('layout', layoutMode);
        this.updateLayoutMode();

        // Notify main process about layout change for window resizing
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-sizes');
            } catch (error) {
                console.error('Failed to update sizes in main process:', error);
            }
        }

        this.requestUpdate();
    }
}

customElements.define('cheating-daddy-app', CheatingDaddyApp);
