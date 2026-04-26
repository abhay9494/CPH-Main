import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        /* Universal Scrollbar Styling */
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #444); }
        /* 🟢 NUCLEAR CURSOR OVERRIDE (Anti-I-Beam) */
        input, textarea, 
        input:hover, textarea:hover, 
        input:focus, textarea:focus, 
        input:active, textarea:active {
            cursor: default !important;
        }
        :host { height: 100%; display: flex; flex-direction: column; }
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default !important; }
        .response-container { height: calc(100% - 50px); overflow-y: auto; font-size: var(--response-font-size, 16px); line-height: 1.6; background: transparent; padding: 12px; scroll-behavior: smooth; user-select: text; }
        .response-container * { user-select: text; }
        .response-container h1, .response-container h2, .response-container h3, .response-container h4, .response-container h5, .response-container h6 { margin: 1em 0 0.5em 0; color: var(--text-color); font-weight: 600; }
        .response-container p { margin: 0.6em 0; color: var(--text-color); }
        .response-container pre { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; padding: 12px; overflow-x: auto; margin: 0.8em 0; }
        .response-container::-webkit-scrollbar { width: 8px; }
        .response-container::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }

        /* 🟢 The Core Chat Container (Restores flex: 1 to push buttons to the bottom) */
        .markdown-body { flex: 1; width: 100%; padding: 20px; padding-top: 15px; font-size: var(--response-font-size, 15px); line-height: 1.6; color: #d4d4d4; overflow-y: auto; overflow-x: hidden; word-wrap: break-word; font-family: 'Inter', sans-serif; }
        
        /* 🐛 FIX: The image layout fix (Grid view) */
        /* The CSS markdown parser often injects <br> tags. We must hide them so they don't become empty grid items. */
        .markdown-body br { display: none; }

        /* 🟢 Target the PARAGRAPH containing the images, NOT the images themselves! */
        .markdown-body p:has(img) {
            display: grid;
            grid-template-columns: repeat(5, 1fr); /* 🐛 Forces exactly 5 columns per row */
            gap: 12px;
            margin-top: 15px;
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(0,0,0,0.15); /* Slightly darker bg to make images pop */
            border-radius: 6px;
        }

        /* Update image styles so they become perfect thumbnails */
        .markdown-body img {
            width: 100%;
            height: auto;
            border-radius: 6px;
            border: 1px solid var(--border-color, #444);
            cursor: pointer !important; /* Indicate they can be clicked to zoom */
            margin: 0;
            transition: 0.2s ease-in-out;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            object-fit: cover;
            aspect-ratio: 16/9; /* 🐛 Forces uniform thumbnail rectangles so the grid looks clean */
        }

        .markdown-body img:hover {
            opacity: 0.8;
            transform: scale(1.05);
        }

        /* 🟢 Image Expansion Modal */
        .image-modal {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            cursor: default !important;
            backdrop-filter: blur(5px);
        }

        .image-modal img {
            max-width: 100%;
            max-height: 100%;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            object-fit: contain;
            aspect-ratio: auto !important; /* 🐛 Overrides the 16/9 ratio so you can see the full image uncropped when zoomed */
            cursor: default !important;
        }
              
        .code-block-wrapper { background: var(--bg-secondary); border: 1px solid var(--border-color, #333); border-radius: 6px; margin-bottom: 15px; overflow: hidden; position: relative; }
        .code-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 5px 10px; border-bottom: 1px solid var(--border-color, #333); }
        .lang-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: bold; }
        .copy-code-btn, .type-code-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 3px 8px; border-radius: 4px; font-size: 11px; transition: 0.2s; margin-left: 5px; }
        .copy-code-btn:hover, .type-code-btn:hover { background: var(--bg-hover); color: #fff; }
        .code-block-wrapper pre { margin: 0; padding: 15px; overflow-x: hidden; white-space: pre-wrap; word-wrap: break-word; }
        .code-block-wrapper pre code { background: transparent; padding: 0; border-radius: 0; white-space: pre-wrap; }
        
        .bottom-controls { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: transparent; border-top: 1px solid var(--border-color, #444); }
        .control-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }

        .action-btn { background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: 0.2s; white-space: nowrap; }
        .action-btn:hover { background: var(--bg-hover); color: #fff; }
        .action-btn.primary { background: var(--bg-tertiary); color: white; border-color: var(--border-color, #555); }
        .action-btn.highlight { background: rgba(161, 66, 244, calc(var(--bg-alpha, 1) * 0.2)); color: #a142f4; border-color: rgba(161, 66, 244, var(--bg-alpha, 1)); }
        .action-btn.success { background: rgba(0, 204, 102, calc(var(--bg-alpha, 1) * 0.2)); color: #00cc66; border-color: rgba(0, 204, 102, var(--bg-alpha, 1)); }
        .action-btn.danger { background: rgba(255, 68, 68, calc(var(--bg-alpha, 1) * 0.2)); color: #ff4444; border-color: rgba(255, 68, 68, var(--bg-alpha, 1)); }

        input.prompt-input, textarea.prompt-input { flex: 1; background: var(--input-background); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 8px 12px; border-radius: 4px; font-size: 13px; font-family: 'Inter', sans-serif; }

        .custom-dropdown { position: relative; display: inline-block; }
        .dropdown-trigger { background: var(--bg-secondary); color: var(--text-color); border: 1px solid var(--border-color, #444); padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap; height: 32px; box-sizing: border-box; }
        .dropdown-trigger:hover { background: var(--bg-hover); color: #fff; }
        .dropdown-menu { position: absolute; bottom: 100%; left: 0; background: var(--bg-primary); border: 1px solid var(--border-color, #444); border-radius: 4px; margin-bottom: 4px; min-width: 100%; z-index: 1000; display: flex; flex-direction: column; box-shadow: 0 -4px 15px rgba(0,0,0,0.8); max-height: 200px; overflow-y: auto; }
        .dropdown-option { padding: 8px 12px; font-size: 12px; color: var(--text-color); white-space: nowrap; }
        .dropdown-option:hover { background: var(--bg-hover); color: #fff; }
        .dropdown-option.selected { background: #4285f4; color: #fff; font-weight: bold; }
        .dropdown-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; }
        
        .nav-button { background: transparent; color: var(--text-secondary); border: none; padding: 6px; border-radius: 3px; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.1s ease; }
        .nav-button:hover { background: var(--hover-background); color: var(--text-color); }
        .nav-button:disabled { opacity: 0.3; }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        
        .format-toggles { display: flex; gap: 12px; align-items: center; justify-content: center; width: 100%; }
        .format-toggles label { font-size: 10px; color: var(--text-color); display: flex; align-items: center; gap: 4px; cursor: default !important; white-space: nowrap; font-weight: bold; }
        .format-toggles input[type="checkbox"] { width: 12px; height: 12px; margin: 0; cursor: default !important; accent-color: #a142f4; }

        /* 🟢 GHOST TOAST NOTIFICATION */
        .ghost-toast {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: rgba(0, 204, 102, 0.15);
            color: #00cc66;
            border: 1px solid #00cc66;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
            pointer-events: none;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ghost-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #333); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #444); }

        .action-btn:disabled { opacity: 0.3; pointer-events: none; filter: grayscale(100%); }
        .dropdown-trigger.disabled { opacity: 0.3; pointer-events: none; filter: grayscale(100%); }
    `;

    static properties = {
        t: { type: Number },
        localChatHistory: { type: Array }, 
        localChatIndex: { type: Number },
        capturedCount: { type: Number },
        currentProviderName: { type: String },
        isAiVisible: { type: Boolean },
        isSolving: { type: Boolean },
        isMicOn: { type: Boolean },
        lastUserPrompt: { type: String },
        tacThinkMode: { type: Boolean },
        tacBrief: { type: Boolean },
        tacBullets: { type: Boolean },
        tacStar: { type: Boolean },
        tacConversational: { type: Boolean },
        programmingLanguage: { type: String },
        customLanguage: { type: String },
        aiProfiles: { type: Array },
        currentProfileId: { type: String },
        hasResumeContext: { type: Boolean },
        activeDropdown: { type: String },
        fontSize: { type: Number },
        typerDelay: { type: Number },        
        viewMode: { type: String }, 
        wpmSpeed: { type: Number },
        typingState: { type: String }, 
        typingCountdown: { type: Number },
        typerCodeLines: { type: Array },
        typerStartLine: { type: Number },
        typerEndLine: { type: Number },
        typingCurrentLineIndex: { type: Number },
        isHelpingMode: { type: Boolean },
        helperPinInput: { type: String },
        helperStatus: { type: String },
        handshakeName: { type: String },
        autoSyncMode: { type: Boolean },
        currentMode: { type: String },
        hasReceivedCompanionProfile: { type: Boolean },
        currentSessionId: { type: String },
        modalImage: { type: String },
        hotCornersMap: { type: Object },
        ghostToastMessage: { type: String },
        hoverZone: { type: String },
        hoverProgress: { type: Number },
        hotCornerBounds: { type: Object },
        bgTransparency: { type: Number },
        resetArmed: { type: Boolean },
        typerMistakes: { type: Number },
        hotCornersPage2Map: { type: Object }, 
        activePage: { type: Number },
        radialMap: { type: Object },
        radialActive: { type: Boolean },
        radialX: { type: Number },
        radialY: { type: Number },
        radialSlice: { type: Number },
        interviewStealthEdge: { type: String },
        codeChatHistory: { type: Array },
        voiceChatHistory: { type: Array },
        codeChatIndex: { type: Number },
        voiceChatIndex: { type: Number },
        paneHoverState: { type: String },
        voiceTranscript: { type: String }, // 🆕 Feature 6.5: Live interviewer transcription
        lastCodeSyncedText: { type: String } // 🆕 Phase 3: Track last synced code to avoid re-sending
    };

    constructor() {
        super();
        this.localChatHistory = []; this.localChatIndex = -1;
        this.capturedCount = 0;
        this.currentProviderName = 'ChatGPT'; 
        this.isAiVisible = false;
        this._isGhostHidden = false;
        this._isCurrentlyGhosting = false;
        this.isSolving = false;
        this.isMicOn = false;
        this.lastUserPrompt = "🎙️ Ready for Input...";
        this.tacThinkMode = false;
        this.tacBrief = true;
        this.tacBullets = false;
        this.tacStar = false;
        this.tacConversational = true;
        this.programmingLanguage = 'C++';
        this.customLanguage = '';
        this.hasResumeContext = false;
        this.activeDropdown = null;
        this.aiProfiles = [];
        this.fontSize = 13;
        this.typerDelay = 5;
        this.viewMode = 'chat';
        this.wpmSpeed = 60;
        this.typingState = 'idle';
        this.typingCountdown = 0;
        this.typerCodeLines = [];
        this.typerStartLine = 0;
        this.typerEndLine = 0;
        this.typingCurrentLineIndex = 0;
        this.isHelpingMode = false;
        this.helperPinInput = "";
        this.helperStatus = 'idle'; // idle, connecting, connected
        this.helperConn = null;
        this.handshakeName = null;
        this.pingInterval = null;
        this.missedPongs = 0;
        this.autoSyncMode = false; // Default to Draft Mode (Vetting ON)
        this.hasReceivedCompanionProfile = false;
        this.currentSessionId = Date.now().toString();
        this.modalImage = null;
        this.hoverZone = null;
        this.hoverProgress = 0;
        this.resetArmed = false;
        this.resetArmTimer = null;
        this.hotCornersMap = {};
        this.typerHotCornersMap = {};
        this.activePage = 1;
        this.hotCornersPage2Map = {};
        this.radialMap = {};
        this.radialActive = false;
        this.radialX = null;
        this.radialY = null;
        this.radialSlice = null;
        this.interviewStealthEdge = 'none';
        this.codeChatHistory = [];
        this.voiceChatHistory = [];
        this.codeChatIndex = 0;
        this.voiceChatIndex = 0;
        this.paneHoverState = 'code';
        this.voiceTranscript = ''; // 🆕 Feature 6.5
        this.lastCodeSyncedText = ''; // 🆕 Phase 3
        this.activePage = 1; // 🐛 BUG 2 FIX: Always start on page 1
    }

    showToast(msg) {
        this.ghostToastMessage = msg;
        this.requestUpdate();
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.ghostToastMessage = '';
            this.requestUpdate();
        }, 2000);
    }

    syncPreferences(e) {
        if (e.detail && e.detail.key === 'hotCorners') {
            this.hotCornersMap = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'hotCornersPage2') { 
            this.hotCornersPage2Map = e.detail.value; 
            this.requestUpdate(); 
        }
        if (e.detail && e.detail.key === 'typerHotCorners') {
            this.typerHotCornersMap = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'hotCornerBounds') {
            this.hotCornerBounds = e.detail.value;
            this.requestUpdate();
        }
        // 🟢 FIX: Keep local memory perfectly in sync with the side-sliders!
        if (e.detail && e.detail.key === 'fontSize') {
            this.fontSize = e.detail.value;
            this.style.setProperty('--response-font-size', `${this.fontSize}px`);
        }
        if (e.detail && e.detail.key === 'backgroundTransparency') {
            this.bgTransparency = e.detail.value;
        }
        if (e.detail && e.detail.key === 'typerDelay') {
            this.typerDelay = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'wpmSpeed') {
            this.wpmSpeed = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'typerMistakes') { 
            this.typerMistakes = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'typerSelectionSpeed') { // 🟢 Sync the new slider
            this.typerSelectionSpeed = e.detail.value;
            this.requestUpdate();
        }
        if (e.detail && e.detail.key === 'interviewStealthEdge') {
            this.interviewStealthEdge = e.detail.value;
            this.requestUpdate();
        }
    }

    navigateToPreviousResponse() {
        if (this.localChatIndex > 0) { this.localChatIndex--; this.requestUpdate(); }
    }
    navigateToNextResponse() {
        if (this.localChatIndex < this.localChatHistory.length - 1) { this.localChatIndex++; this.requestUpdate(); }
    }
    changeFontSize(delta) {
        this.fontSize = Math.max(12, Math.min(32, this.fontSize + delta));
        this.style.setProperty('--response-font-size', `${this.fontSize}px`);
        // 🟢 FIX: Ensure manual button clicks also update the universal sliders!
        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            window.cheatingDaddy.storage.updatePreference('fontSize', this.fontSize);
            window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'fontSize', value: this.fontSize } }));
        }
    }

    // 🟢 FIX: 4-Second Silence Tracker + Hardware Ping!
    markAiActive() {
        this.isSolving = true;
        if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
        
        this.solvingTimeout = setTimeout(() => {
            this.isSolving = false;
            // 🎯 The AI has been silent for 4 seconds. The payload is ready. FIRE THE PING!
            if (window.require) {
                window.require('electron').ipcRenderer.send('ai-generation-complete');
                
                // 🆕 Phase 3: Code→Voice Brain Sync (Silent Context Injection)
                if (this.currentMode === 'proctored_live_interview' && this.codeChatHistory.length > 0) {
                    const latestCode = this.codeChatHistory[this.codeChatHistory.length - 1];
                    if (latestCode && latestCode !== this.lastCodeSyncedText && latestCode.length > 50) {
                        this.lastCodeSyncedText = latestCode;
                        window.require('electron').ipcRenderer.invoke('sync-code-to-voice', String(latestCode)).catch(() => {});
                    }
                }
            }
            this.requestUpdate();
        }, 4000); 
        
        this.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();

        // 🟢 FIX: Catch the quit warning and beam the disconnect signal
        this.appQuittingHandler = () => {
            if (this.helperConn && this.helperConn.open) {
                this.helperConn.send(JSON.stringify({ type: 'disconnect' }));
            }
        };
        window.addEventListener('app-quitting', this.appQuittingHandler);
        window.addEventListener('sync-preference', (e) => this.syncPreferences(e));
        window.addEventListener('focus', () => this.requestUpdate());
        
        // 🟢 NEW: IPC RADIAL LISTENERS (Bypasses OS Focus Restrictions)
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('hide-radial-hud', () => {
                this.radialActive = false;
                this.radialSlice = null;
                this.requestUpdate();
            });

            ipcRenderer.on('execute-radial-hud', (event, sliceIndex) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                if (sliceIndex !== null) {
                    // Map the clockwise index back to the grid key!
                    const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                    const activeMap = this.activePage === 2 ? this.interviewCornersPage2Map : this.interviewCornersMap;
                    const action = activeMap[clockWiseGrid[sliceIndex]];
                    if (action && action !== 'none') this.executeHotCorner(action);
                }
            });

            // 🟢 NEW: CONTINUOUS RADIAL SCROLLING/RESIZING
            ipcRenderer.on('radial-continuous-hold', (event, sliceIndex) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
                const activeMap = this.activePage === 2 ? this.interviewCornersPage2Map : this.interviewCornersMap;
                const action = activeMap[clockWiseGrid[sliceIndex]];
                
                if (['scroll_up', 'scroll_down', 'text_inc', 'text_dec', 'bg_inc', 'bg_dec'].includes(action)) {
                    this.executeHotCorner(action);
                }
            });

            // 🟢 NEW: DUAL-BRAIN TEXT STREAMS
            ipcRenderer.on('voice-new-message', (event, text) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                this.markAiActive();
                this.voiceChatHistory = [...this.voiceChatHistory, text];
                this.voiceChatIndex = this.voiceChatHistory.length - 1;
                this.requestUpdate();
            });

            ipcRenderer.on('voice-update-message', (event, text) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                this.markAiActive();
                if (this.voiceChatHistory.length > 0) {
                    const a = [...this.voiceChatHistory];
                    a[a.length - 1] = text;
                    this.voiceChatHistory = a;
                } else {
                    this.voiceChatHistory = [text];
                    this.voiceChatIndex = 0;
                }
                this.requestUpdate();
            });

            ipcRenderer.on('code-new-message', (event, text) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                this.markAiActive();
                this.codeChatHistory = [...this.codeChatHistory, text];
                this.codeChatIndex = this.codeChatHistory.length - 1;
                this.requestUpdate();
            });

            ipcRenderer.on('code-update-message', (event, text) => {
                if (this.currentMode !== 'proctored_live_interview') return;
                this.markAiActive();
                if (this.codeChatHistory.length > 0) {
                    const a = [...this.codeChatHistory];
                    a[a.length - 1] = text;
                    this.codeChatHistory = a;
                } else {
                    this.codeChatHistory = [text];
                    this.codeChatIndex = 0;
                }
                this.requestUpdate();
            });

            // 🆕 Feature 6.5: Live Interviewer Transcription
            ipcRenderer.on('voice-transcription-update', (event, transcript) => {
                if (typeof transcript === 'string' && transcript.length > 0) {
                    this.voiceTranscript = transcript;
                    this.requestUpdate();
                }
            });

            // 🆕 Feature 5: Ctrl+Scroll — temporarily capture wheel events for overlay scrolling
            this._ctrlHeld = false;
            ipcRenderer.on('ctrl-mouse-position', (event, pos) => {
                if (this.currentMode !== 'proctored_live_interview' && this.currentMode !== 'proctored_oa') return;
                // While Ctrl is held, temporarily disable ghost mode so we capture wheel events
                if (!this._ctrlHeld) {
                    this._ctrlHeld = true;
                    // Temporarily un-ghost for wheel capture
                    if (this._isCurrentlyGhosting) {
                        this._wasGhostBeforeCtrl = true;
                        this.setGhostMode(false);
                    }
                }
                // Track which pane the cursor is over
                const screenMid = window.screen.width / 2;
                this.paneHoverState = pos.x < screenMid ? 'code' : 'voice';
            });

            // When Ctrl releases, restore ghost mode
            this._ctrlReleaseHandler = () => {
                if (this._ctrlHeld) {
                    this._ctrlHeld = false;
                    if (this._wasGhostBeforeCtrl) {
                        this._wasGhostBeforeCtrl = false;
                        setTimeout(() => this.setGhostMode(true), 100);
                    }
                }
            };
            // Listen for the radial CTRL_UP (it fires execute-radial-hud which means ctrl released)
            // We can piggyback on the existing ghost-state-changed or add a dedicated one
        }

        // 🆕 Feature 5: Wheel event handler for overlay scrolling
        this._wheelHandler = (e) => {
            if (!this._ctrlHeld) return; // Only intercept when Ctrl is held
            e.preventDefault();
            e.stopPropagation();
            
            const targetPaneId = this.paneHoverState === 'voice' ? 'chat-pane' : 'code-pane';
            const pane = this.shadowRoot.querySelector(`#${targetPaneId}`);
            if (pane) {
                pane.scrollBy({ top: e.deltaY > 0 ? 80 : -80, behavior: 'smooth' });
            }
        };
        // Attach to shadow root to capture wheel events inside the component
        this.addEventListener('wheel', this._wheelHandler, { passive: false });

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            ipcRenderer.on('sync-mic-state', (event, isListening) => {
                if (this.isMicOn !== isListening) { this.isMicOn = isListening; this.requestUpdate(); }
            });

            if (this.currentMode !== 'proctored_oa' && this.currentMode !== 'proctored_live_interview') {
                ipcRenderer.invoke('show-widget').then(() => this.syncWidgetState());
            } else {
                ipcRenderer.invoke('hide-widget');
            }

            window.cheatingDaddy.storage.getPreferences().then(async raw => {
                const prefs = raw?.data || raw || {}; 
                this.aiProfiles = prefs.aiProfiles || [];
                this.currentProfileId = prefs.lastProfileId || (this.aiProfiles.length > 0 ? this.aiProfiles[0].id : null);
                this.hasResumeContext = !!(prefs.customPrompt && prefs.customPrompt.trim().length > 0);
                this.hotCornerBounds = prefs.hotCornerBounds || { cornerSize: 20, centerX: 20, centerY: 20, dwellTime: 3, hideTime: 0 };
                
                // 🟢 Safely load starting values into fast local memory!
                this.fontSize = prefs.fontSize ?? 13;
                this.bgTransparency = prefs.backgroundTransparency ?? 0.8;
                this.wpmSpeed = prefs.wpmSpeed || 60;
                this.typerDelay = prefs.typerDelay ?? 5;
                this.typerMistakes = prefs.typerMistakes ?? 2;
                this.typerSelectionSpeed = prefs.typerSelectionSpeed ?? 0.5; // 🟢 Load the new setting
                this.style.setProperty('--response-font-size', `${this.fontSize}px`);
                
                // 🟢 LOAD THE DUAL BRAINS
                this.hotCornersPage2Map = prefs.hotCornersPage2 || {}; 
                this.interviewCornersMap = prefs.interviewCorners || {};
                this.interviewCornersPage2Map = prefs.interviewCornersPage2 || {};
                this.radialMap = prefs.radialCorners || {
                    N: 'none', NNE: 'none', NE: 'hide_unhide', ENE: 'none',
                    E: 'next_resp', ESE: 'none', SE: 'fix_error', SSE: 'none',
                    S: 'scroll_down', SSW: 'none', SW: 'send_ai', WSW: 'none',
                    W: 'prev_resp', WNW: 'none', NW: 'capture', NNW: 'none'
                };
                this.hotCornersMap = prefs.hotCorners || {
                    top_left: 'capture', bottom_left: 'send_ai', 
                    top_right: 'hide_unhide', bottom_right: 'change_profile',
                    top_center: 'change_ai', bottom_center: 'fast_think',
                    middle_left: 'scroll_up', middle_right: 'scroll_down' 
                };

                this.interviewStealthEdge = prefs.interviewStealthEdge || 'none';
                
                this.typerHotCornersMap = prefs.typerHotCorners || {
                    top_left: 'trim_top', top_center: 'auto_type', top_right: 'hide_unhide',
                    middle_left: 'scroll_up', middle_right: 'scroll_down',
                    bottom_left: 'trim_bottom', bottom_center: 'abort_typer', bottom_right: 'none'
                }; // 🟢 NEW: Load the Typer Brain

                // 🟢 DEFAULT GHOST BOOT: Instantly turn on Click-Through if in OA mode!
                if (this.currentMode === 'proctored_oa') {
                    this.setGhostMode(true);
                }

                if (this.currentProfileId) {
                    await ipcRenderer.invoke('switch-ai-profile', this.currentProfileId);
                    
                    // 🟢 SMART AUTO-START VOICE BRAIN (Truth Driven)
                    if (this.currentMode === 'proctored_live_interview') {
                        let attempts = 0;
                        const tryMic = setInterval(async () => {
                            attempts++;
                            // Only stop when the background spy confirms the mic is actually ON, or we hit 20 attempts
                            if (this.isMicOn || attempts > 20) { 
                                clearInterval(tryMic);
                                if (this.isMicOn) this.showToast('🎙️ Voice Brain Auto-Started');
                                return;
                            }
                            // Ask backend to click the button. The spy will handle updating this.isMicOn automatically.
                            if (window.require) await window.require('electron').ipcRenderer.invoke('toggle-ai-mic', true);
                        }, 1500); // Try every 1.5 seconds to give the DOM time to react
                    }
                }
                if (prefs.tacThinkMode !== undefined) {
                    this.tacThinkMode = prefs.tacThinkMode;
                    ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', false);
                }
                if (prefs.lastAiEngine !== undefined) this.handleSetEngine(prefs.lastAiEngine, true);
                else this.handleSetEngine(0, true); 

                if (this.currentMode === 'interview' || this.currentMode === 'companion') {
                    this.programmingLanguage = 'Auto / Text';
                } else if (prefs.programmingLanguage) {
                    this.programmingLanguage = prefs.programmingLanguage;
                } else {
                    this.programmingLanguage = 'C++';
                }
                this.requestUpdate();
            });
            
            this.widgetListener = (event, action) => {
                if (action === 'capture') this.handleCaptureScreenshot();
                if (action === 'clear') this.handleClearScreenshots();
                if (action === 'send') this.handleSendToAI();
            };
            ipcRenderer.on('execute-widget-action', this.widgetListener);

            ipcRenderer.invoke('check-active-ai').then(aiInfo => {
                if (aiInfo && aiInfo.name) { this.currentProviderName = aiInfo.name; this.requestUpdate(); }
            });

            this.handlePreviousResponse = () => this.navigateToPreviousResponse();
            this.handleNextResponse = () => this.navigateToNextResponse();
            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);

            ipcRenderer.on('ai-window-hidden', () => {
                this.isAiVisible = false;
                this.lastHiddenTime = Date.now(); 
                this.requestUpdate();
            });

            ipcRenderer.on('app-made-hidden', () => {
                this._isGhostHidden = true;
            });
            this.handleAppMadeVisible = () => {
                this._isGhostHidden = false;
                if (this.currentMode !== 'proctored_oa' && this.currentMode !== 'proctored_live_interview') {
                    ipcRenderer.invoke('show-widget').then(() => this.syncWidgetState());
                }
                const container = this.shadowRoot.querySelector('.markdown-body');
                if (container) {
                    container.style.opacity = '0.99';
                    setTimeout(() => { container.style.opacity = '1'; }, 20);
                }
                this.requestUpdate();
            };
            ipcRenderer.on('app-made-visible', this.handleAppMadeVisible);

            // 🟢 LIVE HIGHLIGHTER LISTENER
            ipcRenderer.on('typing-progress', (event, lineIdx) => {
                this.typingCurrentLineIndex = lineIdx;
                this.requestUpdate();
                setTimeout(() => {
                    const container = this.shadowRoot.querySelector('.typer-code-container');
                    const lineEl = this.shadowRoot.querySelector('#typer-line-' + (this.typerStartLine + lineIdx));
                    if (container && lineEl) {
                        const offset = lineEl.offsetTop - container.offsetTop - (container.clientHeight / 2) + 20;
                        container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
                    }
                }, 50);
            });

            ipcRenderer.on('typing-status', (event, status) => {
                if (!status) {
                    // 🟢 AUTO-CLOSE & UNLOCK: If it finished typing all lines!
                    if (this.typingState === 'typing' && this.typingCurrentLineIndex >= (this.typerEndLine - this.typerStartLine)) {
                        this.viewMode = 'chat';
                        window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: false }));
                        this.showToast('✅ Typing Complete');
                        
                        // 🟢 THE FIX: Wipe the memory lines clean so it doesn't corrupt a retry of the same payload!
                        this.typerStartLine = 0;
                        this.typerEndLine = this.typerCodeLines.length - 1;
                        this.typingCurrentLineIndex = 0;

                        if (window.require && this.currentMode !== 'proctored_oa' && this.currentMode !== 'proctored_live_interview') {
                            window.require('electron').ipcRenderer.invoke('show-widget');
                        }
                    } else if (this.typingState === 'typing') {
                        this.showToast('⏸️ Auto-Typer Paused');
                    }
                    this.typingState = 'idle';
                    this.requestUpdate();
                }
            });

            // 🟢 Allow AppHeader to cancel the Typer View 
            this.cancelTyperHandler = () => {
                if (this.typingState === 'idle') {
                    this.viewMode = 'chat';
                    window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: false }));
                    
                    // 🐛 FIX: Only restore the widget if we are NOT in a proctored exam!
                    if (window.require && this.currentMode !== 'proctored_oa' && this.currentMode !== 'proctored_live_interview') {
                        window.require('electron').ipcRenderer.invoke('show-widget');
                    }
                    this.requestUpdate();
                }
            };
            window.addEventListener('cancel-typer-mode', this.cancelTyperHandler);

            this.helpModeHandler = (e) => {
                this.isHelpingMode = e.detail;
                if (!e.detail) {
                    if (this.helperConn) this.helperConn.close();
                    this.cleanupHelperConnection();
                }
                this.requestUpdate();
            };
            window.addEventListener('help-mode-toggled', this.helpModeHandler);

            this.syncTypingState = (e) => {
                if (e.detail.state === 'idle' && this.typingState === 'countdown') clearTimeout(this.typeTimer);
                this.typingState = e.detail.state;
                this.requestUpdate();
            };
            window.addEventListener('typing-state-changed', this.syncTypingState);

            ipcRenderer.on('ai-new-message', (event, text) => {
                this.markAiActive(); // 🟢 FIX: Keep the lockout alive while streaming!
                if (this.localChatHistory.length > 0) {
                    const currentContent = this.localChatHistory[this.localChatHistory.length - 1];
                    if (currentContent.includes('🤖 AI: (Thinking...)') || currentContent.includes('🤖 AI: (Solving...)')) {
                        const newArray = [...this.localChatHistory];
                        newArray[newArray.length - 1] = `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`;
                        this.localChatHistory = newArray;
                    } else {
                        this.lastUserPrompt = "🎙️ Voice/Scraped Interaction";
                        this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`];
                        this.localChatIndex = this.localChatHistory.length - 1;
                    }
                } else {
                    this.localChatHistory = [`${this.lastUserPrompt}\n\n🤖 AI:\n${text}`];
                    this.localChatIndex = 0;
                }
                
                this.requestUpdate(); 
                this.saveCurrentSession();
                if (this.localChatHistory.length > 0 && this.autoSyncMode) {
                    this.transmitCleanPayload(this.localChatHistory[this.localChatHistory.length - 1]);
                }
            });

            ipcRenderer.on('ai-update-message', (event, text) => {
                this.markAiActive(); // 🟢 FIX: Keep the lockout alive while streaming!
                if (this.localChatHistory.length > 0) {
                    const a = [...this.localChatHistory];
                    a[a.length - 1] = `${this.lastUserPrompt}\n\n🤖 AI:\n${text}`;
                    this.localChatHistory = a;
                    
                    this.requestUpdate();
                    this.saveCurrentSession();
                    if (this.autoSyncMode) {
                        this.transmitCleanPayload(this.localChatHistory[this.localChatHistory.length - 1]);
                    }
                }
            });

            // 🎯 V2: DYNAMIC HOVER ROUTER (Custom Timers & Execution)
            ipcRenderer.on('hot-corner-hover', async (event, zone) => {
                if (this.currentMode !== 'proctored_oa' && this.currentMode !== 'proctored_live_interview') return;
            
                if (this.hoverTimer) {
                    clearInterval(this.hoverTimer);
                    this.hoverTimer = null;
                }
            
                // 🟢 PROXIMITY KILLER: Safely destroy the dot if the mouse leaves the zone
                const killDot = () => {
                    if (this._isHoveringStealthDot) {
                        if (window.require) window.require('electron').ipcRenderer.send('set-ghost-dot', false);
                        this._isHoveringStealthDot = false;
                    }
                };
            
                if (!zone || zone === 'none') {
                    killDot();
                    this.hoverZone = null;
                    this.hoverProgress = 0;
                    this.requestUpdate();
                    return;
                }
            
                this.hoverZone = zone;
                this.hoverProgress = 0;
                this.trimTick = 0; // Reset continuous hold
                this.requestUpdate();
            
                let action = 'none';
            
                if (this.currentMode === 'proctored_live_interview') {
                    const stealthEdge = this.interviewStealthEdge || 'none';
                    if (zone === stealthEdge && stealthEdge !== 'none') {
                        action = 'hide_unhide';
                    } else {
                        killDot();
                        return; // 🟢 Strict Filter: Ignore all other screen edges completely!
                    }
                } else {
                    // Normal OA Routing
                    let activeMap = this.hotCornersMap || {};
                    if (this.viewMode === 'typer') activeMap = this.typerHotCornersMap || {};
                    else if (this.activePage === 2) activeMap = this.hotCornersPage2Map || {};
                    action = activeMap[zone];
                }
            
                if (!action || action === 'none') {
                    killDot();
                    return;
                }
            
                // 🟢 PROXIMITY ACTIVATOR: Show dot ONLY if app is hidden and we are hovering the unhide edge!
                if (action === 'hide_unhide' && this._isGhostHidden) {
                    if (!this._isHoveringStealthDot) {
                        if (window.require) window.require('electron').ipcRenderer.send('set-ghost-dot', true);
                        this._isHoveringStealthDot = true;
                    }
                } else {
                    killDot();
                }
            
                // 🟢 NEW: Allow auto_type to punch through the hidden window so you can pause invisibly!
                if (this._isGhostHidden && action !== 'hide_unhide' && action !== 'auto_type') return;
            
                const lockedActions = ['change_ai', 'change_profile', 'refactor', 'send_ai', 'fast_think', 'language', 'fix_error', 'mic'];
                if (this.isSolving && lockedActions.includes(action)) {
                    this.showToast('⏳ AI is busy...');
                    return;
                }
            
                const bounds = this.hotCornerBounds || { dwellTime: 3, hideTime: 0 };
                let targetTimeMs = (bounds.dwellTime || 3) * 1000;
            
                if (action === 'hide_unhide') targetTimeMs = this._isGhostHidden ? ((bounds.hideTime || 0) * 1000) : 0;
                else if (action === 'auto_type') {
                    // 🟢 FIX: Ignore hover completely if it is counting down so it doesn't instantly cancel!
                    if (this.typingState === 'countdown') return;
                    // 🟢 FIX: Only trigger the 0-second instant pause if it is actively typing.
                    if (this.typingState === 'typing') targetTimeMs = 0;
                }
            
                if (targetTimeMs === 0) {
                    this.hoverProgress = 100;
                    this.executeHotCorner(action);
                    return;
                }
            
                this.hoverTimer = setInterval(() => {
                    this.hoverProgress += (50 / targetTimeMs) * 100;
                    this.requestUpdate();
                
                    if (this.hoverProgress >= 100) {
                        // 🟢 EXPANDED CONTINUOUS HOLD LOGIC
                        const continuousActions = ['trim_top', 'trim_bottom', 'expand_top', 'expand_bottom', 'scroll_up', 'scroll_down', 'text_inc', 'text_dec', 'bg_inc', 'bg_dec'];
                        
                        if (continuousActions.includes(action)) {
                            this.hoverProgress = 100;
                            this.trimTick++;
                            
                            let ticksReq = 6; 
                            if (['trim_top', 'trim_bottom', 'expand_top', 'expand_bottom'].includes(action)) {
                                ticksReq = Math.max(1, Math.round((this.typerSelectionSpeed || 0.5) * 1000 / 50));
                            }
                        
                            if (this.trimTick >= ticksReq) {
                                this.executeHotCorner(action);
                                this.trimTick = 0;
                            }
                        } else {
                            clearInterval(this.hoverTimer);
                            this.hoverTimer = null;
                            this.executeHotCorner(action);
                        }
                    }
                }, 50);
            });
        } // <-- End of if (window.require)

        if (window.cheatingDaddy) {
            window.cheatingDaddy.handleShortcut = (key) => {
                if (key === 'ctrl+enter' || key === 'cmd+enter') this.handleCaptureScreenshot();
            };
        }
        this.brainSyncInterval = setInterval(() => {
            this.syncBrainModeWithBrowser();
        }, 3000);
        
        // 🟢 FIX: Sync the labels immediately when the app boots up!
        this.syncRadialToBackend();
    }

    // 🟢 FIX: Strictly enforce Widget visibility
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('currentMode')) {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                
                // 🟢 STRICT LOCK: Deadlock the widget for BOTH proctored modes
                const isProctored = this.currentMode === 'proctored_oa' || this.currentMode === 'proctored_live_interview';
                ipcRenderer.send('set-oa-mode', isProctored);

                if (isProctored) {
                    ipcRenderer.invoke('hide-widget');
                } else {
                    ipcRenderer.invoke('show-widget').then(() => this.syncWidgetState());
                }
            }
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.brainSyncInterval) clearInterval(this.brainSyncInterval);
        window.removeEventListener('cancel-typer-mode', this.cancelTyperHandler);
        window.removeEventListener('typing-state-changed', this.syncTypingState);
        window.removeEventListener('help-mode-toggled', this.helpModeHandler);
        window.removeEventListener('app-quitting', this.appQuittingHandler);
        window.removeEventListener('sync-preference', (e) => this.syncPreferences(e));
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.removeAllListeners('ai-new-message');
            ipcRenderer.removeAllListeners('ai-update-message');
            ipcRenderer.removeAllListeners('typing-status');
            ipcRenderer.removeAllListeners('typing-progress');
            ipcRenderer.removeListener('execute-widget-action', this.widgetListener);
        }
    }

    async executeHotCorner(action) {
        // 🚨 LOCKOUT LOGIC: Prevent state corruption while AI is scraping/solving
        const lockedActions = ['change_ai', 'change_profile', 'refactor', 'send_ai', 'fast_think', 'fix_error', 'language', 'mic'];
        if (this.isSolving && lockedActions.includes(action)) {
            this.showToast('⏳ AI is busy...');
            return;
        }

        switch (action) {
            case 'capture': this.showToast('📸 Screenshot Captured'); this.handleCaptureScreenshot(); break;
            case 'send_ai': this.showToast('🚀 Firing to AI'); this.handleSendToAI(); break;
            case 'fix_error': this.showToast('🔧 Fixing Error...'); this.handleFixError(); break;
            case 'hide_unhide':
                // 🐛 FIX: Frontend debounce — prevent double-fire during async IPC round-trip
                if (this._hideUnhideLock) break;
                this._hideUnhideLock = true;
                setTimeout(() => { this._hideUnhideLock = false; }, 500);
                this.showToast('👻 Toggled Stealth');
                window.require('electron').ipcRenderer.invoke('trigger-ghost-hide');
                break;
            case 'toggle_page2':
                this.activePage = this.activePage === 1 ? 2 : 1;
                this.showToast(`📄 Switched to Page ${this.activePage}`);
                // 🟢 FIX: Force the backend window to update its text when you flip the page!
                this.syncRadialToBackend(); 
                this.requestUpdate();
                break;
            case 'scroll_up':
                if (this.viewMode === 'typer') {
                    this.shadowRoot.querySelector('.typer-code-container')?.scrollBy({top: -150, behavior: 'smooth'});
                } else if (this.currentMode === 'proctored_live_interview') {
                    // 🟢 Route scroll based on mouse hover
                    const paneId = this.paneHoverState === 'voice' ? '#chat-pane' : '#code-pane';
                    this.shadowRoot.querySelector(paneId)?.scrollBy({top: -150, behavior: 'smooth'});
                } else {
                    this.shadowRoot.querySelector('.markdown-body')?.scrollBy({top: -200, behavior: 'smooth'});
                }
                break;
            case 'scroll_down':
                if (this.viewMode === 'typer') {
                    this.shadowRoot.querySelector('.typer-code-container')?.scrollBy({top: 150, behavior: 'smooth'});
                } else if (this.currentMode === 'proctored_live_interview') {
                    const paneId = this.paneHoverState === 'voice' ? '#chat-pane' : '#code-pane';
                    this.shadowRoot.querySelector(paneId)?.scrollBy({top: 150, behavior: 'smooth'});
                } else {
                    this.shadowRoot.querySelector('.markdown-body')?.scrollBy({top: 200, behavior: 'smooth'});
                }
                break;
            case 'prev_resp':
                this.showToast('◀ Previous');
                if (this.currentMode === 'proctored_live_interview') {
                    if (this.paneHoverState === 'voice' && this.voiceChatIndex > 0) this.voiceChatIndex--;
                    else if (this.paneHoverState === 'code' && this.codeChatIndex > 0) this.codeChatIndex--;
                    this.requestUpdate();
                } else {
                    this.navigateToPreviousResponse();
                }
                break;
            case 'next_resp':
                this.showToast('▶ Next');
                if (this.currentMode === 'proctored_live_interview') {
                    if (this.paneHoverState === 'voice' && this.voiceChatIndex < this.voiceChatHistory.length - 1) this.voiceChatIndex++;
                    else if (this.paneHoverState === 'code' && this.codeChatIndex < this.codeChatHistory.length - 1) this.codeChatIndex++;
                    this.requestUpdate();
                } else {
                    this.navigateToNextResponse();
                }
                break;

            // Add this inside the switch(action) block:
            case 'auto_type':
                // 🟢 HARDWARE COOLDOWN: Prevent accidental double-triggers from mouse wiggling
                if (Date.now() - (this._lastAutoTypeToggle || 0) < 2000) return;
                this._lastAutoTypeToggle = Date.now();

                if (this.viewMode === 'chat') {
                    // ▶️ WE ARE IN CHAT: SWITCH TO TYPER, DO NOT START
                    const lastMsg = this.localChatHistory[this.localChatHistory.length - 1] || '';
                    const parts = lastMsg.split('🤖 AI:\n');

                    if (parts.length > 1) {
                        let codeText = parts[1].trim();
                        codeText = codeText.replace(/```(c\+\+|python|java|javascript|js|cpp)?/gi, '').replace(/```/g, '').trim();
                        const newLines = codeText.split('\n');
                        const isSamePayload = this.typerCodeLines && this.typerCodeLines.join('\n') === newLines.join('\n');
                        
                        // 🟢 THE FIX: If it's the exact same payload but we already finished typing it earlier, override the lock!
                        const isAlreadyFinished = this.typingCurrentLineIndex > 0 && this.typingCurrentLineIndex >= (this.typerEndLine - this.typerStartLine);
                        
                        if (!isSamePayload || isAlreadyFinished) {
                            this.typerCodeLines = newLines;
                            this.typerStartLine = 0;
                            this.typerEndLine = this.typerCodeLines.length - 1;
                            this.typingCurrentLineIndex = 0;
                        }
                    
                        this.showToast((isSamePayload && !isAlreadyFinished) ? '🎯 Typer Ready. Trigger again to resume.' : '🎯 Typer Ready. Trigger again to start.');
                        this.viewMode = 'typer';
                        window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: true }));
                        this.requestUpdate();
                    } else {
                        this.showToast('⚠️ No payload ready');
                    }
                } else {
                    // ▶️ WE ARE IN TYPER: TOGGLE PLAY/PAUSE
                    if (this.typingState !== 'idle') {
                        this.showToast('🛑 Auto-Type Paused');
                        this.handleStopTyping();
                    } else {
                        this.showToast('⌨️ Auto-Type Started');
                        setTimeout(() => this.startTyperCountdown(), 100);
                    }
                }
                break;

            case 'trim_top':
                if (this.typerStartLine < this.typerEndLine) {
                    this.typerStartLine++;
                    this.scrollToLine(this.typerStartLine); // 🟢 Auto-Scroll
                    this.requestUpdate();
                }
                break;

            case 'trim_bottom':
                if (this.typerEndLine > this.typerStartLine) {
                    this.typerEndLine--;
                    this.scrollToLine(this.typerEndLine); // 🟢 Auto-Scroll
                    this.requestUpdate();
                }
                break;

            case 'expand_top':
                if (this.typerStartLine > 0) {
                    this.typerStartLine--;
                    this.scrollToLine(this.typerStartLine);
                    this.requestUpdate();
                }
                break;

            case 'expand_bottom':
                if (this.typerEndLine < this.typerCodeLines.length - 1) {
                    this.typerEndLine++;
                    this.scrollToLine(this.typerEndLine);
                    this.requestUpdate();
                }
                break;

            case 'reset_typer':
                this.typerStartLine = 0;
                this.typerEndLine = this.typerCodeLines.length - 1;
                this.typingCurrentLineIndex = 0;
                this.scrollToLine(0);
                this.showToast('🔄 Selection Reset');
                this.requestUpdate();
                break;

            case 'language':
                const langs = ['Auto / Text', 'C++', 'Python', 'Java', 'JavaScript'];
                let currIdx = langs.indexOf(this.programmingLanguage);
                if(currIdx === -1) currIdx = 0;
                let nextIdx = (currIdx + 1) % langs.length;
                this.handleLanguageChange({target: {value: langs[nextIdx]}});
                this.showToast(`💻 ${langs[nextIdx]}`);
                break;
            
            case 'reset':
                if (!this.resetArmed) {
                    this.resetArmed = true;
                    this.showToast('⚠️ RESET ARMED (5s)');
                    if (this.resetArmTimer) clearTimeout(this.resetArmTimer);
                    this.resetArmTimer = setTimeout(() => { this.resetArmed = false; this.requestUpdate(); }, 5000);
                } else {
                    if (this.resetArmTimer) clearTimeout(this.resetArmTimer);
                    if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
                    this.resetArmed = false;
                    this.isSolving = false;
                    this.capturedCount = 0;
                    this.showToast('🛑 Session Reset');
                    // 🟢 Wipe both memories
                    this.codeChatHistory = []; this.voiceChatHistory = [];
                    this.codeChatIndex = 0; this.voiceChatIndex = 0;
                    this.handleNewChat();
                }
                break;

            case 'refactor': this.showToast('🛠️ Refactoring Triggered'); this.handleRefactor(); break;
            case 'fast_think': 
                this.tacThinkMode = !this.tacThinkMode; this.showToast(this.tacThinkMode ? '🧠 THINK Mode ON' : '⚡ FAST Mode ON');
                this.isSwitchingMode = true; setTimeout(() => { this.isSwitchingMode = false; }, 3000);
                window.require('electron').ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', true);
                window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode); this.requestUpdate(); break;
            case 'change_ai': 
                let nextAiIdx = (this.currentProviderName === 'ChatGPT' ? 1 : (this.currentProviderName === 'Gemini' ? 2 : 0));
                this.showToast('🤖 Switched AI Engine'); this.handleSetEngine(nextAiIdx); break;
            case 'change_profile':
                if (this.currentMode === 'proctored_live_interview') {
                    this.showToast('👤 Swapped Loadout');
                    // Reverse the active loadout visually
                    let temp = this.paneHoverState;
                    this.paneHoverState = temp === 'code' ? 'voice' : 'code';
                    this.requestUpdate();
                } else {
                    if (this.aiProfiles.length > 0) {
                        const cIdx = this.aiProfiles.findIndex(p => p.id === this.currentProfileId);
                        const nIdx = (cIdx + 1) % this.aiProfiles.length;
                        this.showToast('👤 Profile Switched');
                        this.handleProfileChange({target: {value: this.aiProfiles[nIdx].id}});
                    }
                }
                break;
            
            // 🟢 GLOBALLY SYNCED UI ACTIONS
            case 'text_inc': 
            case 'text_dec':
                this.fontSize = Math.max(12, Math.min(32, this.fontSize + (action === 'text_inc' ? 1 : -1)));
                this.showToast(action === 'text_inc' ? 'A+ Text Size' : 'A- Text Size');
                await window.cheatingDaddy.storage.updatePreference('fontSize', this.fontSize);
                window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'fontSize', value: this.fontSize } })); 
                break;
            
            case 'bg_inc':
            case 'bg_dec':
                let newTrans = this.bgTransparency + (action === 'bg_inc' ? 0.05 : -0.05);
                this.bgTransparency = Math.max(0, Math.min(1, Math.round(newTrans * 100) / 100));
                this.showToast(action === 'bg_inc' ? '⬛ Opacity Increased' : '⬜ Opacity Decreased');
                await window.cheatingDaddy.storage.updatePreference('backgroundTransparency', this.bgTransparency);
                window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'backgroundTransparency', value: this.bgTransparency } })); 
                break;
            
            case 'toggle_ai_vis': this.showToast('👁️ Toggled AI Background Window'); this.handleToggleAiVisibility(); 
                break;
            
            case 'abort_typer':
                this.showToast('🛑 Aborted Auto-Typer');
                this.handleStopTyping(); 
                this.viewMode = 'chat';
                window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: false }));
                if (window.require && this.currentMode !== 'proctored_oa') {
                    window.require('electron').ipcRenderer.invoke('show-widget');
                }
                this.requestUpdate();
                break;
            case 'abort_oa':
                this.showToast('🚪 Exiting Proctored OA...');
                this.handleStopTyping();
                this.setGhostMode(false); // Instantly turn off click-through
                if (window.require) {
                    // 🐛 BUG 6 FIX: Kill radial FIRST, then change mode
                    window.require('electron').ipcRenderer.send('toggle-radial-permanent', false);
                    window.require('electron').ipcRenderer.send('set-oa-mode', false);
                    window.require('electron').ipcRenderer.send('set-session-mode', 'main');
                }
                this.activePage = 1; // 🐛 BUG 2 FIX: Reset page on abort
                // 🟢 FIX: Dispatch a clean routing event instead of reloading the whole page!
                window.dispatchEvent(new CustomEvent('return-to-main'));
                break;

            case 'regenerate':
                if (this.isSolving || !this.validateSetup()) return;
                this.isSolving = true;
                if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
                this.lastUserPrompt = "🔄 Regenerating Response...";
                this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Regenerating...)`];
                this.localChatIndex = this.localChatHistory.length - 1;
                this.requestUpdate();
                this.saveCurrentSession();
                if (window.require) {
                    window.require('electron').ipcRenderer.invoke('send-manual-text', '[SYSTEM: Please regenerate your previous response. Provide a clearer or alternative explanation.]');
                }
                break;
        }
    }

    connectToCompanion() {
        if (!this.helperPinInput || this.helperPinInput.length !== 6) return;
        this.hasReceivedCompanionProfile = false; // 🟢 Reset for next session
        this.helperConn = null;
        window.dispatchEvent(new CustomEvent('helper-status-changed', { detail: 'disconnected' }));
        window.dispatchEvent(new CustomEvent('update-pin-display', { detail: '' })); // 🟢 Clear PIN

        if (!window.Peer) { this.helperStatus = 'error'; return; }

        const myPeer = new window.Peer({ config: { 'iceServers': [{ urls: 'stun:stun.l.google.com:19302' }] } });
        
        myPeer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            this.helperStatus = 'error';
            this.requestUpdate();
        });

        myPeer.on('open', () => {
            const targetId = `cp-stealth-${this.helperPinInput}`;
            this.helperConn = myPeer.connect(targetId, { reliable: true });

            this.helperConn.on('open', () => {
                console.log("WebRTC Opened. Awaiting Handshake...");
            });

            // 🟢 CATCH THE HANDSHAKE, PONGS, DISCONNECTS & PROFILE PUSHES
            this.helperConn.on('data', (data) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'handshake') {
                        this.handshakeName = parsed.name;
                        this.helperStatus = 'handshake';
                        this.requestUpdate();
                        
                    } else if (parsed.type === 'push_profile') {
                        // 🟢 NEW: Copiable Chat Block (Once per session)
                        if (!this.hasReceivedCompanionProfile) {
                            this.hasReceivedCompanionProfile = true;
                            
                            const settings = parsed.settings || {};
                            const role = settings.role || 'Not specified';
                            const resume = settings.resume || 'Not provided';
                            
                            // Wrapping in ```text creates a beautiful copiable block!
                            const profileMsg = `👤 **${this.handshakeName} sent their Profile Data:**\n\n\`\`\`text\nTARGET ROLE:\n${role}\n\nRESUME & EXPERIENCE:\n${resume}\n\`\`\``;
                            
                            this.localChatHistory = [...this.localChatHistory, profileMsg];
                            this.localChatIndex = this.localChatHistory.length - 1;
                            this.requestUpdate();
                        }
                    } else if (parsed.type === 'pong') {
                        this.missedPongs = 0; 
                    } else if (parsed.type === 'disconnect') {
                        console.warn("Companion initiated disconnect.");
                        this.cleanupHelperConnection();
                    } else if (parsed.type === 'companion_chat') {
                        // 🟢 FIX: Unified Feed - Push Candidate's whisper directly into the main chat log!
                        const whisperHtml = `<div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-left: 3px solid #f59e0b; border-radius: 6px; margin-bottom: 10px; margin-top: 10px;"><strong style="color: #f59e0b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">🤫 ${this.handshakeName} Whispered:</strong><br/><span style="color: #e5e5e5; font-size: 13px;">${parsed.message}</span></div>`;
                        this.localChatHistory = [...this.localChatHistory, whisperHtml];
                        this.localChatIndex = this.localChatHistory.length - 1;
                        this.requestUpdate();
                        this.saveCurrentSession();
                    }
                } catch(e) {}
            });

            this.helperConn.on('close', () => this.cleanupHelperConnection());
            this.helperConn.on('error', () => { this.cleanupHelperConnection(); this.helperStatus = 'error'; this.requestUpdate(); });
        });

        setTimeout(() => {
            if (this.helperStatus === 'connecting') {
                this.helperStatus = 'error';
                this.requestUpdate();
                if (myPeer) myPeer.destroy();
            }
        }, 10000);
    }

    cleanupHelperConnection() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = null;
        this.missedPongs = 0;
        this.helperStatus = 'idle';
        this.handshakeName = null;
        this.hasReceivedCompanionProfile = false; // 🟢 Reset for next session
        this.helperConn = null;
        window.dispatchEvent(new CustomEvent('helper-status-changed', { detail: 'disconnected' }));
        this.requestUpdate();
    }

    // 🟢 NEW: Approve Handshake & Start Heartbeat
    approveHandshake() {
        this.helperStatus = 'connected';
        this.requestUpdate();
        window.dispatchEvent(new CustomEvent('helper-status-changed', { detail: 'connected' }));

        this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'approved' }));

        // Send Initial Screen
        const currentContent = this.localChatHistory.length > 0 ? this.localChatHistory[this.localChatIndex] : "🟢 **Secure Link Established.**";
        this.transmitCleanPayload(currentContent);

        // Start Ping/Pong Heartbeat
        this.missedPongs = 0;
        this.pingInterval = setInterval(() => {
            if (this.missedPongs >= 2) {
                console.warn("Heartbeat flatlined. Dropping connection.");
                if (this.helperConn) this.helperConn.close();
                this.cleanupHelperConnection();
                return;
            }
            this.missedPongs++;
            if (this.helperConn && this.helperConn.open) {
                this.helperConn.send(JSON.stringify({ type: 'ping' }));
            }
        }, 3000);
    }

    // 🟢 NEW: Reject Handshake
    rejectHandshake() {
        if (this.helperConn && this.helperConn.open) {
            this.helperConn.send(JSON.stringify({ type: 'handshake_ack', status: 'rejected' }));
            setTimeout(() => this.helperConn.close(), 500);
        }
        this.cleanupHelperConnection();
    }

    transmitCleanPayload(rawContent, isManualPush = false) {
        if (!this.helperConn || !this.helperConn.open) return;

        let cleanText = rawContent;
        if (cleanText.includes('🤖 AI:\n')) cleanText = cleanText.split('🤖 AI:\n')[1];
        else if (cleanText.includes('🤖 AI:')) cleanText = cleanText.split('🤖 AI:')[1];

        if (cleanText.includes('(Thinking...)') || cleanText.includes('(Solving...)') || cleanText.includes('(Refactoring...)')) {
            cleanText = "<p style='color: #888; font-style: italic;'>Generating solution...</p>";
        }

        // 🟢 SEND STRUCTURED JSON
        const payload = {
            type: 'chat_update',
            content: cleanText,
            index: this.localChatIndex,
            total: this.localChatHistory.length
        };
        this.helperConn.send(JSON.stringify(payload));

        // 🟢 VISUAL CONFIRMATION: Stamp the local chat log with a glowing badge!
        if (isManualPush && this.localChatHistory[this.localChatIndex] && !this.localChatHistory[this.localChatIndex].includes('✓ Beamed to Candidate')) {
            const badgeHtml = `<div style="display: block; margin-top: 15px;"><span style="background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid rgba(0, 204, 102, 0.4); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; user-select: none;">✓ Beamed to Candidate</span></div>`;
            const newHistory = [...this.localChatHistory];
            newHistory[this.localChatIndex] = newHistory[this.localChatIndex] + badgeHtml;
            this.localChatHistory = newHistory;
            this.requestUpdate();
            this.saveCurrentSession();
        }
    }

    async syncWidgetState() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};
            ipcRenderer.invoke('sync-widget', { count: this.capturedCount, transparency: prefs.backgroundTransparency ?? 0.8 });
        }
    }

    async syncBrainModeWithBrowser() {
        if (!window.require || this.isSwitchingMode) return; 
        const { ipcRenderer } = window.require('electron');
        const realBrowserMode = await ipcRenderer.invoke('get-current-ai-mode');
        
        if (realBrowserMode === 'think' && !this.tacThinkMode) {
            this.tacThinkMode = true; this.requestUpdate();
        } else if (realBrowserMode === 'fast' && this.tacThinkMode) {
            this.tacThinkMode = false; this.requestUpdate();
        }
    }

    async handleCaptureScreenshot() {
        if (!this.validateSetup()) return;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.capturedCount = await ipcRenderer.invoke('capture-screenshot');
            
            // 🟢 INSTANT RENDER: Fetch the image immediately and push it via Markdown!
            const imagesB64 = await ipcRenderer.invoke('get-screenshots');
            if (imagesB64 && imagesB64.length > 0) {
                const latestImg = imagesB64[imagesB64.length - 1];
                const mdImage = `![Screenshot](${latestImg})`;
                
                // If this is the first screenshot of a sequence, create a new chat block
                if (this.localChatHistory.length === 0 || this.localChatHistory[this.localChatIndex].includes('🤖 AI:')) {
                    this.localChatHistory = [...this.localChatHistory, `📸 **Captured Screenshot(s)**\n\n${mdImage}`];
                    this.localChatIndex = this.localChatHistory.length - 1;
                } else {
                    // 🐛 FIX: Append WITHOUT newlines (using a space) so Markdown groups them into the exact same paragraph grid!
                    this.localChatHistory[this.localChatIndex] += ` ${mdImage}`;
                }
                
                // Auto-scroll down so you see the image
                setTimeout(() => {
                    const container = this.shadowRoot.querySelector('.response-container');
                    if (container) container.scrollTop = container.scrollHeight;
                }, 50);
            }
            
            this.syncWidgetState();
            this.requestUpdate();
        }
    }

    async handleProfileChange(e) {
        if (this.isSolving) return this.showToast('⏳ AI is busy...');
        const targetId = e.target.value;
        if (!targetId || targetId === "none") return;
        this.currentProfileId = targetId;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            await ipcRenderer.invoke('switch-ai-profile', targetId);
            await window.cheatingDaddy.storage.updatePreference('lastProfileId', targetId);
            this.requestUpdate();
        }
    }

    async handleLanguageChange(e) {
        if (this.isSolving) return this.showToast('⏳ AI is busy...');
        this.programmingLanguage = e.target.value;
        if (this.programmingLanguage !== 'Custom') {
            await window.cheatingDaddy.storage.updatePreference('programmingLanguage', this.programmingLanguage);
        }
        this.requestUpdate();
    }

    getFinalLanguage() {
        return this.programmingLanguage === 'Custom' ? (this.customLanguage || 'Python') : this.programmingLanguage;
    }

    async handleToggleAiVisibility() {
        if (Date.now() - this.lastHiddenTime < 500) return;
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            // 🟢 FIX: Send no arguments! Let the backend calculate visibility based on physical opacity!
            this.isAiVisible = await ipcRenderer.invoke('toggle-ai-visibility');
            this.requestUpdate();
        }
    }

    renderMarkdown(text) {
        if (!text) return '';
        if (window.marked && window.hljs) {
            try {
                const renderer = new window.marked.Renderer();
                renderer.code = function(code, language) {
                    const codeStr = typeof code === 'object' ? (code.text || '') : (code || '');
                    const langStr = typeof code === 'object' ? (code.lang || '') : (language || '');
                    const langName = langStr.toLowerCase();
                    const validLang = (langName && window.hljs.getLanguage(langName)) ? langName : 'plaintext';
                    
                    let highlighted = codeStr;
                    try { highlighted = window.hljs.highlight(codeStr, { language: validLang }).value; } 
                    catch (e) { highlighted = codeStr.replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
                    
                    const encodedCode = encodeURIComponent(codeStr); 
                    const displayLang = validLang === 'plaintext' ? 'code' : validLang;
                    
                    return `
                        <div class="code-block-wrapper">
                            <div class="code-header">
                                <span class="lang-label">${displayLang}</span>
                                <div>
                                    <button class="type-code-btn" data-code="${encodedCode}">⌨️ Type</button>
                                    <button class="copy-code-btn" data-code="${encodedCode}">📋 Copy</button>
                                </div>
                            </div>
                            <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
                        </div>`;
                };

                if (typeof window.marked.parse === 'function') return window.marked.parse(text, { renderer: renderer, breaks: true });
                else { window.marked.setOptions({ renderer: renderer, breaks: true }); return window.marked(text); }
            } catch (e) {}
        }
        return `<pre style="white-space: pre-wrap;">${text}</pre>`; 
    }

    handleMarkdownClick(e) {
        if (e.target.tagName === 'IMG') {
            this.modalImage = e.target.src;
            this.requestUpdate();
            return;
        }
        if (e.target.classList.contains('copy-code-btn')) {
            const code = decodeURIComponent(e.target.getAttribute('data-code'));
            if (window.require) window.require('electron').clipboard.writeText(code);
            e.target.innerText = '✅ Copied!';
            setTimeout(() => { e.target.innerText = '📋 Copy'; }, 2000);
        }

        if (e.target.classList.contains('type-code-btn')) {
            const rawCode = decodeURIComponent(e.target.getAttribute('data-code'));
            this.typerCodeLines = rawCode.split('\n');
            if (this.typerCodeLines[this.typerCodeLines.length - 1].trim() === '') {
                this.typerCodeLines.pop(); 
            }
            this.typerStartLine = 0;
            this.typerEndLine = this.typerCodeLines.length - 1;
            this.typingCurrentLineIndex = 0;
            
            // 🟢 Signal to morph layout
            this.viewMode = 'typer';
            window.dispatchEvent(new CustomEvent('typer-mode-toggled', { detail: true }));
            if (window.require) window.require('electron').ipcRenderer.invoke('hide-widget'); // 🐛 FIX: Hide widget in Typer
            this.requestUpdate();
        }
    }

    scrollToLine(lineIdx) {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.typer-code-container');
            const lineEl = this.shadowRoot.querySelector('#typer-line-' + lineIdx);
            if (container && lineEl) {
                const offset = lineEl.offsetTop - (container.clientHeight / 2) + (lineEl.clientHeight / 2);
                container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
            }
        }, 50);
    }

    handleLineClick(index) {
        if (this.typingState !== 'idle') return; 

        const distToStart = Math.abs(index - this.typerStartLine);
        const distToEnd = Math.abs(index - this.typerEndLine);
        
        if (distToStart <= distToEnd) {
            this.typerStartLine = index;
        } else {
            this.typerEndLine = index;
        }
        
        if (this.typerStartLine > this.typerEndLine) {
            const temp = this.typerStartLine;
            this.typerStartLine = this.typerEndLine;
            this.typerEndLine = temp;
        }
        this.requestUpdate();
    }

    startTyperCountdown() {
        if (!window.require || this.typingState !== 'idle') return;
        
        // 🟢 MEMORY INJECTION: Advance the start line to where we last paused!
        if (this.typingCurrentLineIndex > 0) {
            this.typerStartLine += this.typingCurrentLineIndex;
        }
        this.typingCurrentLineIndex = 0;
        
        this.typingState = 'countdown';
        this.typingCountdown = this.typerDelay; // 🟢 Uses the new Settings Slider!
        
        // ⚡ If delay is 0, start typing immediately without the countdown phase
        if (this.typingCountdown <= 0) {
            this.typingState = 'typing';
            window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'typing' } }));
            this.requestUpdate();
            const payloadCode = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
            window.require('electron').ipcRenderer.send('start-auto-type', payloadCode, this.wpmSpeed, this.typerMistakes);
            return;
        }

        window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'countdown', count: this.typingCountdown } }));
        this.requestUpdate();

        const tick = () => {
            if (this.typingState !== 'countdown') return;
            this.typingCountdown--;
            window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'countdown', count: this.typingCountdown } }));
            this.requestUpdate();

            if (this.typingCountdown > 0) {
                this.typeTimer = setTimeout(tick, 1000);
            } else {
                this.typingState = 'typing';
                window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'typing' } }));
                this.requestUpdate();
                const payloadCode = this.typerCodeLines.slice(this.typerStartLine, this.typerEndLine + 1).join('\n');
                // 🟢 FIX: Send the mistake chance to PowerShell so it doesn't crash instantly!
                window.require('electron').ipcRenderer.send('start-auto-type', payloadCode, this.wpmSpeed, this.typerMistakes);
            }
        };
        this.typeTimer = setTimeout(tick, 1000);
    }

    handleStopTyping() {
        if (window.require) {
            window.require('electron').ipcRenderer.send('stop-auto-type');
        }
        clearTimeout(this.typeTimer);
        this.typingState = 'idle';
        window.dispatchEvent(new CustomEvent('typing-state-changed', { detail: { state: 'idle' } }));
        this.requestUpdate();
    }

    validateSetup() {
        const missingAccount = !this.aiProfiles || this.aiProfiles.length === 0;
        const missingContext = !this.hasResumeContext;
        if (missingAccount || missingContext) {
            this.isSolving = false; this.requestUpdate(); return false;
        }
        return true;
    }

    async saveCurrentSession() {
        if (!this.localChatHistory || this.localChatHistory.length === 0) return;
        
        const formattedHistory = this.localChatHistory.map(msg => {
            const parts = msg.split('🤖 AI:');
            let userText = parts[0] ? parts[0].replace('👤 You:', '').trim() : '';
            let aiText = parts[1] ? parts[1].replace(/^\n/, '').trim() : '';
            
            return {
                transcription: userText,
                ai_response: aiText,
                timestamp: parseInt(this.currentSessionId)
            };
        });

        if (window.cheatingDaddy && window.cheatingDaddy.storage) {
            await window.cheatingDaddy.storage.saveSession(this.currentSessionId, {
                profile: this.currentMode || 'Auto',
                conversationHistory: formattedHistory
            });
        }
    }

    async handleSendManualText() {
        const input = this.shadowRoot.querySelector('#manualPromptInput');
        if (input && input.value.trim() && window.require) {
            if (!this.validateSetup() || this.isSolving) return;
            this.isSolving = true; // 🟢 Hard Lock Start
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout);

            const rawText = input.value.trim();
            const { ipcRenderer } = window.require('electron');
            
            const lang = this.getFinalLanguage();
            let payload = rawText;
            if (lang !== 'Auto / Text') {
                payload += `\n\n[Format solution in ${lang}]`;
            }
            
            this.lastUserPrompt = `👤 You: ${rawText}`;
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Thinking...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            input.value = '';
            this.requestUpdate();
            this.saveCurrentSession();
            
            await ipcRenderer.invoke('send-manual-text', payload);
        }
    }

    handleWhisper() {
        const input = this.shadowRoot.querySelector('#whisperInput');
        if (input && input.value.trim() && this.helperConn && this.helperConn.open) {
            const msg = input.value.trim();
            // Beam to Companion
            this.helperConn.send(JSON.stringify({ type: 'whisper', message: msg }));
            
            // 🟢 FIX: Unified Feed - Push your own whisper into the main chat log!
            const whisperHtml = `<div style="background: rgba(66, 133, 244, 0.1); padding: 12px; border-left: 3px solid #4285f4; border-radius: 6px; margin-bottom: 10px; margin-top: 10px;"><strong style="color: #4285f4; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">💬 Whisper Sent:</strong><br/><span style="color: #e5e5e5; font-size: 13px;">${msg}</span></div>`;
            this.localChatHistory = [...this.localChatHistory, whisperHtml];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            this.saveCurrentSession();
            
            input.value = '';
        }
    }

    async handleClearScreenshots() {
        if (window.require) {
            this.capturedCount = await window.require('electron').ipcRenderer.invoke('clear-screenshots');
            this.syncWidgetState(); this.requestUpdate();
        }
    }

    async handleSendToAI() {
        if (this.capturedCount === 0 || this.isSolving) return;
        if (!this.validateSetup()) return;
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.isSolving = true; // 🟢 Hard Lock Start
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
            
            this.lastUserPrompt = this.localChatHistory[this.localChatIndex];
            this.localChatHistory[this.localChatIndex] = `${this.lastUserPrompt}\n\n🚀 **Sent to AI...**\n\n🤖 AI: (Solving...)`;
            
            this.capturedCount = 0;
            this.requestUpdate();
            this.saveCurrentSession();

            await ipcRenderer.invoke('send-oa-automation', this.getFinalLanguage());

            this.syncWidgetState(); 
        }
    }

    async handleFixError() {
        if (this.capturedCount === 0 || this.isSolving) return;
        if (!this.validateSetup()) return;
        
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.isSolving = true; 
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
            
            this.lastUserPrompt = this.localChatHistory[this.localChatIndex];
            this.localChatHistory[this.localChatIndex] = `${this.lastUserPrompt}\n\n🔧 **Fixing Error...**\n\n🤖 AI: (Analyzing code...)`;
            
            this.capturedCount = 0;
            this.requestUpdate();
            this.saveCurrentSession();

            await ipcRenderer.invoke('send-oa-fix-error');

            this.syncWidgetState(); 
        }
    }

    async handleRefactor() {
        if (!this.validateSetup() || this.isSolving) return;
        if (window.require) {
            this.isSolving = true; // 🟢 Hard Lock Start
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout);
            
            this.lastUserPrompt = "🛠️ Triggered Code Refactoring";
            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Refactoring...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            this.saveCurrentSession();
            
            await window.require('electron').ipcRenderer.invoke('send-oa-refactor');
        }
    }

    async handleSendProfileContext() {
        if (window.require) {
            if (this.isSolving) return;
            this.isSolving = true;
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout);

            const { ipcRenderer } = window.require('electron');
            const raw = await window.cheatingDaddy.storage.getPreferences();
            const prefs = raw?.data || raw || {};

            if (!prefs.customPrompt || prefs.customPrompt.trim().length === 0) {
                this.isSolving = false;
                return;
            }

            // 🆕 Feature 10: Clean profile context — no more XML tags
            const role = prefs.interviewRole || 'Software Engineer';
            const payload = `[SYSTEM DIRECTIVE: Act as an expert candidate interviewing for the role of "${role}".]\n\nCRITICAL RULES:\n1. You ARE the candidate. ALWAYS use first-person pronouns ("I", "my", "we").\n2. Answer in clear, structured format. Use Markdown code blocks for code.\n3. Be concise but thorough. Show your thought process.\n4. If asked about your background, reference the resume data below.\n\nCANDIDATE BACKGROUND/RESUME:\n${prefs.customPrompt}\n\nPlease acknowledge that you have received this context. Keep it brief.`;

            this.lastUserPrompt = "📄 Sent Profile Context to AI";

            this.localChatHistory = [...this.localChatHistory, `${this.lastUserPrompt}\n\n🤖 AI: (Ingesting context...)`];
            this.localChatIndex = this.localChatHistory.length - 1;
            this.requestUpdate();
            this.saveCurrentSession();

            await ipcRenderer.invoke('send-manual-text', payload);
        }
    }

    async handleSetEngine(index, isBoot = false) {
        if (!isBoot && this.isSolving) return this.showToast('⏳ AI is busy...');
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            this.currentProviderName = await ipcRenderer.invoke('set-ai-provider', index);
            await window.cheatingDaddy.storage.updatePreference('lastAiEngine', index);
            await ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', false);
            this.requestUpdate();
        }
    }

    async handleNewChat() {
        if (window.require) {
            this.isMicOn = false;
            this.isSolving = false; // 🟢 Release Lockout
            if (this.solvingTimeout) clearTimeout(this.solvingTimeout); // 🟢 Kill stream tracker
            
            this.currentSessionId = Date.now().toString(); 
            this.lastUserPrompt = "✨ Fresh Chat Context Started";
            this.localChatHistory = [`${this.lastUserPrompt}\n\n🤖 AI: (Ready for new input...)`];
            this.localChatIndex = 0;
            this.requestUpdate();
            this.saveCurrentSession(); 
            await window.require('electron').ipcRenderer.invoke('new-chat');
            
            // 🟢 AUTO-START VOICE BRAIN AFTER RESET
            if (this.currentMode === 'proctored_live_interview') {
                setTimeout(() => {
                    if (!this.isMicOn) {
                        this.handleToggleMic();
                        this.showToast('🎙️ Voice Brain Re-Engaged');
                    }
                }, 6000);
            }
        }
    }

    async handleToggleMic() {
        if (this.isSolving) return this.showToast('⏳ AI is busy...');
        if (!this.validateSetup()) return;
        
        this.showToast('🎙️ Toggling Mic...');
        // 🟢 FIX: Do NOT toggle this.isMicOn manually! Ask the backend to click it, and wait for the DOM spy to sync the true state.
        if (window.require) {
            await window.require('electron').ipcRenderer.invoke('toggle-ai-mic', !this.isMicOn);
        }
    }

    setGhostMode(ignore) {
        const safeIgnore = !!ignore; // 🐛 BUG 1 FIX: Force clean boolean
        if (this._isCurrentlyGhosting === safeIgnore) return;
        this._isCurrentlyGhosting = safeIgnore;
        if (window.require) window.require('electron').ipcRenderer.send('set-ignore-mouse-events', safeIgnore);
    }

    toggleDropdown(name) { this.activeDropdown = this.activeDropdown === name ? null : name; this.requestUpdate(); }
    closeDropdown() { this.activeDropdown = null; this.requestUpdate(); }

    renderEngineSelector() {
        const engines = { 0: '🤖 ChatGPT', 1: '🤖 Gemini', 2: '🐺 Grok' };
        const currentEngineIdx = this.currentProviderName === 'Gemini' ? 1 : (this.currentProviderName === 'Grok' ? 2 : 0);
        return html`
            <div class="custom-dropdown">
                <div class="dropdown-trigger ${this.isSolving ? 'disabled' : ''}" @click=${() => this.toggleDropdown('engine')}>${engines[currentEngineIdx]}</div>
                ${this.activeDropdown === 'engine' ? html`
                    <div class="dropdown-menu">
                        ${Object.entries(engines).map(([id, label]) => html`
                            <div class="dropdown-option ${parseInt(id) === currentEngineIdx ? 'selected' : ''}" 
                                 @click=${() => { this.handleSetEngine(parseInt(id)); this.closeDropdown(); }}>${label}</div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderLanguageSelector() {
        const languages = ['Auto / Text', 'C++', 'Python', 'Java', 'JavaScript', 'Custom'];
        return html`
            <div style="display: flex; gap: 4px; align-items: center;">
                <div class="custom-dropdown">
                    <div class="dropdown-trigger ${this.isSolving ? 'disabled' : ''}" @click=${() => this.toggleDropdown('language')}>💻 ${this.programmingLanguage === 'Custom' ? 'Custom...' : this.programmingLanguage}</div>
                    ${this.activeDropdown === 'language' ? html`
                        <div class="dropdown-menu">
                            ${languages.map(lang => html`
                                <div class="dropdown-option ${this.programmingLanguage === lang ? 'selected' : ''}" 
                                     @click=${() => { this.handleLanguageChange({target: {value: lang}}); this.closeDropdown(); }}>${lang === 'Custom' ? '✏️ Custom...' : `💻 ${lang}`}</div>
                            `)}
                        </div>
                    ` : ''}
                </div>
                ${this.programmingLanguage === 'Custom' ? html`<input type="text" class="prompt-input" style="width: 80px; padding: 4px 8px;" placeholder="Language" .value=${this.customLanguage} @input=${e => this.customLanguage = e.target.value}>` : ''}
            </div>
        `;
    }

    renderProfileSelector() {
        let currentAiIdx = 0;
        if (this.currentProviderName === 'Gemini') currentAiIdx = 1;
        if (this.currentProviderName === 'Grok') currentAiIdx = 2;
        const availableProfiles = (this.aiProfiles || []).filter(p => p.loggedAIs && p.loggedAIs.includes(currentAiIdx));
        if (availableProfiles.length === 0) return html`<div class="custom-dropdown"><div class="dropdown-trigger" style="border-color: #f14c4c; color: #f14c4c;">⚠️ No Login Found</div></div>`;
        const currentProfile = availableProfiles.find(p => p.id === this.currentProfileId) || availableProfiles[0];
        return html`
            <div class="custom-dropdown">
                <div class="dropdown-trigger ${this.isSolving ? 'disabled' : ''}" @click=${() => this.toggleDropdown('profile')}>👤 ${currentProfile ? currentProfile.name : 'Select'}</div>
                ${this.activeDropdown === 'profile' ? html`
                    <div class="dropdown-menu">
                        ${availableProfiles.map(p => html`
                            <div class="dropdown-option ${this.currentProfileId === p.id ? 'selected' : ''}" 
                                 @click=${() => { this.handleProfileChange({target: {value: p.id}}); this.closeDropdown(); }}>👤 ${p.name}</div>
                        `)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 🎯 THE NEW CLEAN SNIPER VIEW
    renderTyperMode() {
        return html`
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: transparent;">                
                ${this.currentMode === 'proctored_oa' ? '' : html`
                    <div style="padding: 12px 16px;">
                        <div style="background: rgba(161, 66, 244, 0.15); border: 1px solid rgba(161, 66, 244, 0.5); padding: 10px 14px; border-radius: 6px; color: var(--text-color); font-size: 13px; line-height: 1.5;">
                            <strong style="color: #a142f4;">Select Range to Type.</strong> Area in purple will be written as it is.<br/>
                            <span style="color: #f14c4c; font-weight: bold; font-size: 12px;">[Note: Auto Typer can make mistakes, Recheck Yourself before submitting]</span>
                        </div>
                    </div>
                `}
                
                <div class="typer-code-container" style="position: relative; flex: 1; overflow-y: auto; padding: 0 16px 20px 16px; font-family: 'SF Mono', Consolas, monospace; font-size: var(--response-font-size, 13px); line-height: 1.6; color: var(--text-color);">
                    ${this.typerCodeLines.map((line, idx) => {
                        const isHighlighted = idx >= this.typerStartLine && idx <= this.typerEndLine;
                        const isCurrentTypingLine = (this.typingState === 'typing') && isHighlighted && (idx === this.typerStartLine + this.typingCurrentLineIndex);
                        
                        let bgStyle = 'transparent'; let borderStyle = '1px solid transparent'; let textColor = 'var(--text-color)'; let numColor = '#666';

                        if (isCurrentTypingLine) { bgStyle = 'rgba(0, 204, 102, 0.25)'; borderStyle = '1px solid #00cc66'; textColor = '#fff'; numColor = '#00cc66'; } 
                        else if (isHighlighted) { bgStyle = 'rgba(161, 66, 244, 0.2)'; borderStyle = '1px solid rgba(161, 66, 244, 0.3)'; textColor = 'var(--text-color)'; numColor = '#a142f4'; }

                        return html`
                            <div id="typer-line-${idx}" style="display: flex; cursor: default !important; border-radius: 4px; padding: 2px 4px; margin-bottom: 2px; transition: 0.2s; background: ${bgStyle}; border: ${borderStyle}; color: ${textColor};" 
                                 @click=${() => this.handleLineClick(idx)}>
                                <div style="width: 40px; min-width: 40px; text-align: right; padding-right: 12px; font-weight: bold; color: ${numColor}; user-select: none;">${idx + 1}</div>
                                <div style="white-space: pre-wrap; word-wrap: break-word; flex: 1;">${line || ' '}</div>
                            </div>
                        `;
                    })}
                </div>
                
                ${this.currentMode === 'proctored_oa' ? this.renderOAControls() : html`
                    <div class="bottom-controls" style="padding: 12px; border-top: 1px solid #444;">
                        <div class="control-row">
                            <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-secondary); padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color);">
                                <span style="font-size: 11px; color: var(--text-color); font-weight: bold;">Speed: ${this.wpmSpeed}</span>
                                <input type="range" min="10" max="180" step="10" .value=${this.wpmSpeed} @input=${(e) => {
                                    this.wpmSpeed = parseInt(e.target.value);
                                    if (window.cheatingDaddy && window.cheatingDaddy.storage) {
                                        window.cheatingDaddy.storage.updatePreference('wpmSpeed', this.wpmSpeed);
                                        window.dispatchEvent(new CustomEvent('sync-preference', { detail: { key: 'wpmSpeed', value: this.wpmSpeed } }));
                                    }
                                    this.requestUpdate();
                                }} style="width: 80px; accent-color: #a142f4; background: transparent;">
                            </div>

                            ${this.typingState === 'idle' ? html`
                                <button class="action-btn success" @click=${this.startTyperCountdown}>▶ Start Typing</button>
                            ` : html`
                                <button class="action-btn danger" style="animation: pulse 1s infinite;" @click=${this.handleStopTyping}>
                                    ${this.typingState === 'countdown' ? `⏳ Starts in ${this.typingCountdown}s...` : '🛑 Stop Typing'}
                                </button>
                            `}
                        </div>
                    </div>
                `}
            </div>
        `;
    }

    getHotCornerLabel(action) {
        const labels = {
            'none': '—', 'capture': '📸 Capture', 'send_ai': '🚀 Send AI',
            'hide_unhide': '👻 Hide/Show', 'scroll_up': '⬆️ Scroll Up', 'scroll_down': '⬇️ Scroll Dn',
            'prev_resp': '◀ Prev', 'next_resp': '▶ Next', 'change_ai': '🤖 Change AI',
            'change_profile': '👤 Profile', 'fast_think': '🧠 Fast/Think', 'refactor': '🛠️ Refactor',
            'reset': '✨ Reset', 'text_inc': 'A+ Text', 'text_dec': 'A- Text',
            'bg_inc': '⬛ Opacity+', 'bg_dec': '⬜ Opacity-', 'toggle_ai_vis': '👁️ Toggle AI',
            'fix_error': '🔧 Fix Error', 'language': '💻 Language', 'mic': '🎙️ Mic',
            'trim_top': '✂️ Unselect Top', 'trim_bottom': '✂️ Unselect Bot', 'abort_typer': '🛑 Abort',
            'auto_type': '⌨️ Auto-Type', 'expand_top': '➕ Expand Top', 'expand_bottom': '➕ Expand Bot', 
            'reset_typer': '🔄 Reset', 'abort_oa': '🚪 Abort OA', 'toggle_page2': '🔄 Page 1 / 2'
        };
        return labels[action] || action || '—';
    }

    syncRadialToBackend() {
        if (!window.require) return;
        
        const defaultPage1 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'mic', right_mid_top: 'change_ai', middle_left: 'prev_resp', middle_right: 'next_resp', left_mid_bottom: 'fast_think', right_mid_bottom: 'change_profile', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };
        const defaultPage2 = { top_left: 'capture', top_mid_left: 'abort_oa', top_center: 'scroll_up', top_mid_right: 'toggle_ai_vis', top_right: 'hide_unhide', left_mid_top: 'bg_inc', right_mid_top: 'text_inc', middle_left: 'reset', middle_right: 'language', left_mid_bottom: 'bg_dec', right_mid_bottom: 'text_dec', bottom_left: 'send_ai', bottom_mid_left: 'regenerate', bottom_center: 'scroll_down', bottom_mid_right: 'toggle_page2', bottom_right: 'fix_error' };

        let activeMap = this.activePage === 2 ? this.interviewCornersPage2Map : this.interviewCornersMap;
        
        // 🟢 BUG FIX: If database payload is strictly empty, force the default layouts to populate!
        if (!activeMap || Object.keys(activeMap).length === 0) {
            activeMap = this.activePage === 2 ? defaultPage2 : defaultPage1;
        }

        const clockWiseGrid = ['top_center', 'top_mid_right', 'top_right', 'right_mid_top', 'middle_right', 'right_mid_bottom', 'bottom_right', 'bottom_mid_right', 'bottom_center', 'bottom_mid_left', 'bottom_left', 'left_mid_bottom', 'middle_left', 'left_mid_top', 'top_left', 'top_mid_left'];
        const labelsArray = clockWiseGrid.map(key => String(this.getHotCornerLabel(activeMap[key] || 'none'))); // 🐛 BUG 1 FIX: Force string
        window.require('electron').ipcRenderer.send('sync-radial-labels', labelsArray);
    }

    renderOAControls() {
        let map = this.hotCornersMap || {};
        let pageLabel = '';
        if (this.viewMode === 'typer') {
            map = this.typerHotCornersMap || {};
        } else if (this.activePage === 2) {
            map = this.hotCornersPage2Map || {};
            pageLabel = ' (PAGE 2)';
        }
        const b = this.hotCornerBounds || { dwellTime: 3, hideTime: 0 };
        const currentProfile = (this.aiProfiles || []).find(p => p.id === this.currentProfileId);
        const profileName = currentProfile ? currentProfile.name : 'None';
        const aiName = this.currentProviderName || 'ChatGPT';
        const modeName = this.tacThinkMode ? 'Think' : 'Fast';

        const renderZone = (id) => {
            const isHover = this.hoverZone === id;
            const action = map[id];
            if (!action || action === 'none') return html`<div style="opacity: 0.1;"></div>`;
            
            let displayLabel = this.getHotCornerLabel(action);
            let borderOverride = isHover ? '#f59e0b' : 'var(--border-subtle)';
            let textOverride = isHover ? '#fff' : 'var(--text-secondary)';
            let bgOverride = 'rgba(0,0,0,0.3)';

            if (action === 'change_profile') displayLabel = `👤 ${profileName}`;
            if (action === 'fast_think') displayLabel = `🧠 ${modeName}`;
            if (action === 'change_ai') displayLabel = `🤖 ${aiName}`;
            if (action === 'language') displayLabel = `💻 ${this.programmingLanguage}`;
            if (action === 'mic') displayLabel = `🎙️ Mic: ${this.isMicOn ? 'ON' : 'OFF'}`;
            if (action === 'toggle_ai_vis') displayLabel = this.isAiVisible ? '👻 Hide AI' : '👁️ Show AI';
            if (action === 'reset' && this.resetArmed) {
                displayLabel = `⚠️ CONFIRM RESET`; borderOverride = '#f14c4c'; textOverride = '#f14c4c'; bgOverride = 'rgba(241, 76, 76, 0.15)';
            }

            return html`
                <div style="position: relative; border: 1px solid ${borderOverride}; border-radius: 4px; overflow: hidden; background: ${bgOverride}; transition: 0.2s; display: flex; align-items: center; justify-content: center; height: 100%; box-sizing: border-box; padding: 0 4px;">
                    ${isHover ? html`<div style="position: absolute; top: 0; left: 0; bottom: 0; height: 100%; width: ${this.hoverProgress}%; background: rgba(245, 158, 11, 0.4); z-index: 1;"></div>` : ''}
                    <div style="position: relative; z-index: 2; color: ${textOverride}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 9px; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; margin: 0; padding: 0;">${displayLabel}</div>
                </div>
            `;
        };

        let toastColor = '#00cc66';
        if (this.ghostToastMessage) {
            if (this.ghostToastMessage.includes('⚠️') || this.ghostToastMessage.includes('⏳')) toastColor = '#f59e0b';
            if (this.ghostToastMessage.includes('🛑')) toastColor = '#f14c4c';
        }
        const centerMsg = this.ghostToastMessage ? html`<div style="color: ${toastColor}; font-size: 11px; font-weight: bold; text-transform: uppercase; animation: fadeIn 0.2s; display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; height: 100%;">${this.ghostToastMessage}</div>` : html`<div style="font-size: 9.5px; opacity: 0.4; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; height: 100%;">🎯 HOLD ${b.dwellTime}s TO TRIGGER${pageLabel}</div>`;

        return html`
            <div class="bottom-controls" style="padding: 6px; background: rgba(0,0,0,0.25); border-top: 1px dashed var(--border-color); flex-shrink: 0;">
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 24px); gap: 4px; text-align: center; font-size: 8.5px; font-weight: bold; width: 100%;">
                    ${renderZone('top_left')} ${renderZone('top_mid_left')} ${renderZone('top_center')} ${renderZone('top_mid_right')} ${renderZone('top_right')}
                    ${renderZone('left_mid_top')}
                    <div style="grid-column: span 3; grid-row: span 3; display: flex; align-items: center; justify-content: center; height: 100%;">
                        ${centerMsg}
                    </div>
                    ${renderZone('right_mid_top')}
                    ${renderZone('middle_left')} ${renderZone('middle_right')}
                    ${renderZone('left_mid_bottom')} ${renderZone('right_mid_bottom')}
                    ${renderZone('bottom_left')} ${renderZone('bottom_mid_left')} ${renderZone('bottom_center')} ${renderZone('bottom_mid_right')} ${renderZone('bottom_right')}
                </div>
            </div>
        `;
    }

    renderProctoredLiveInterviewMode() {
        let leftContent = "";
        let rightContent = "";

        if (this.codeChatHistory.length === 0 && this.voiceChatHistory.length === 0) {
            leftContent = "🟢 **Code Engine Online**\nAwaiting screenshot captures...";
            rightContent = "🟢 **Voice Engine Online**\nListening to microphone feed...";
        } else {
            leftContent = this.codeChatHistory.length > 0 ? this.codeChatHistory[this.codeChatIndex] : "🟢 **Code Engine Online**\nAwaiting screenshot captures...";
            rightContent = this.voiceChatHistory.length > 0 ? this.voiceChatHistory[this.voiceChatIndex] : "🟢 **Voice Engine Online**\nListening to microphone feed...";
        }

        // 🟢 THE NEW STICKY HEADERS (Glassy, Obeys BG slider!)
        const codeHeader = html`
            <div style="position: sticky; top: -15px; background: var(--bg-tertiary); backdrop-filter: blur(5px); padding: 8px 10px; margin: -15px -10px 10px -10px; border-bottom: 1px solid var(--border-color); z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0;">
                <span style="font-size: 11px; font-weight: bold; color: #4285f4; text-transform: uppercase;">💻 Code Brain</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 11px; color: ${this.tacThinkMode ? '#f59e0b' : '#00cc66'};">${this.tacThinkMode ? '🧠 Think' : '⚡ Fast'}</span>
                    <span style="font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${this.codeChatHistory.length ? `${this.codeChatIndex + 1}/${this.codeChatHistory.length}` : '0/0'}</span>
                </div>
            </div>
        `;

        // 🟢 MIC BUTTON INJECTED HERE!
        const voiceHeader = html`
            <div style="position: sticky; top: -15px; background: var(--bg-tertiary); backdrop-filter: blur(5px); padding: 8px 10px; margin: -15px -10px 10px -10px; border-bottom: 1px solid var(--border-color); z-index: 10; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0;">
                <span style="font-size: 11px; font-weight: bold; color: #a142f4; text-transform: uppercase;">🗣️ Voice Brain</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button @click=${this.handleToggleMic} style="background: ${this.isMicOn ? 'rgba(0, 204, 102, 0.15)' : 'rgba(241, 76, 76, 0.15)'}; color: ${this.isMicOn ? '#00cc66' : '#f14c4c'}; border: 1px solid ${this.isMicOn ? 'rgba(0, 204, 102, 0.4)' : 'rgba(241, 76, 76, 0.4)'}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; transition: 0.2s; cursor: pointer !important;">
                        🎙️ MIC: ${this.isMicOn ? 'ON' : 'OFF'}
                    </button>
                    <span style="font-size: 11px; color: #00cc66;">⚡ Fast</span>
                    <span style="font-size: 11px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${this.voiceChatHistory.length ? `${this.voiceChatIndex + 1}/${this.voiceChatHistory.length}` : '0/0'}</span>
                </div>
            </div>
        `;

        return html`
            <div style="display: flex; width: 100%; height: 100%; background: transparent; position: relative; gap: 10px; padding-bottom: 10px;">
                
                <div id="code-pane" 
                     class="markdown-body" 
                     @mouseenter=${() => this.paneHoverState = 'code'}
                     style="flex: 1; border: 1px solid ${this.paneHoverState === 'code' ? '#4285f4' : 'var(--border-color)'}; border-radius: 8px; overflow-y: auto; padding: 15px 10px; background: var(--bg-secondary); transition: border-color 0.2s;">
                    ${codeHeader}
                    <div @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(leftContent)}></div>
                </div>

                <div id="chat-pane" 
                     class="markdown-body" 
                     @mouseenter=${() => this.paneHoverState = 'voice'}
                     style="flex: 1; border: 1px solid ${this.paneHoverState === 'voice' ? '#a142f4' : 'var(--border-color)'}; border-radius: 8px; overflow-y: auto; padding: 15px 10px; background: var(--bg-secondary); transition: border-color 0.2s;">
                    ${voiceHeader}
                    ${this.voiceTranscript ? html`
                        <div style="background: rgba(161, 66, 244, 0.08); border: 1px solid rgba(161, 66, 244, 0.2); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; max-height: 60px; overflow-y: auto;">
                            <div style="font-size: 9px; font-weight: bold; color: #a142f4; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px;">🎙️ Interviewer Said:</div>
                            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">${this.voiceTranscript}</div>
                        </div>
                    ` : ''}
                    <div @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(rightContent)}></div>
                </div>

            </div>
        `;
    }

    renderProctoredOAMode() {
        let m = "🟢 **Ghost Sensors Active.** Move mouse to screen edges/corners and hold to trigger actions.";
        const c = this.localChatHistory.length > 0 && this.localChatIndex >= 0 ? this.localChatHistory[this.localChatIndex] : m;
        return html`
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: transparent; position: relative;">
                <div class="markdown-body" style="flex: 1; min-height: 0; height: auto;" @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(c)}></div>
                ${this.renderOAControls()}
            </div>
        `;
    }

    renderHelpingMode() {
        // 🟢 SHOW NAME APPROVAL SCREEN
        if (this.helperStatus === 'handshake') {
            return html`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: transparent; padding: 20px;">
                    
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: var(--text-color);">Incoming Link Request</div>
                        <div style="color: var(--text-muted); font-size: 13px;">Someone is trying to connect to your session.</div>
                    </div>

                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-top: 4px solid #a142f4; border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
                        <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(161, 66, 244, 0.15); color: #a142f4; border: 1px solid rgba(161, 66, 244, 0.3); margin-bottom: 20px;">🛡️</div>

                        <span style="color: var(--text-muted); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">User Verification</span>
                        <strong style="color: #a142f4; font-size: 24px; letter-spacing: 1px; margin-bottom: 30px; text-align: center;">${this.handshakeName}</strong>

                        <div style="display: flex; gap: 12px; width: 100%;">
                            <button class="action-btn danger" style="flex: 1; justify-content: center; padding: 12px; font-size: 13px;" @click=${this.rejectHandshake}>❌ Reject</button>
                            <button class="action-btn success" style="flex: 1; justify-content: center; padding: 12px; font-size: 13px;" @click=${this.approveHandshake}>✅ Approve</button>
                        </div>
                    </div>

                </div>
            `;
        }

        // 🟢 DEFAULT PIN ENTRY SCREEN (Matches Companion Hub)
        return html`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: transparent; padding: 20px;">
                
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: var(--text-color);">Connect to Companion</div>
                    <div style="color: var(--text-muted); font-size: 13px;">Enter the 6-character PIN from your friend's screen.</div>
                </div>

                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-top: 4px solid #f59e0b; border-radius: 12px; padding: 30px; width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
                    <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 25px;">🤝</div>

                    <input class="prompt-input" style="width: 100%; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2) !important; padding: 15px; border-radius: 8px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2); margin-bottom: 20px; outline: none; text-transform: uppercase;" 
                           placeholder="------" maxlength="6" 
                           .value=${this.helperPinInput} 
                           @input=${(e) => { this.helperPinInput = e.target.value.toUpperCase(); this.requestUpdate(); }}>

                    <button class="action-btn" style="width: 100%; justify-content: center; padding: 12px; font-size: 14px; background: ${this.helperPinInput.length === 6 ? '#f59e0b' : 'var(--bg-tertiary)'}; color: ${this.helperPinInput.length === 6 ? '#000' : 'var(--text-muted)'}; border: none; font-weight: bold; transition: 0.2s;" @click=${this.connectToCompanion}>
                        ${this.helperStatus === 'connecting' ? 'Connecting...' : 'Establish Link'}
                    </button>

                    ${this.helperStatus === 'error' ? html`
                        <div style="margin-top: 15px; padding: 10px; border-radius: 6px; background: rgba(241, 76, 76, 0.1); border: 1px solid rgba(241, 76, 76, 0.3); color: #f14c4c; font-size: 12px; font-weight: bold; width: 100%; text-align: center;">
                            Connection failed. Check PIN.
                        </div>
                    ` : ''}
                </div>

            </div>
        `;
    }

    render() {
        if (this.viewMode === 'typer') return this.renderTyperMode();
        if (this.currentMode === 'proctored_oa') return this.renderProctoredOAMode();
        if (this.currentMode === 'proctored_live_interview') return this.renderProctoredLiveInterviewMode();
        if (this.isHelpingMode && this.helperStatus !== 'connected') return this.renderHelpingMode();

        let m = "🟢 **System Online. Awaiting inputs...**";
        if (!this.aiProfiles || this.aiProfiles.length === 0) m = "⚠️ **SYSTEM WARNING: No AI Accounts**\n\nPlease go to **Settings > Accounts** to log in to at least one AI provider.";
        
        const c = this.localChatHistory.length > 0 && this.localChatIndex >= 0 ? this.localChatHistory[this.localChatIndex] : m;

        return html`
            <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: transparent;">
                ${this.activeDropdown ? html`<div class="dropdown-backdrop" @click=${this.closeDropdown}></div>` : ''}
                
                <div class="markdown-body" @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(c)}></div>
                
                <div class="bottom-controls" @mousemove=${() => this.setGhostMode(false)}>                    
                    
                    <div class="control-row" style="flex-wrap: nowrap; align-items: flex-end;">
                        <textarea id="manualPromptInput" class="prompt-input" rows="1" placeholder="Ask AI a follow-up... (Shift+Enter for newline)" 
                                  @input=${function(e) { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }}
                                  @keydown=${(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          this.handleSendManualText();
                                          setTimeout(() => {
                                              const ta = this.shadowRoot.querySelector('#manualPromptInput');
                                              if(ta) ta.style.height = 'auto';
                                          }, 10);
                                      }
                                  }} style="flex: 1; resize: none; overflow: hidden; min-height: 38px; padding-top: 10px; font-family: inherit; font-size: 13px;"></textarea>
                        
                        ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                            <textarea id="whisperInput" class="prompt-input" rows="1" placeholder="Whisper to Friend... (Shift+Enter for newline)" 
                                      @input=${function(e) { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px'; }}
                                      @keydown=${(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              this.handleWhisper();
                                              setTimeout(() => {
                                                  const ta = this.shadowRoot.querySelector('#whisperInput');
                                                  if(ta) ta.style.height = 'auto';
                                              }, 10);
                                          }
                                      }} style="flex: 1; border-color: #a142f4; resize: none; overflow: hidden; min-height: 38px; padding-top: 10px; font-family: inherit; font-size: 13px;"></textarea>
                        ` : ''}

                        <button class="action-btn ${this.isAiVisible ? 'danger' : ''}" @click=${this.handleToggleAiVisibility} style="flex-shrink: 0; height: 38px;">
                            ${this.isAiVisible ? '👻 Hide AI' : '👁️ Show AI'}
                        </button>
                    </div>

                    ${(this.currentMode === 'interview' || this.currentMode === 'companion') ? html`
                        <div class="control-row">
                            <button class="action-btn" ?disabled=${this.isSolving} @click=${this.handleNewChat}>✨ Reset</button>
                            <button class="action-btn" ?disabled=${this.isSolving} @click=${async () => {
                                this.tacThinkMode = !this.tacThinkMode; this.isSwitchingMode = true; setTimeout(() => { this.isSwitchingMode = false; }, 3000);
                                if(window.require) window.require('electron').ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', true);
                                await window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode); this.requestUpdate();
                            }}>
                                ${this.tacThinkMode ? '🧠 THINK' : '⚡ FAST'}
                            </button>
                            ${this.renderEngineSelector()}
                            ${this.renderLanguageSelector()}
                            <button class="action-btn primary" ?disabled=${this.isSolving} @click=${this.handleSendProfileContext}>📄 Send Profile</button>
                            <button class="action-btn ${this.isMicOn ? 'success' : ''}" ?disabled=${this.isSolving} @click=${this.handleToggleMic}>
                                🎙️ Mic: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        
                        <div class="control-row">
                            <div class="format-toggles" style="font-size: 11px; color: #a0a0a0; display: flex; gap: 15px; align-items: center;">
                                <label><input type="checkbox" .checked=${this.tacBrief} @change=${(e)=>{this.tacBrief=e.target.checked; this.requestUpdate();}}> Brief</label>
                                <label><input type="checkbox" .checked=${this.tacBullets} @change=${(e)=>{this.tacBullets=e.target.checked; this.requestUpdate();}}> Bullets</label>
                                <label><input type="checkbox" .checked=${this.tacStar} @change=${(e)=>{this.tacStar=e.target.checked; this.requestUpdate();}}> STAR</label>
                                <label><input type="checkbox" .checked=${this.tacConversational} @change=${(e)=>{this.tacConversational=e.target.checked; this.requestUpdate();}}> Human Tone</label>
                            </div>
                        </div>

                        <div class="control-row" style="display: flex; width: 100%; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; gap: 8px;">
                                ${this.renderProfileSelector()}
                                ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                    <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); align-items: center; height: 32px; box-sizing: border-box;">
                                        <button class="nav-button" @click=${() => this.changeFontSize(-2)}>A-</button>
                                        <span style="font-size: 11px; color: var(--text-color); padding: 0 6px;">Text Size</span>
                                        <button class="nav-button" @click=${() => this.changeFontSize(2)}>A+</button>
                                    </div>
                                ` : ''}
                            </div>

                            <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
                                <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); align-items: center; height: 32px; box-sizing: border-box;">
                                    <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.localChatIndex <= 0}>◀</button>
                                    <span style="font-size: 11px; color: var(--text-color); font-family: monospace; padding: 0 8px; min-width: 45px; text-align: center;">${this.localChatHistory.length ? `${this.localChatIndex + 1}/${this.localChatHistory.length}` : '0/0'}</span>
                                    <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.localChatIndex >= this.localChatHistory.length - 1}>▶</button>
                                </div>
                            </div>

                            <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                                ${this.isHelpingMode && this.helperStatus === 'connected' ? html`
                                    <button class="action-btn ${this.autoSyncMode ? 'success' : 'danger'}" style="height: 32px; box-sizing: border-box;" @click=${() => { this.autoSyncMode = !this.autoSyncMode; this.requestUpdate(); }}>
                                        ${this.autoSyncMode ? '📡 Auto-Sync: ON' : '🛡️ Auto-Sync: OFF'}
                                    </button>
                                    <button class="action-btn" style="background: rgba(0, 204, 102, 0.15); color: #00cc66; border: 1px solid #00cc66; height: 32px; box-sizing: border-box;" @click=${() => this.transmitCleanPayload(this.localChatHistory[this.localChatIndex], true)}>
                                        🚀 PUSH TO SCREEN
                                    </button>
                                ` : html`
                                    <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); align-items: center; height: 32px; box-sizing: border-box;">
                                        <button class="nav-button" @click=${() => this.changeFontSize(-2)}>A-</button>
                                        <span style="font-size: 11px; color: var(--text-color); padding: 0 6px;">Text Size</span>
                                        <button class="nav-button" @click=${() => this.changeFontSize(2)}>A+</button>
                                    </div>
                                `}
                            </div>
                        </div>
                    ` : html`
                        <div class="control-row">
                            <button class="action-btn" ?disabled=${this.isSolving} @click=${this.handleNewChat}>✨ Reset</button>
                            <button class="action-btn" ?disabled=${this.isSolving} @click=${async () => {
                                this.tacThinkMode = !this.tacThinkMode; this.isSwitchingMode = true; setTimeout(() => { this.isSwitchingMode = false; }, 3000);
                                if(window.require) window.require('electron').ipcRenderer.invoke('set-ai-brain-mode', this.tacThinkMode ? 'think' : 'fast', true);
                                await window.cheatingDaddy.storage.updatePreference('tacThinkMode', this.tacThinkMode); this.requestUpdate();
                            }}>
                                ${this.tacThinkMode ? '🧠 THINK' : '⚡ FAST'}
                            </button>
                            ${this.renderEngineSelector()}
                            ${this.renderLanguageSelector()}
                            <button class="action-btn highlight" ?disabled=${this.isSolving} @click=${this.handleRefactor}>🛠️ Refactor</button>
                            <button class="action-btn ${this.isMicOn ? 'success' : ''}" ?disabled=${this.isSolving} @click=${this.handleToggleMic}>
                                🎙️ Mic: ${this.isMicOn ? 'ON' : 'OFF'}
                            </button>
                        </div>
                        
                        <div class="control-row" style="display: flex; width: 100%; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; gap: 8px;">
                                ${this.renderProfileSelector()}
                            </div>

                            <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
                                <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); align-items: center; height: 32px; box-sizing: border-box;">
                                    <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.localChatIndex <= 0}>◀</button>
                                    <span style="font-size: 11px; color: var(--text-color); font-family: monospace; padding: 0 8px; min-width: 45px; text-align: center;">${this.localChatHistory.length ? `${this.localChatIndex + 1}/${this.localChatHistory.length}` : '0/0'}</span>
                                    <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.localChatIndex >= this.localChatHistory.length - 1}>▶</button>
                                </div>
                            </div>

                            <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                                <div style="display: flex; gap: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px; border: 1px solid var(--border-color); align-items: center; height: 32px; box-sizing: border-box;">
                                    <button class="nav-button" @click=${() => this.changeFontSize(-2)}>A-</button>
                                    <span style="font-size: 11px; color: var(--text-color); padding: 0 6px;">Text Size</span>
                                    <button class="nav-button" @click=${() => this.changeFontSize(2)}>A+</button>
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            </div>

            ${this.modalImage ? html`
                <div class="image-modal" @click=${() => { this.modalImage = null; this.requestUpdate(); }}>
                    <img src=${this.modalImage} @click=${(e) => e.stopPropagation()} />
                </div>
            ` : ''}
        `;
    }
}
customElements.define('assistant-view', AssistantView);