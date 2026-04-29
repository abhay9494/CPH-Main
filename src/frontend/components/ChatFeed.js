import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ChatFeed extends LitElement {
    static styles = css`
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default !important; user-select: text; }
        
        .markdown-body { 
            width: 100%; 
            padding: calc(50vh - 100px) 25px; 
            font-size: var(--response-font-size, 13px); 
            line-height: 1.6; color: var(--text-color); 
            overflow-x: hidden; word-wrap: break-word; 
            min-height: 100%;
        }
        .markdown-body br { display: none; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { margin: 1em 0 0.5em 0; color: var(--text-color); font-weight: 600; }
        .markdown-body p { margin: 0.8em 0; }
        
        /* Image Grid Fixes */
        .markdown-body p:has(img) {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px; margin-top: 15px; margin-bottom: 15px; padding: 10px;
            background: rgba(0,0,0,0.15); border-radius: 6px;
        }
        .markdown-body img { 
            width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--border-color, #444); 
            cursor: pointer !important; margin: 0; transition: 0.2s ease-in-out; box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
            object-fit: cover; aspect-ratio: 16/9; 
        }
        .markdown-body img:hover { opacity: 0.8; transform: scale(1.05); }

        /* Code Blocks */
        .code-block-wrapper { background: var(--bg-secondary); border: 1px solid var(--border-color, #333); border-radius: 6px; margin-bottom: 15px; overflow: hidden; position: relative; }
        .code-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 5px 10px; border-bottom: 1px solid var(--border-color, #333); }
        .lang-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: bold; }
        .copy-code-btn, .type-code-btn { background: transparent; border: 1px solid #555; color: #ccc; padding: 3px 8px; border-radius: 4px; font-size: 11px; transition: 0.2s; margin-left: 5px; cursor: default !important; }
        .copy-code-btn:hover, .type-code-btn:hover { background: var(--bg-hover); color: #fff; }
        .code-block-wrapper pre { margin: 0; padding: 15px; overflow-x: hidden; white-space: pre-wrap; word-wrap: break-word; }
        .code-block-wrapper pre code { background: transparent; padding: 0; border-radius: 0; white-space: pre-wrap; }

        /* Image Modal */
        .image-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 40px; cursor: default !important; backdrop-filter: blur(5px); }
        .image-modal img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); object-fit: contain; aspect-ratio: auto !important; cursor: default !important; }
    `;

    static properties = {
        content: { type: String },
        modalImage: { type: String }
    };

    constructor() {
        super();
        this.content = '';
        this.modalImage = null;
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
            } catch (e) { console.error("Markdown Parser Error:", e); }
        }
        return `<pre style="white-space: pre-wrap; margin: 0;">${text}</pre>`; 
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
            // Blast an event up to the parent View to switch into Typer Mode!
            this.dispatchEvent(new CustomEvent('trigger-typer', { detail: rawCode, bubbles: true, composed: true }));
        }
    }

    render() {
        return html`
            <div class="markdown-body" @click=${this.handleMarkdownClick} .innerHTML=${this.renderMarkdown(this.content)}></div>
            ${this.modalImage ? html`
                <div class="image-modal" @click=${() => { this.modalImage = null; this.requestUpdate(); }}>
                    <img src=${this.modalImage} @click=${(e) => e.stopPropagation()} />
                </div>
            ` : ''}
        `;
    }
}
customElements.define('chat-feed', ChatFeed);