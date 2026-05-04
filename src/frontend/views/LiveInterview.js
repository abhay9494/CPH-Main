import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import '../components/ChatFeed.js';

export class LiveInterview extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: transparent; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        .split-container { display: flex; width: 100%; height: 100%; background: transparent; position: relative; gap: 10px; padding-bottom: 10px; }
        .pane { flex: 1; border-radius: 8px; overflow-y: auto; padding: 15px 10px; background: var(--bg-secondary); transition: border-color 0.2s; display: flex; flex-direction: column; border: 1px solid var(--border-color); position: relative; }
        .pane.hovered-code { border-color: #4285f4; }
        .pane.hovered-voice { border-color: #a142f4; }
        .pane.hovered-comp { border-color: #00cc66; }
        .pane-header { position: sticky; top: -15px; background: var(--bg-tertiary); backdrop-filter: blur(5px); padding: 8px 10px; margin: -15px -10px 10px -10px; border-bottom: 1px solid var(--border-color); z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; }
        .header-title { font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .code-title { color: #4285f4; }
        .voice-title { color: #a142f4; }
        .header-controls { display: flex; gap: 8px; align-items: center; }
        .status-badge { font-size: 11px; }
        .count-badge { font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }
        .mic-btn { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; transition: 0.2s; cursor: pointer !important; }
        .mic-btn.on { background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); }
        .mic-btn.off { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border: 1px solid rgba(241, 76, 76, 0.4); }
        .chat-feed-wrapper { 
            flex: 1; 
            overflow-y: auto; 
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
            mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .sync-reminder { 
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); 
            background: #f59e0b; color: #000; padding: 6px 14px; border-radius: 20px; 
            font-size: 11px; font-weight: bold; text-transform: uppercase;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); 
            z-index: 100; pointer-events: none; border: 2px solid #fff;
            animation: pulse-reminder 2s infinite; 
        }
        @keyframes pulse-reminder { 
            0% { transform: translateX(-50%) scale(1); } 
            50% { transform: translateX(-50%) scale(1.05); box-shadow: 0 0 20px rgba(245, 158, 11, 0.8); } 
            100% { transform: translateX(-50%) scale(1); } 
        }
    `;

    static properties = {
        codeChatHistory: { type: Array }, voiceChatHistory: { type: Array }, companionChatHistory: { type: Array },
        codeChatIndex: { type: Number }, voiceChatIndex: { type: Number }, companionChatIndex: { type: Number },
        paneHoverState: { type: String }, isMicOn: { type: Boolean },
        tacThinkMode: { type: Boolean }, toastMessage: { type: String },
        activePage: { type: Number }, prefs: { type: Object },
        optimizedReady: { type: Boolean },
        isSwapped: { type: Boolean }
    };

    constructor() {
        super();
        this.codeChatHistory = []; this.voiceChatHistory = []; this.companionChatHistory = [];
        this.codeChatIndex = 0; this.voiceChatIndex = 0; this.companionChatIndex = 0;
        this.paneHoverState = 'code'; this.isMicOn = false;
        this.tacThinkMode = false; this.toastMessage = '';
        this.activePage = 1; this.prefs = {}; this.trimTick = 0;
        this._isGhostHidden = false; this._isHoveringStealthDot = false;
        this.hoverTimer = null; this.autoMicTimer = null;
        this.swipeCooldown = false;
        this.optimizedReady = false;
        this.hasSyncedOptimized = false;
        this.isSwapped = false;
        this.hideAiEdgeCooldown = false;
    }

    getDefaultMap(page) {
        const defaultPage1 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'mic', right_mid_top: 'change_ai', middle_left: 'prev_resp', middle_right: 'next_resp', left_mid_bottom: 'fast_think', right_mid_bottom: 'change_profile', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };
        const defaultPage2 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'bg_inc', right_mid_top: 'text_inc', middle_left: 'reset', middle_right: 'language', left_mid_bottom: 'bg_dec', right_mid_bottom: 'text_dec', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };
        return page === 2 ? defaultPage2 : defaultPage1;
    }

    showToast(msg) {
        if (window.require) {
            window.require('electron').ipcRenderer.send('show-radial-toast', msg);
        }
    }

    async connectedCallback() {
        super.connectedCallback();

        this.wheelHandler = (e) => {
            if (e.ctrlKey) {
                e.preventDefault(); // Stop browser zooming/navigation

                if (window.require) {
                    window.require('electron').ipcRenderer.send('abort-radial-hud');
                }

                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    // 🟢 Horizontal Swipe Detected
                    if (!this.swipeCooldown && Math.abs(e.deltaX) > 20) {
                        this.swipeCooldown = true;
                        
                        if (e.deltaX > 0) {
                            this.executeHotCorner('next_resp'); // Swipe Right = Next
                        } else {
                            this.executeHotCorner('prev_resp'); // Swipe Left = Previous
                        }
                        
                        setTimeout(() => { this.swipeCooldown = false; }, 400); 
                    }
                } else {
                    // 🟢 Vertical Scroll Detected (Flawlessly uses hover state)
                    let wrapperId = 'code-feed-wrapper';
                    if (this.paneHoverState === 'voice') wrapperId = 'voice-feed-wrapper';
                    if (this.paneHoverState === 'comp') wrapperId = 'comp-feed-wrapper';

                    const wrapper = this.shadowRoot.getElementById(wrapperId);
                    if (wrapper) {
                        wrapper.scrollBy({ top: e.deltaY, behavior: 'auto' });
                    }
                }
            }
        };
        window.addEventListener('wheel', this.wheelHandler, { passive: false });
        
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            const raw = await window.cheatingDaddy.storage.getPreferences();
            this.prefs = raw?.data || raw || {};
            if (this.prefs.tacThinkMode !== undefined) this.tacThinkMode = this.prefs.tacThinkMode;
            this.syncRadialToBackend(); 
        }

        this.syncPrefHandler = (e) => {
            if (e.detail && e.detail.key && e.detail.value !== undefined) {
                this.prefs = { ...this.prefs, [e.detail.key]: e.detail.value };
                if (e.detail.key.includes('interviewCorners')) this.syncRadialToBackend();
            }
        };
        window.addEventListener('sync-preference', this.syncPrefHandler);

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            ipcRenderer.send('set-ignore-mouse-events', true);

            this.ghostHiddenHandler = () => { this._isGhostHidden = true; };
            this.ghostVisibleHandler = () => { this._isGhostHidden = false; };
            ipcRenderer.on('app-made-hidden', this.ghostHiddenHandler);
            ipcRenderer.on('app-made-visible', this.ghostVisibleHandler);

            this.hoverHandler = (_, zone) => {
                if (this.hoverTimer) { clearInterval(this.hoverTimer); this.hoverTimer = null; }

                const killDot = () => {
                    if (this._isHoveringStealthDot) {
                        ipcRenderer.send('set-ghost-dot', false);
                        this._isHoveringStealthDot = false;
                    }
                };

                // If mouse leaves all zones, reset everything including all cooldowns
                if (!zone || zone === 'none') { 
                    killDot(); 
                    this.swapEdgeCooldown = false; 
                    this.hideAiEdgeCooldown = false;
                    return; 
                }

                const stealthEdge = this.prefs.interviewStealthEdge || 'none';
                const swapEdge = this.prefs.interviewSwapEdge || 'none';
                const hideAiEdge = this.prefs.interviewHideAiEdge || 'none'; // 🟢 Added Hide AI Edge

                // 🟢 1. Process "Swap Panes" Edge Trigger
                if (zone === swapEdge && swapEdge !== 'none') {
                    killDot();
                    this.hideAiEdgeCooldown = false; // Reset the other cooldown
                    if (!this.swapEdgeCooldown) {
                        this.swapEdgeCooldown = true;
                        this.executeHotCorner('swap_panes');
                    }
                    return;
                }
                
                // 🟢 2. Process "Toggle AI Visibility" Edge Trigger
                if (zone === hideAiEdge && hideAiEdge !== 'none') {
                    killDot();
                    this.swapEdgeCooldown = false; // Reset the other cooldown
                    if (!this.hideAiEdgeCooldown) {
                        this.hideAiEdgeCooldown = true;
                        this.executeHotCorner('toggle_ai_vis');
                    }
                    return;
                }

                // If they are in a zone but it's NOT the swap or hide edge, reset their cooldowns
                this.swapEdgeCooldown = false;
                this.hideAiEdgeCooldown = false;

                // 🟢 3. Process "Stealth" Edge Trigger
                if (zone === stealthEdge && stealthEdge !== 'none') {
                    if (this._isGhostHidden) {
                        if (!this._isHoveringStealthDot) {
                            ipcRenderer.send('set-ghost-dot', true);
                            this._isHoveringStealthDot = true;
                        }
                    } else { killDot(); }

                    const bounds = this.prefs.hotCornerBounds || { hideTime: 0 };
                    let targetTimeMs = this._isGhostHidden ? ((bounds.hideTime || 0) * 1000) : 0;
                    
                    let progress = 0;
                    if (targetTimeMs <= 0) { this.executeHotCorner('hide_unhide'); return; }

                    this.hoverTimer = setInterval(() => {
                        progress += (50 / targetTimeMs) * 100;
                        if (progress >= 100) {
                            clearInterval(this.hoverTimer);
                            this.hoverTimer = null;
                            this.executeHotCorner('hide_unhide');
                        }
                    }, 50);
                } else {
                    killDot();
                }
            };

            ipcRenderer.on('hot-corner-hover', this.hoverHandler);

            this.voiceNewHandler = (_, text) => { 
                this.voiceChatHistory = [...this.voiceChatHistory, text]; 
                this.voiceChatIndex = this.voiceChatHistory.length - 1; 
                this.requestUpdate(); 
                this.scrollToBottom('voice-feed');
            };
            this.voiceUpdateHandler = (_, text) => { 
                if (this.voiceChatHistory.length > 0) this.voiceChatHistory[this.voiceChatHistory.length - 1] = text;
                else this.voiceChatHistory = [text];
                this.voiceChatIndex = this.voiceChatHistory.length - 1; 
                this.requestUpdate(); 
                this.scrollToBottom('voice-feed');
            };
            this.codeNewHandler = (_, text) => { 
                // 🟢 TRIGGER: Code block finished! Turn on the reminder.
                if (text.includes('[CODE_END]') && !this.hasSyncedOptimized) this.optimizedReady = true;

                if (this.codeChatHistory.length > 0) {
                    const currentBlock = this.codeChatHistory[this.codeChatIndex] || "";
                    const images = currentBlock.match(/<img[^>]+>/g) || [];
                    
                    if (images.length > 0 && currentBlock.replace(/<img[^>]+>/g, '').replace(/🟢 \*\*Code Engine Online\*\*\nWaiting for captures.../g, '').trim() === "") {
                        this.codeChatHistory[this.codeChatIndex] = images.join("") + "\n\n" + text;
                    } else {
                        this.codeChatHistory = [...this.codeChatHistory, text]; 
                        this.codeChatIndex = this.codeChatHistory.length - 1; 
                    }
                } else {
                    this.codeChatHistory = [text];
                    this.codeChatIndex = 0;
                }
                this.requestUpdate(); 
            };

            this.codeUpdateHandler = (_, text) => { 
                // 🟢 TRIGGER: Code block finished! Turn on the reminder.
                if (text.includes('[CODE_END]') && !this.hasSyncedOptimized) this.optimizedReady = true;

                if (this.codeChatHistory.length > 0) { 
                    const a = [...this.codeChatHistory]; 
                    const currentBlock = a[a.length - 1] || "";
                    const images = currentBlock.match(/<img[^>]+>/g) || [];
                    
                    a[a.length - 1] = images.join("") + "\n\n" + text; 
                    this.codeChatHistory = a; 
                } else { 
                    this.codeChatHistory = [text]; 
                    this.codeChatIndex = 0; 
                } 
                this.requestUpdate(); 
            };
            this.compNewHandler = (_, text) => { 
                this.companionChatHistory = [...this.companionChatHistory, text]; 
                this.companionChatIndex = this.companionChatHistory.length - 1; 
                this.requestUpdate(); 
                this.scrollToBottom('comp-feed');
            };
            this.compUpdateHandler = (_, text) => { 
                if (this.companionChatHistory.length > 0) this.companionChatHistory[this.companionChatHistory.length - 1] = text;
                else this.companionChatHistory = [text];
                this.companionChatIndex = this.companionChatHistory.length - 1; 
                this.requestUpdate(); 
                this.scrollToBottom('comp-feed');
            };
            
            this.micSyncHandler = (_, state) => { this.isMicOn = state; this.requestUpdate(); };

            // 🟢 FIX: Small Inline Images + Removed from Voice Brain!
            this.screenshotHandler = (_, base64Img) => {
                const inlineStyle = "max-width: 140px; max-height: 100px; object-fit: cover; border-radius: 6px; margin: 4px; border: 1px solid #444; cursor: default !important; display: inline-block; vertical-align: top;";
                const imgHTML = `<img src="${base64Img}" style="${inlineStyle}" />`;
                
                // Inject ONLY into Code Brain
                if (this.codeChatHistory.length === 0) this.codeChatHistory = ["🟢 **Code Engine Online**\nWaiting for captures...\n\n"];
                this.codeChatHistory[this.codeChatIndex] = (this.codeChatHistory[this.codeChatIndex] || "") + imgHTML;

                this.requestUpdate();
                this.scrollToBottom('code-feed');
            };
            ipcRenderer.on('screenshot-captured', this.screenshotHandler);

            // 🟢 NEW: Sync local UI to backend DOM Scraper Truth
            this.aiModeSyncHandler = (_, isThinkMode) => {
                if (this.tacThinkMode !== isThinkMode) {
                    this.tacThinkMode = isThinkMode;
                    if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                        window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode);
                    }
                    this.syncRadialToBackend(); 
                    this.requestUpdate();
                }
            };
            ipcRenderer.on('sync-ai-mode', this.aiModeSyncHandler);

            this.radialExecuteHandler = (_, sliceIndex) => {
                if (sliceIndex !== null) {
                    const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                    let activeMap = this.activePage === 2 ? (this.prefs?.interviewCornersPage2 || {}) : (this.prefs?.interviewCorners || {});                    
                    activeMap = { ...this.getDefaultMap(this.activePage), ...activeMap }; 
                    const action = activeMap[clockWiseGrid[sliceIndex]];
                    if (action && action !== 'none') this.executeHotCorner(action);
                }
            };

            this.radialContinuousHandler = (_, sliceIndex) => {
                const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                let activeMap = this.activePage === 2 ? (this.prefs?.interviewCornersPage2 || {}) : (this.prefs?.interviewCorners || {});                
                activeMap = { ...this.getDefaultMap(this.activePage), ...activeMap }; 
                
                const action = activeMap[clockWiseGrid[sliceIndex]];
                
                if (['scroll_up', 'scroll_down'].includes(action)) {
                    this.trimTick = (this.trimTick || 0) + 1;
                    if (this.trimTick >= 6) { this.executeHotCorner(action); this.trimTick = 0; }
                } else if (['text_inc', 'text_dec', 'bg_inc', 'bg_dec'].includes(action)) {
                    this.trimTick = (this.trimTick || 0) + 1;
                    if (this.trimTick >= 15) { this.executeHotCorner(action); this.trimTick = 0; }
                }
            };

            ipcRenderer.on('voice-new-message', this.voiceNewHandler);
            ipcRenderer.on('voice-update-message', this.voiceUpdateHandler);
            ipcRenderer.on('code-new-message', this.codeNewHandler);
            ipcRenderer.on('code-update-message', this.codeUpdateHandler);
            ipcRenderer.on('sync-mic-state', this.micSyncHandler);
            ipcRenderer.on('execute-radial-hud', this.radialExecuteHandler);
            ipcRenderer.on('radial-continuous-hold', this.radialContinuousHandler);

            ipcRenderer.on('companion-new-message', this.compNewHandler);
            ipcRenderer.on('companion-update-message', this.compUpdateHandler);

            this._autoStartMic();
            
            this._autoStartMic();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('sync-preference', this.syncPrefHandler);
        window.removeEventListener('wheel', this.wheelHandler);
        if (this.autoMicTimer) clearTimeout(this.autoMicTimer);
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeListener('app-made-hidden', this.ghostHiddenHandler);
            ipcRenderer.removeListener('app-made-visible', this.ghostVisibleHandler);
            ipcRenderer.removeListener('hot-corner-hover', this.hoverHandler);
            ipcRenderer.removeListener('voice-new-message', this.voiceNewHandler);
            ipcRenderer.removeListener('voice-update-message', this.voiceUpdateHandler);
            ipcRenderer.removeListener('code-new-message', this.codeNewHandler);
            ipcRenderer.removeListener('code-update-message', this.codeUpdateHandler);
            ipcRenderer.removeListener('sync-mic-state', this.micSyncHandler);
            ipcRenderer.removeListener('sync-ai-mode', this.aiModeSyncHandler);
            ipcRenderer.removeListener('execute-radial-hud', this.radialExecuteHandler);
            ipcRenderer.removeListener('radial-continuous-hold', this.radialContinuousHandler);
            ipcRenderer.removeListener('companion-new-message', this.compNewHandler);
            ipcRenderer.removeListener('companion-update-message', this.compUpdateHandler);
        }
    }

    _autoStartMic() {
        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');
        
        if (this.autoMicTimer) {
            clearTimeout(this.autoMicTimer);
            this.autoMicTimer = null;
        }
        
        let attempts = 0;
        
        const tryEnable = async () => {
            if (!this.isConnected) return; 
            if (this.isMicOn) {
                this.showToast('🎙️ Voice Auto-Started');
                return; 
            }
            if (attempts >= 20) return; 
            
            attempts++;
            try {
                await ipcRenderer.invoke('toggle-ai-mic', true);
            } catch (e) {}
            this.autoMicTimer = setTimeout(tryEnable, 2000);
        };
        this.autoMicTimer = setTimeout(tryEnable, 3000);
    }

    getHotCornerLabel(action) {
        const labels = {
            'none': '—', 'capture': '📸 Capture', 'send_ai': '🚀 Send AI',
            'hide_unhide': '👻 Hide/Show', 'scroll_up': '⬆️ Scroll Up', 'scroll_down': '⬇️ Scroll Dn',
            'prev_resp': '◀ Prev', 'next_resp': '▶ Next', 'change_ai': '🤖 Change AI',
            'change_profile': '👤 Swap Pane', 
            'fast_think': this.tacThinkMode ? '🧠 Think' : '⚡ Fast', // 🟢 DYNAMIC UI INJECTION
            'refactor': '🛠️ Refactor',
            'reset': '✨ Reset', 'text_inc': 'A+ Text', 'text_dec': 'A- Text',
            'bg_inc': '⬛ Opacity+', 'bg_dec': '⬜ Opacity-', 'toggle_ai_vis': '👁️ Toggle AI',
            'fix_error': '🌟 Sync Optimized', 'language': '💻 Language', 'mic': '🎙️ Mic',
            'toggle_page2': '🔄 Page 1 / 2', 'regenerate': '🔄 Regen', 'abort_oa': '🚪 Abort',
            'toggle_theme': '🌓 Theme Flip', 'sync_followup': '🔍 Follow-up Image',
            'swap_panes': '🔀 Swap Panes', 'fusion_dry_run': '🎯 Fusion Dry Run',
            'on_the_go': '🏃 On-The-Go Dictator'
        };
        return labels[action] || action || '—';
    }

    syncRadialToBackend() {
        if (!window.require) return;
        let activeMap = this.activePage === 2 ? (this.prefs?.interviewCornersPage2 || {}) : (this.prefs?.interviewCorners || {});
        activeMap = { ...this.getDefaultMap(this.activePage), ...activeMap }; 

        const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
        const labelsArray = clockWiseGrid.map(key => this.getHotCornerLabel(activeMap[key] || 'none'));
        window.require('electron').ipcRenderer.send('sync-radial-labels', labelsArray);
    }

    executeHotCorner(action) {
        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');
        switch (action) {
            case 'capture': 
                this.showToast('📸 Screenshot Captured');
                ipcRenderer.invoke('capture-screenshot');
                break;
            case 'send_ai': 
                const targetCodeLang = this.prefs.programmingLanguage || 'C++';
                ipcRenderer.invoke('send-oa-automation', targetCodeLang).then(success => {
                    if (success) {
                        this.showToast(`🚀 FIRING TO AI (${targetCodeLang})`);
                        this.codeChatHistory = []; 
                        this.voiceChatHistory = [];
                        this.codeChatIndex = 0; 
                        this.voiceChatIndex = 0;
                        this.hasSyncedOptimized = false;
                        this.optimizedReady = false; // 🟢 RESET BANNER
                        this.requestUpdate();
                    } else {
                        this.showToast('❌ CAPTURE IMAGE FIRST');
                    }
                });
                break;
                
            case 'language':
                // 🟢 NEW: Instantly toggle coding languages via Hot Corner!
                const langs = ['C++', 'Python', 'Java', 'JavaScript'];
                let currentLang = this.prefs.programmingLanguage || 'C++';
                let nextLangIndex = (langs.indexOf(currentLang) + 1) % langs.length;
                let nextLang = langs[nextLangIndex];
                
                this.showToast(`💻 Language: ${nextLang}`);
                
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('programmingLanguage', nextLang);
                    window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'programmingLanguage', value: nextLang } }));
                    this.prefs.programmingLanguage = nextLang;
                }
                break;
            case 'fix_error': 
                if (this.codeChatHistory.length > 0) {
                    this.showToast('🌟 SYNCED TO VOICE');
                    this.codeChatIndex = this.codeChatHistory.length - 1; 
                    this.hasSyncedOptimized = true; // 🟢 MARK AS SYNCED
                    this.optimizedReady = false;    // 🟢 HIDE BANNER
                    this.requestUpdate();
                    
                    const cleanCodeText = this.codeChatHistory[this.codeChatIndex].replace(/<img[^>]*>/g, '').replace(/🟢 \*\*Code Engine Online\*\*.*?captures.../gs, '');
                    ipcRenderer.invoke('sync-optimized-to-voice', cleanCodeText);
                } else {
                    this.showToast('⏳ NO CODE TO SYNC');
                }
                break;
            case 'sync_followup': // 🟢 NEW: AUTO-CAPTURE + INVISIBLE RELAY
                this.showToast('🔍 CAPTURING & EXTRACTING...');
                ipcRenderer.invoke('send-sync-followup');
                break;

            case 'fusion_dry_run':
                this.showToast('🎯 INITIATING FUSION DRY RUN...');
                
                // 1. Scrape the 3 most recent context blocks from both conversational brains
                const recentVoice = this.voiceChatHistory.slice(-3).join('\n\n---\n\n');
                const recentComp = this.companionChatHistory.slice(-3).join('\n\n---\n\n');
                
                // 2. Build the unified text payload
                const payload = `--- INTERVIEWER RECENT SPEECH (Voice Brain) ---\n${recentVoice || 'None'}\n\n--- MY RECENT SPEECH (Companion Brain) ---\n${recentComp || 'None'}`;
                
                // 3. Fire to Backend
                if (window.require) {
                    window.require('electron').ipcRenderer.invoke('trigger-fusion-dry-run', payload).then(success => {
                        if (success) {
                            // 🟢 THE FIX: We NO LONGER wipe 'this.codeChatHistory = []'!
                            // We keep the history intact so you can swipe back to your code.
                            // We just reset the sync banners for the incoming script.
                            this.codeChatIndex = Math.max(0, this.codeChatHistory.length - 1);
                            this.hasSyncedOptimized = false;
                            this.optimizedReady = false; 
                            this.requestUpdate();
                        }
                    });
                }
                break;

            case 'on_the_go':
                this.showToast('🏃 ON-THE-GO DICTATOR...');
                if (this.codeChatHistory.length > 0) {
                    // Extract the raw text from the current code slide, stripping HTML
                    const currentCode = this.codeChatHistory[this.codeChatIndex].replace(/<img[^>]*>/g, '').replace(/🟢 \*\*Code Engine Online\*\*.*?captures.../gs, '');
                    
                    if (window.require) {
                        window.require('electron').ipcRenderer.invoke('trigger-on-the-go', currentCode).then(success => {
                            if (success) {
                                // Slide to the new page when it arrives
                                this.codeChatIndex = Math.max(0, this.codeChatHistory.length - 1);
                                this.hasSyncedOptimized = false;
                                this.optimizedReady = false; 
                                this.requestUpdate();
                            }
                        });
                    }
                } else {
                    this.showToast('⏳ NO CODE TO DICTATE');
                }
                break;
            
            case 'regenerate':
                this.showToast('🔄 Regenerating...');
                ipcRenderer.invoke('send-oa-regenerate');
                break;
            case 'hide_unhide': 
                this.showToast('👻 Toggled Stealth'); 
                ipcRenderer.invoke('trigger-ghost-hide'); 
                break;
            case 'toggle_ai_vis':
                this.showToast('👁️ Toggled AI Window');
                ipcRenderer.invoke('toggle-ai-visibility');
                break;
            case 'toggle_page2':
                this.activePage = this.activePage === 1 ? 2 : 1;
                this.showToast(`📄 Switched to Page ${this.activePage}`);
                this.syncRadialToBackend(); 
                break;
            case 'scroll_up':
                if (this.paneHoverState === 'voice') this.shadowRoot.querySelector('#voice-feed-wrapper')?.scrollBy({top: -150, behavior: 'smooth'});
                else this.shadowRoot.querySelector('#code-feed-wrapper')?.scrollBy({top: -150, behavior: 'smooth'});
                break;
            case 'scroll_down':
                if (this.paneHoverState === 'voice') this.shadowRoot.querySelector('#voice-feed-wrapper')?.scrollBy({top: 150, behavior: 'smooth'});
                else this.shadowRoot.querySelector('#code-feed-wrapper')?.scrollBy({top: 150, behavior: 'smooth'});
                break;
            case 'prev_resp':
                this.showToast('◀ Previous');
                if (this.paneHoverState === 'voice' && this.voiceChatIndex > 0) { this.voiceChatIndex--; this.requestUpdate(); }
                else if (this.paneHoverState === 'code' && this.codeChatIndex > 0) { this.codeChatIndex--; this.requestUpdate(); }
                break;
            case 'next_resp':
                this.showToast('▶ Next');
                if (this.paneHoverState === 'voice' && this.voiceChatIndex < this.voiceChatHistory.length - 1) { this.voiceChatIndex++; this.requestUpdate(); }
                else if (this.paneHoverState === 'code' && this.codeChatIndex < this.codeChatHistory.length - 1) { this.codeChatIndex++; this.requestUpdate(); }
                break;
            case 'change_profile':
                this.showToast('👤 Swapped Loadout Pane');
                this.paneHoverState = this.paneHoverState === 'code' ? 'voice' : 'code';
                this.requestUpdate();
                break;
            case 'fast_think': 
                // 🟢 NEW: Active DOM Command Injection
                this.showToast('🔄 Toggling AI Mode...');
                ipcRenderer.invoke('toggle-ai-mode');
                break;
            case 'mic':
                this.handleToggleMic();
                break;
            case 'toggle_theme':
                // 🟢 NEW: Dynamic Flip Action
                let currentTheme = this.prefs.theme || 'dark';
                let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                this.showToast(newTheme === 'light' ? '☀️ Light Mode Active' : '🌙 Dark Mode Active');
                
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('theme', newTheme);
                    window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'theme', value: newTheme } })); 
                    this.prefs.theme = newTheme;
                }
                break;
            case 'reset':
                this.showToast('✨ Session Reset');
                this.codeChatHistory = []; this.voiceChatHistory = [];
                this.codeChatIndex = 0; this.voiceChatIndex = 0;
                this.companionChatHistory = []; this.companionChatIndex = 0;
                this.optimizedReady = false; 
                this.hasSyncedOptimized = false;
                ipcRenderer.invoke('new-chat');
                this.requestUpdate();
                this._autoStartMic(); 
                break;
            case 'text_inc': 
            case 'text_dec':
                let currentSize = this.prefs.fontSize || 13;
                currentSize = Math.max(12, Math.min(32, currentSize + (action === 'text_inc' ? 1 : -1)));
                this.showToast(action === 'text_inc' ? 'A+ Text Size' : 'A- Text Size');
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('fontSize', currentSize);
                    window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'fontSize', value: currentSize } })); 
                }
                break;
            case 'bg_inc':
            case 'bg_dec':
                let newTrans = (this.prefs.backgroundTransparency ?? 0.8) + (action === 'bg_inc' ? 0.02 : -0.02);
                newTrans = Math.max(0, Math.min(1, Math.round(newTrans * 100) / 100));
                this.showToast(action === 'bg_inc' ? '⬛ Opacity Increased' : '⬜ Opacity Decreased');
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('backgroundTransparency', newTrans);
                    window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: newTrans } })); 
                    if (window.require) {
                        window.require('electron').ipcRenderer.send('update-radial-alpha', newTrans);
                    }
                }
                break;
            case 'abort_oa':
                this.showToast('🚪 Exiting & Clearing Chat...');
                
                // 🟢 FIX: Wipe the frontend history so the UI is clean next time
                this.codeChatHistory = []; 
                this.voiceChatHistory = [];
                this.codeChatIndex = 0; 
                this.voiceChatIndex = 0;
                this.companionChatHistory = []; 
                this.companionChatIndex = 0;
                this.optimizedReady = false; 
                this.hasSyncedOptimized = false;
                
                // 🟢 FIX: Tell the backend to force-reload the AI URLs, resetting their memory
                ipcRenderer.invoke('new-chat');
                
                // Proceed with normal shutdown sequence
                ipcRenderer.send('set-session-mode', 'main');
                ipcRenderer.send('toggle-radial-permanent', false);
                ipcRenderer.send('set-ignore-mouse-events', false);
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;
            case 'swap_panes': // 🟢 NEW: Instantly flips UI and Hardware Windows
                this.isSwapped = !this.isSwapped;
                this.showToast('🔀 Swapped Brain Panes');
                if (window.require) window.require('electron').ipcRenderer.invoke('swap-ai-windows', this.isSwapped).catch(()=>{});
                this.requestUpdate();
                break;
        }
    }

    scrollToBottom(feedId) {
        setTimeout(() => {
            const feed = this.shadowRoot.getElementById(feedId);
            if (feed && feed.shadowRoot) {
                const container = feed.shadowRoot.querySelector('.markdown-body');
                if (container) {
                    const wrapper = this.shadowRoot.getElementById(feedId + '-wrapper');
                    if (wrapper) {
                        wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' });
                    }
                }
            }
        }, 50);
    }

    handleToggleMic() {
        this.showToast('🎙️ Toggling Mic...');
        if (window.require) {
            window.require('electron').ipcRenderer.invoke('toggle-ai-mic', !this.isMicOn).catch(()=>{});
        }
    }

    render() {
        let leftContent = this.codeChatHistory.length > 0 ? this.codeChatHistory[this.codeChatIndex] : "🟢 **Code Engine Online**\nWaiting for captures...";
        let rightContent = this.voiceChatHistory.length > 0 ? this.voiceChatHistory[this.voiceChatIndex] : "🟢 **Voice Engine Online**\nListening to microphone feed...";
        let compContent = this.companionChatHistory.length > 0 ? this.companionChatHistory[this.companionChatIndex] : "🤝 **Companion Online**\nListening to room mic...";

        return html`
            <div class="split-container" style="flex-direction: ${this.isSwapped ? 'row-reverse' : 'row'};">
                <div class="pane ${this.paneHoverState === 'code' ? 'hovered-code' : ''}" @mouseenter=${() => this.paneHoverState = 'code'}>
                    <div class="pane-header">
                        <span class="header-title code-title">💻 Code Brain</span>
                        <div class="header-controls">
                            <span class="status-badge" style="color: ${this.tacThinkMode ? '#f59e0b' : '#00cc66'};">${this.tacThinkMode ? '🧠 Think' : '⚡ Fast'}</span>
                            <span class="count-badge">${this.codeChatHistory.length ? `${this.codeChatIndex + 1}/${this.codeChatHistory.length}` : '0/0'}</span>
                        </div>
                    </div>
                    <div class="chat-feed-wrapper" id="code-feed-wrapper">
                        <chat-feed id="code-feed" .content=${leftContent}></chat-feed>
                    </div>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                    <div class="pane ${this.paneHoverState === 'voice' ? 'hovered-voice' : ''}" @mouseenter=${() => this.paneHoverState = 'voice'}>
                        <div class="pane-header">
                            <span class="header-title voice-title">🗣️ Voice Brain</span>
                            <div class="header-controls">
                                <button class="mic-btn ${this.isMicOn ? 'on' : 'off'}" @click=${this.handleToggleMic}>
                                    🎙️ MIC: ${this.isMicOn ? 'ON' : 'OFF'}
                                </button>
                                <span class="count-badge">${this.voiceChatHistory.length ? `${this.voiceChatIndex + 1}/${this.voiceChatHistory.length}` : '0/0'}</span>
                            </div>
                        </div>
                        <div class="chat-feed-wrapper" id="voice-feed-wrapper">
                            <chat-feed id="voice-feed" .content=${rightContent}></chat-feed>
                        </div>
                        ${this.optimizedReady ? html`<div class="sync-reminder">⚠️ PENDING: SYNC OPTIMIZED CODE</div>` : ''}
                    </div>
                    
                    <div class="pane ${this.paneHoverState === 'comp' ? 'hovered-comp' : ''}" @mouseenter=${() => this.paneHoverState = 'comp'}>
                        <div class="pane-header">
                            <span class="header-title" style="color: #00cc66;">🤝 Companion</span>
                        </div>
                        <div class="chat-feed-wrapper" id="comp-feed-wrapper">
                            <chat-feed id="comp-feed" .content=${compContent}></chat-feed>
                        </div>
                        ${this.optimizedReady ? html`<div class="sync-reminder">⚠️ PENDING: SYNC OPTIMIZED CODE</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('live-interview', LiveInterview);