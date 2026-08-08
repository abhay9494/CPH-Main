import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class LayoutEditor extends LitElement {
    static styles = css`
        * { box-sizing: border-box; user-select: none; font-family: 'Inter', sans-serif; cursor: default; }
        :host {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85); /* Semi-transparent to hide hub but still feel like an overlay */
            z-index: 99999;
            overflow: hidden;
            display: block;
            -webkit-app-region: no-drag;
        }

        .center-line-h { position: absolute; left: 0; top: 50%; width: 100%; border-top: 2px dashed #a142f4; z-index: 1; pointer-events: none; transition: border-color 0.2s; }
        .center-line-v { position: absolute; top: 0; left: 50%; height: 100%; border-left: 2px dashed #a142f4; z-index: 1; pointer-events: none; transition: border-color 0.2s; }
        .center-line-h.green, .center-line-v.green { border-color: #00cc66; }

        .control-panel {
            position: absolute; top: 20px; left: 20px;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #444; border-radius: 8px;
            padding: 15px; z-index: 10000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            width: 250px;
        }
        .control-panel h3 { margin: 0 0 15px 0; color: white; font-size: 14px; }
        .pane-toggle {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 10px; padding: 8px; background: rgba(0,0,0,0.3);
            border-radius: 4px; border: 1px solid #333; cursor: default;
        }
        .pane-toggle.active { border-color: #4285f4; background: rgba(66, 133, 244, 0.1); }
        .pane-toggle input { cursor: default; }
        .btn-save {
            width: 100%; padding: 10px; background: #00cc66; color: black;
            border: none; border-radius: 4px; font-weight: bold; cursor: default;
            margin-top: 10px; transition: 0.2s;
        }
        .btn-save:hover { background: #00e673; }

        .proxy-box {
            position: absolute;
            background: rgba(40, 40, 40, 0.9);
            border: 2px solid #555;
            border-radius: 8px;
            z-index: 10;
            display: flex; flex-direction: column;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .proxy-box.selected { border-color: #4285f4; z-index: 20; box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.4); }
        
        .proxy-header { padding: 8px 12px; font-weight: bold; font-size: 12px; border-bottom: 1px solid #555; display: flex; align-items: center; gap: 8px; pointer-events: none; }
        .proxy-content { flex: 1; padding: 12px; font-size: 11px; color: #aaa; pointer-events: none; display: flex; align-items: center; justify-content: center; text-align: center; }
        
        /* Draggable handle */
        .proxy-drag-area { position: absolute; inset: 0; bottom: 20px; cursor: move; }
        
        /* Resize handle */
        .proxy-resize-area {
            position: absolute; bottom: 0; right: 0; width: 20px; height: 20px;
            cursor: se-resize;
            background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%);
        }

        .code-theme .proxy-header { background: rgba(66, 133, 244, 0.2); color: #4285f4; }
        .voice-theme .proxy-header { background: rgba(161, 66, 244, 0.2); color: #a142f4; }
        .meet-theme .proxy-header { background: rgba(0, 204, 102, 0.2); color: #00cc66; }
        .widget-theme .proxy-header { background: rgba(255, 165, 0, 0.2); color: orange; }
    `;

    static properties = {
        prefs: { type: Object },
        state: { type: Object },
        isHCenter: { type: Boolean },
        isVCenter: { type: Boolean }
    };

    constructor() {
        super();
        this.prefs = {};
        // Local state representation of windows.
        this.state = {
            code: { enabled: false, x: 1, y: 7, w: 48, h: 85 },
            voice: { enabled: false, x: 51, y: 7, w: 48, h: 85 },
            meet: { enabled: false, x: 25, y: 10, w: 50, h: 28 },
            widget: { enabled: false, x: 5, y: 80, w: 90, h: 20 },
            activeId: null
        };
        this.isHCenter = false;
        this.isVCenter = false;
        
        this.dragData = null; // { id, mode: 'move'|'resize', startX, startY, initX, initY, initW, initH }
        
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        // Init state from prefs
        const p = this.prefs || {};
        this.state.code = { ...this.state.code, x: p.codeX ?? 1, y: p.codeY ?? 7, w: p.codeW ?? 48, h: p.codeH ?? 85 };
        this.state.voice = { ...this.state.voice, x: p.voiceX ?? 51, y: p.voiceY ?? 7, w: p.voiceW ?? 48, h: p.voiceH ?? 85 };
        this.state.meet = { ...this.state.meet, x: p.meetX ?? 25, y: p.meetY ?? 10, w: p.meetW ?? 50, h: p.meetH ?? 28 };
        this.state.widget = { ...this.state.widget, x: p.widgetX ?? 5, y: p.widgetY ?? 80, w: p.widgetW ?? 90, h: p.widgetH ?? 20 };

        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleKeyDown(e) {
        const id = this.state.activeId;
        if (!id || !this.state[id].enabled) return;
        
        const box = this.state[id];
        let moved = false;
        const step = 1; // 1%

        if (e.shiftKey) { // Resize
            if (e.key === 'ArrowRight') { box.w = Math.min(100, box.w + step); moved = true; }
            if (e.key === 'ArrowLeft') { box.w = Math.max(5, box.w - step); moved = true; }
            if (e.key === 'ArrowDown') { box.h = Math.min(100, box.h + step); moved = true; }
            if (e.key === 'ArrowUp') { box.h = Math.max(5, box.h - step); moved = true; }
        } else { // Move
            if (e.key === 'ArrowRight') { box.x = Math.min(100 - box.w, box.x + step); moved = true; }
            if (e.key === 'ArrowLeft') { box.x = Math.max(0, box.x - step); moved = true; }
            if (e.key === 'ArrowDown') { box.y = Math.min(100 - box.h, box.y + step); moved = true; }
            if (e.key === 'ArrowUp') { box.y = Math.max(0, box.y - step); moved = true; }
        }

        if (moved) {
            e.preventDefault();
            this.state = { ...this.state };
            this.checkCenter(box);
            this.requestUpdate();
        }
    }

    handlePointerDown(e, id, mode) {
        this.state.activeId = id;
        this.dragData = {
            id, mode,
            startX: e.clientX, startY: e.clientY,
            initX: this.state[id].x, initY: this.state[id].y,
            initW: this.state[id].w, initH: this.state[id].h
        };
        this.state = { ...this.state }; // trigger render
        this.requestUpdate();
    }

    handlePointerMove(e) {
        if (!this.dragData) return;
        const { id, mode, startX, startY, initX, initY, initW, initH } = this.dragData;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const sw = window.innerWidth;
        const sh = window.innerHeight;
        const dxPct = (dx / sw) * 100;
        const dyPct = (dy / sh) * 100;

        const box = this.state[id];

        if (mode === 'move') {
            box.x = Math.max(0, Math.min(100 - box.w, initX + dxPct));
            box.y = Math.max(0, Math.min(100 - box.h, initY + dyPct));
            this.checkCenter(box);
        } else if (mode === 'resize') {
            box.w = Math.max(5, Math.min(100 - box.x, initW + dxPct));
            box.h = Math.max(5, Math.min(100 - box.y, initH + dyPct));
        }

        this.state = { ...this.state };
        this.requestUpdate();
    }

    handlePointerUp() {
        this.dragData = null;
        this.isHCenter = false;
        this.isVCenter = false;
        this.requestUpdate();
    }

    checkCenter(box) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        
        // Snap to center horizontally (50%)
        if (Math.abs(cx - 50) < 1.5) {
            box.x = 50 - box.w / 2;
            this.isVCenter = true; // Vertical line turns green
        } else {
            this.isVCenter = false;
        }

        // Snap to center vertically (50%)
        if (Math.abs(cy - 50) < 1.5) {
            box.y = 50 - box.h / 2;
            this.isHCenter = true; // Horizontal line turns green
        } else {
            this.isHCenter = false;
        }
    }

    togglePane(id) {
        this.state[id].enabled = !this.state[id].enabled;
        if (this.state[id].enabled) this.state.activeId = id;
        this.state = { ...this.state };
        this.requestUpdate();
    }

    saveAndExit() {
        const p = this.prefs;
        const s = this.state;
        const newPrefs = {
            ...p,
            codeX: Math.round(s.code.x), codeY: Math.round(s.code.y), codeW: Math.round(s.code.w), codeH: Math.round(s.code.h),
            voiceX: Math.round(s.voice.x), voiceY: Math.round(s.voice.y), voiceW: Math.round(s.voice.w), voiceH: Math.round(s.voice.h),
            meetX: Math.round(s.meet.x), meetY: Math.round(s.meet.y), meetW: Math.round(s.meet.w), meetH: Math.round(s.meet.h),
            widgetX: Math.round(s.widget.x), widgetY: Math.round(s.widget.y), widgetW: Math.round(s.widget.w), widgetH: Math.round(s.widget.h)
        };
        this.dispatchEvent(new CustomEvent('save', { detail: newPrefs }));
    }

    renderProxy(id, label, icon, theme, details) {
        const box = this.state[id];
        if (!box.enabled) return '';
        return html`
            <div class="proxy-box ${theme} ${this.state.activeId === id ? 'selected' : ''}" 
                 style="left: ${box.x}%; top: ${box.y}%; width: ${box.w}%; height: ${box.h}%;"
                 @pointerdown=${(e) => { e.stopPropagation(); this.state.activeId = id; this.requestUpdate(); }}>
                
                <div class="proxy-header">
                    <span>${icon}</span>
                    <span>${label}</span>
                    <span style="margin-left: auto; color: white;">[${Math.round(box.x)}%, ${Math.round(box.y)}%] ${Math.round(box.w)}% x ${Math.round(box.h)}%</span>
                </div>
                
                <div class="proxy-content">
                    <div>
                        <div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
                        <div>${details}</div>
                        <div style="margin-top: 8px; font-size: 10px; color: #888;">Drag body to move. Drag bottom-right corner to resize.</div>
                    </div>
                </div>

                <div class="proxy-drag-area" @pointerdown=${(e) => { e.preventDefault(); this.handlePointerDown(e, id, 'move'); }}></div>
                <div class="proxy-resize-area" @pointerdown=${(e) => { e.preventDefault(); e.stopPropagation(); this.handlePointerDown(e, id, 'resize'); }}></div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="center-line-h ${this.isHCenter ? 'green' : ''}"></div>
            <div class="center-line-v ${this.isVCenter ? 'green' : ''}"></div>

            <div class="control-panel">
                <h3>📐 Visual Layout Editor</h3>
                
                ${[
                    {id: 'code', label: '💻 Code Brain AI'},
                    {id: 'voice', label: '🗣️ Voice Brain AI'},
                    {id: 'meet', label: '🎥 Google Meet'},
                    {id: 'widget', label: '⚡ Instant Widget'}
                ].map(p => html`
                    <div class="pane-toggle ${this.state[p.id].enabled ? 'active' : ''}" @click=${() => this.togglePane(p.id)}>
                        <span>${p.label}</span>
                        <input type="checkbox" .checked=${this.state[p.id].enabled} @click=${(e) => e.stopPropagation() || this.togglePane(p.id)}>
                    </div>
                `)}

                <div style="font-size: 10px; color: #aaa; margin: 10px 0;">
                    Select a box to preview it. Use your mouse to drag/resize, or click a box and use Arrow keys to nudge (Hold Shift to resize).
                </div>
                
                <button class="btn-save" @click=${this.saveAndExit}>💾 Save & Exit</button>
            </div>

            ${this.renderProxy('code', 'Code Brain', '💻', 'code-theme', 'ChatGPT / Gemini Proxy View')}
            ${this.renderProxy('voice', 'Voice Brain', '🗣️', 'voice-theme', 'ChatGPT / Gemini Proxy View')}
            ${this.renderProxy('meet', 'Google Meet', '🎥', 'meet-theme', 'Meet Webview Proxy')}
            ${this.renderProxy('widget', 'Instant Widget', '⚡', 'widget-theme', 'Widget Controller Proxy')}
        `;
    }
}
customElements.define('layout-editor', LayoutEditor);
