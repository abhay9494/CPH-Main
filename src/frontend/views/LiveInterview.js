import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import '../components/ChatFeed.js';

export class LiveInterview extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; height: 100%; width: 100%; background: transparent; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; cursor: default !important; user-select: none; }
        
        .split-container { display: flex; width: 100%; height: 100%; background: transparent; position: relative; gap: 10px; padding-bottom: 10px; }
        
        .pane {
            flex: 1; border-radius: 8px; overflow-y: auto; padding: 15px 10px; 
            background: var(--bg-secondary); transition: border-color 0.2s;
            display: flex; flex-direction: column;
            border: 1px solid var(--border-color);
        }
        .pane.hovered-code { border-color: #4285f4; }
        .pane.hovered-voice { border-color: #a142f4; }
        
        .pane-header {
            position: sticky; top: -15px; background: var(--bg-tertiary); backdrop-filter: blur(5px); 
            padding: 8px 10px; margin: -15px -10px 10px -10px; border-bottom: 1px solid var(--border-color); 
            z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0;
        }

        .header-title { font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .code-title { color: #4285f4; }
        .voice-title { color: #a142f4; }

        .header-controls { display: flex; gap: 8px; align-items: center; }
        
        .status-badge { font-size: 11px; }
        .count-badge { font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }
        
        .mic-btn {
            padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; transition: 0.2s; cursor: pointer !important;
        }
        .mic-btn.on { background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); }
        .mic-btn.off { background: rgba(241, 76, 76, 0.15); color: #f14c4c; border: 1px solid rgba(241, 76, 76, 0.4); }

        .chat-feed-wrapper { flex: 1; overflow-y: auto; }
        
        /* Toast */
        .toast {
            position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66;
            padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold;
            opacity: 0; transition: opacity 0.3s; z-index: 1000; pointer-events: none; text-transform: uppercase;
        }
        .toast.visible { opacity: 1; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    `;

    static properties = {
        codeChatHistory: { type: Array },
        voiceChatHistory: { type: Array },
        codeChatIndex: { type: Number },
        voiceChatIndex: { type: Number },
        paneHoverState: { type: String },
        isMicOn: { type: Boolean },
        tacThinkMode: { type: Boolean },
        toastMessage: { type: String },
        activePage: { type: Number },
        prefs: { type: Object }
    };

    constructor() {
        super();
        this.codeChatHistory = [];
        this.voiceChatHistory = [];
        this.codeChatIndex = 0;
        this.voiceChatIndex = 0;
        this.paneHoverState = 'code';
        this.isMicOn = false;
        this.tacThinkMode = false;
        this.toastMessage = '';
        this.activePage = 1;
        this.prefs = {};
        this.trimTick = 0;
        
        // 🟢 NEW: Track Ghost State locally for the Stealth Edge
        this._isGhostHidden = false;
        this._isHoveringStealthDot = false;
        this.hoverTimer = null;
    }

    async connectedCallback() {
        super.connectedCallback();
        
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
            
            // 🟢 State Trackers for the Ghost Window
            this.ghostHiddenHandler = () => { this._isGhostHidden = true; };
            this.ghostVisibleHandler = () => { this._isGhostHidden = false; };
            ipcRenderer.on('app-made-hidden', this.ghostHiddenHandler);
            ipcRenderer.on('app-made-visible', this.ghostVisibleHandler);

            // 🟢 THE FIX: Emergency Edge Stealth Timer & Logic restored!
            this.hoverHandler = (_, zone) => {
                if (this.hoverTimer) {
                    clearInterval(this.hoverTimer);
                    this.hoverTimer = null;
                }

                const killDot = () => {
                    if (this._isHoveringStealthDot) {
                        if (window.require) window.require('electron').ipcRenderer.send('set-ghost-dot', false);
                        this._isHoveringStealthDot = false;
                    }
                };

                if (!zone || zone === 'none') {
                    killDot();
                    return;
                }

                const stealthEdge = this.prefs.interviewStealthEdge || 'none';
                if (zone !== stealthEdge || stealthEdge === 'none') {
                    killDot();
                    return; // Ignore all edges except the designated Stealth Edge
                }

                // Show the Red Dot if we are currently hidden
                if (this._isGhostHidden) {
                    if (!this._isHoveringStealthDot) {
                        if (window.require) window.require('electron').ipcRenderer.send('set-ghost-dot', true);
                        this._isHoveringStealthDot = true;
                    }
                } else {
                    killDot();
                }

                const bounds = this.prefs.hotCornerBounds || { hideTime: 0 };
                // Hide is instant (0ms), Unhide uses the delay slider
                let targetTimeMs = this._isGhostHidden ? ((bounds.hideTime || 0) * 1000) : 0;
                
                let progress = 0;
                if (targetTimeMs <= 0) {
                    this.executeHotCorner('hide_unhide');
                    return;
                }

                this.hoverTimer = setInterval(() => {
                    progress += (50 / targetTimeMs) * 100;
                    if (progress >= 100) {
                        clearInterval(this.hoverTimer);
                        this.hoverTimer = null;
                        this.executeHotCorner('hide_unhide');
                    }
                }, 50);
            };
            ipcRenderer.on('hot-corner-hover', this.hoverHandler);

            this.voiceNewHandler = (_, text) => {
                this.voiceChatHistory = [...this.voiceChatHistory, `🗣️ **Voice Input Detected**\n\n🤖 AI:\n${text}`];
                this.voiceChatIndex = this.voiceChatHistory.length - 1;
                this.requestUpdate();
                this.scrollToBottom('voice-feed');
            };
            
            this.voiceUpdateHandler = (_, text) => {
                if (this.voiceChatHistory.length > 0) {
                    const a = [...this.voiceChatHistory];
                    a[a.length - 1] = `🗣️ **Voice Input Detected**\n\n🤖 AI:\n${text}`;
                    this.voiceChatHistory = a;
                } else {
                    this.voiceChatHistory = [`🤖 AI:\n${text}`];
                    this.voiceChatIndex = 0;
                }
                this.requestUpdate();
                this.scrollToBottom('voice-feed');
            };

            this.codeNewHandler = (_, text) => {
                this.codeChatHistory = [...this.codeChatHistory, `📸 **Visual Input Detected**\n\n🤖 AI:\n${text}`];
                this.codeChatIndex = this.codeChatHistory.length - 1;
                this.requestUpdate();
                this.scrollToBottom('code-feed');
            };

            this.codeUpdateHandler = (_, text) => {
                if (this.codeChatHistory.length > 0) {
                    const a = [...this.codeChatHistory];
                    a[a.length - 1] = `📸 **Visual Input Detected**\n\n🤖 AI:\n${text}`;
                    this.codeChatHistory = a;
                } else {
                    this.codeChatHistory = [`🤖 AI:\n${text}`];
                    this.codeChatIndex = 0;
                }
                this.requestUpdate();
                this.scrollToBottom('code-feed');
            };

            this.micSyncHandler = (_, state) => {
                this.isMicOn = state;
                this.requestUpdate();
            };

            this.radialExecuteHandler = (_, sliceIndex) => {
                if (sliceIndex !== null) {
                    const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                    const activeMap = this.activePage === 2 ? (this.prefs.interviewCornersPage2 || {}) : (this.prefs.interviewCorners || {});
                    const action = activeMap[clockWiseGrid[sliceIndex]];
                    if (action && action !== 'none') this.executeHotCorner(action);
                }
            };

            this.radialContinuousHandler = (_, sliceIndex) => {
                const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                const activeMap = this.activePage === 2 ? (this.prefs.interviewCornersPage2 || {}) : (this.prefs.interviewCorners || {});
                const action = activeMap[clockWiseGrid[sliceIndex]];
                
                if (['scroll_up', 'scroll_down', 'text_inc', 'text_dec', 'bg_inc', 'bg_dec'].includes(action)) {
                    this.trimTick = (this.trimTick || 0) + 1;
                    if (this.trimTick >= 6) { 
                        this.executeHotCorner(action);
                        this.trimTick = 0;
                    }
                }
            };

            ipcRenderer.on('voice-new-message', this.voiceNewHandler);
            ipcRenderer.on('voice-update-message', this.voiceUpdateHandler);
            ipcRenderer.on('code-new-message', this.codeNewHandler);
            ipcRenderer.on('code-update-message', this.codeUpdateHandler);
            ipcRenderer.on('sync-mic-state', this.micSyncHandler);
            ipcRenderer.on('execute-radial-hud', this.radialExecuteHandler);
            ipcRenderer.on('radial-continuous-hold', this.radialContinuousHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('sync-preference', this.syncPrefHandler);
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
            ipcRenderer.removeListener('execute-radial-hud', this.radialExecuteHandler);
            ipcRenderer.removeListener('radial-continuous-hold', this.radialContinuousHandler);
        }
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
            'toggle_page2': '🔄 Page 1 / 2', 'regenerate': '🔄 Regen', 'abort_oa': '🚪 Abort'
        };
        return labels[action] || action || '—';
    }

    syncRadialToBackend() {
        if (!window.require) return;
        const defaultPage1 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'mic', right_mid_top: 'change_ai', middle_left: 'prev_resp', middle_right: 'next_resp', left_mid_bottom: 'fast_think', right_mid_bottom: 'change_profile', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };
        const defaultPage2 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'bg_inc', right_mid_top: 'text_inc', middle_left: 'reset', middle_right: 'language', left_mid_bottom: 'bg_dec', right_mid_bottom: 'text_dec', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };

        let activeMap = this.activePage === 2 ? (this.prefs?.interviewCornersPage2 || {}) : (this.prefs?.interviewCorners || {});
        
        if (Object.keys(activeMap).length === 0) {
            activeMap = this.activePage === 2 ? defaultPage2 : defaultPage1;
        }

        const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
        const labelsArray = clockWiseGrid.map(key => this.getHotCornerLabel(activeMap[key] || 'none'));
        window.require('electron').ipcRenderer.send('sync-radial-labels', labelsArray);
    }

    async executeHotCorner(action) {
        switch (action) {
            case 'capture': 
                this.showToast('📸 Screenshot Captured');
                if (window.require) window.require('electron').ipcRenderer.invoke('capture-screenshot');
                break;
            case 'send_ai': 
                this.showToast('🚀 Firing to AI');
                if (window.require) window.require('electron').ipcRenderer.invoke('send-oa-automation', this.prefs.selectedLanguage || 'Auto / Text');
                break;
            case 'fix_error': 
                this.showToast('🔧 Fixing Error...');
                if (window.require) window.require('electron').ipcRenderer.invoke('send-oa-fix-error');
                break;
            case 'regenerate':
                this.showToast('🔄 Regenerating...');
                if (window.require) window.require('electron').ipcRenderer.invoke('send-oa-regenerate');
                break;
            case 'hide_unhide': 
                this.showToast('👻 Toggled Stealth'); 
                if (window.require) window.require('electron').ipcRenderer.invoke('trigger-ghost-hide'); 
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
                this.tacThinkMode = !this.tacThinkMode; 
                this.showToast(this.tacThinkMode ? '🧠 THINK Mode ON' : '⚡ FAST Mode ON');
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode);
                }
                this.requestUpdate(); 
                break;
            case 'mic':
                this.handleToggleMic();
                break;
            case 'reset':
                this.showToast('✨ Session Reset');
                this.codeChatHistory = []; this.voiceChatHistory = [];
                this.codeChatIndex = 0; this.voiceChatIndex = 0;
                if (window.require) window.require('electron').ipcRenderer.invoke('new-chat');
                this.requestUpdate();
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
                let newTrans = (this.prefs.backgroundTransparency || 0.8) + (action === 'bg_inc' ? 0.05 : -0.05);
                newTrans = Math.max(0, Math.min(1, Math.round(newTrans * 100) / 100));
                this.showToast(action === 'bg_inc' ? '⬛ Opacity Increased' : '⬜ Opacity Decreased');
                if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                    window.cheatingDaddy.storage.updatePreference('backgroundTransparency', newTrans);
                    window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: newTrans } })); 
                }
                break;
            case 'abort_oa':
                this.showToast('🚪 Exiting...');
                if (window.require) {
                    window.require('electron').ipcRenderer.send('set-session-mode', 'main');
                    window.require('electron').ipcRenderer.send('toggle-radial-permanent', false);
                    // 🟢 FIX: Command the backend to disengage Ghost Mode BEFORE leaving!
                    window.require('electron').ipcRenderer.send('set-ignore-mouse-events', false);
                }
                window.dispatchEvent(new CustomEvent('return-to-main'));
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
                    if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
                }
            }
        }, 50);
    }

    showToast(msg) {
        this.toastMessage = msg;
        this.requestUpdate();
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toastMessage = ''; this.requestUpdate(); }, 2000);
    }

    async handleToggleMic() {
        this.showToast('🎙️ Toggling Mic...');
        if (window.require) {
            await window.require('electron').ipcRenderer.invoke('toggle-ai-mic', !this.isMicOn);
        }
    }

    render() {
        let leftContent = this.codeChatHistory.length > 0 ? this.codeChatHistory[this.codeChatIndex] : "🟢 **Code Engine Online**\nWaiting for captures...";
        let rightContent = this.voiceChatHistory.length > 0 ? this.voiceChatHistory[this.voiceChatIndex] : "🟢 **Voice Engine Online**\nListening to microphone feed...";

        return html`
            <div class="split-container">
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

                <div class="pane ${this.paneHoverState === 'voice' ? 'hovered-voice' : ''}" @mouseenter=${() => this.paneHoverState = 'voice'}>
                    <div class="pane-header">
                        <span class="header-title voice-title">🗣️ Voice Brain</span>
                        <div class="header-controls">
                            <button class="mic-btn ${this.isMicOn ? 'on' : 'off'}" @click=${this.handleToggleMic}>
                                🎙️ MIC: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                            <span class="status-badge" style="color: #00cc66;">⚡ Fast</span>
                            <span class="count-badge">${this.voiceChatHistory.length ? `${this.voiceChatIndex + 1}/${this.voiceChatHistory.length}` : '0/0'}</span>
                        </div>
                    </div>
                    <div class="chat-feed-wrapper" id="voice-feed-wrapper">
                        <chat-feed id="voice-feed" .content=${rightContent}></chat-feed>
                    </div>
                </div>

                <div class="toast ${this.toastMessage ? 'visible' : ''}">${this.toastMessage}</div>
            </div>
        `;
    }
}
customElements.define('live-interview', LiveInterview);