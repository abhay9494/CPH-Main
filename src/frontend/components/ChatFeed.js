import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ChatFeed extends LitElement {
    static styles = css`
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; cursor: default !important; user-select: text; }
        
        .markdown-body { 
            width: 100%; 
            padding: 10px 15px; 
            font-size: var(--response-font-size, 14px); 
            line-height: 1.7; color: var(--text-color, #e0e0e0); 
            overflow-x: hidden; word-wrap: break-word; 
            min-height: 100%;
        }
        
        /* 🟢 Colored Explanations & Headers */
        .markdown-body h1, .markdown-body h2 { margin: 1.5em 0 0.5em 0; color: #fff; font-weight: 700; }
        .markdown-body h3 { 
            color: #4285f4; /* Google Blue for your Read-Aloud Headers */
            border-bottom: 1px solid rgba(66, 133, 244, 0.3);
            padding-bottom: 5px;
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            font-weight: 600;
        }
        .markdown-body h4 { color: #a142f4; margin-top: 1.2em; font-weight: 600; } 
        .markdown-body p { margin: 0 0 1.2em 0; }

        /* 🟢 Core Typography & Lists */
        .markdown-body strong { color: #ffffff; font-weight: 700; background: rgba(255,255,255,0.05); padding: 0 4px; border-radius: 4px; }
        
        .markdown-body ul, .markdown-body ol { 
            padding-left: 1.5rem; 
            margin-top: 0.5rem; 
            margin-bottom: 1.5rem; 
        }
        .markdown-body li { 
            margin-bottom: 0.6rem; 
            line-height: 1.7;
            padding-left: 0.25rem;
        }
        .markdown-body li::marker { color: #4285f4; font-weight: bold; } 
        
        /* 🟢 Glowing Complexity Badges (Time/Space & Inline Variables) */
        .markdown-body p code, .markdown-body li code, .markdown-body td code, code.big-o-badge { 
            background: rgba(161, 66, 244, 0.2) !important; 
            color: #d8b4fe !important; /* Bright glowing purple */
            padding: 0.25em 0.6em !important; 
            border-radius: 6px !important; 
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important; 
            font-size: 0.9em !important; 
            font-weight: 700 !important;
            border: 1px solid rgba(161, 66, 244, 0.4) !important;
            word-break: break-word !important;
            box-shadow: 0 0 8px rgba(161, 66, 244, 0.2) !important;
        }

        /* 🟢 NEW: Pulls the exponent tight against the letter and elevates it perfectly */
        code.big-o-badge sup {
            font-size: 0.75em !important;
            line-height: 0 !important;
            vertical-align: super !important;
            margin-left: 1px !important;
        }

        /* 🟢 Tables */
        .markdown-body table {
            width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 13px;
            border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
        }
        .markdown-body th, .markdown-body td { border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding: 10px 14px; text-align: left; }
        .markdown-body th { background: rgba(66, 133, 244, 0.15); color: #8ab4f8; font-weight: 600; }
        .markdown-body tr:last-child td { border-bottom: none; }
        .markdown-body tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }

        /* 🟢 Image Grid Fixes */
        .markdown-body p:has(img) {
            display: grid; grid-template-columns: repeat(5, 1fr);
            gap: 12px; margin-top: 15px; margin-bottom: 15px; padding: 10px;
            background: rgba(0,0,0,0.15); border-radius: 6px;
        }
        .markdown-body img { 
            width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--border-color, #444); 
            cursor: pointer !important; margin: 0; transition: 0.2s ease-in-out; box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
            object-fit: cover; aspect-ratio: 16/9; 
        }

        /* ========================================================= */
        /* 🟢 TRANSLUCENT CODE BLOCKS (Obeys App Opacity)            */
        /* ========================================================= */
        .code-block-wrapper { 
            background: rgba(0, 0, 0, 0.4) !important; /* Translucent Base */
            backdrop-filter: blur(10px); /* Glassmorphism effect */
            border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 8px; 
            margin-bottom: 20px; 
            overflow: hidden; 
            position: relative; 
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        .code-header { 
            display: flex; justify-content: space-between; align-items: center; 
            background: rgba(0, 0, 0, 0.3) !important; /* Darker translucent header */
            padding: 8px 12px; 
            border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
        }
        .lang-label { font-size: 11px; color: #4ec9b0; text-transform: uppercase; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
        .copy-code-btn, .type-code-btn { 
            background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #ccc; 
            padding: 4px 8px; border-radius: 4px; font-size: 11px; transition: 0.2s; 
            margin-left: 5px; cursor: default !important; font-family: 'Inter', sans-serif;
        }
        .copy-code-btn:hover, .type-code-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
        
        .code-block-wrapper pre { 
            margin: 0 !important; padding: 16px !important; 
            overflow-x: hidden !important; /* Kills horizontal scrollbar */
            white-space: pre-wrap !important; /* Forces text wrapping */
            word-wrap: break-word !important; 
            overflow-wrap: anywhere !important; /* 🟢 FIX: Forces hard wrapping to prevent horizontal scroll */
            background: transparent !important; /* Lets wrapper translucency show */
        }
        
        .code-block-wrapper pre code, .code-block-wrapper pre code.hljs { 
            display: block !important;
            background: transparent !important; padding: 0 !important; border-radius: 0 !important; 
            white-space: pre-wrap !important; 
            word-break: break-word !important;
            color: #d4d4d4 !important; /* Base white/gray text */
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important; 
            font-size: 13px !important; line-height: 1.6 !important; border: none !important;
        }

        /* ========================================================= */
        /* 🟢 EXACT VS CODE DARK+ SYNTAX HIGHLIGHTING                */
        /* ========================================================= */
        .hljs-keyword, .hljs-keyword.control-flow, .hljs-template-tag { color: #c586c0 !important; } /* Purple: if, return, import */
        .hljs-type, .hljs-built_in, .hljs-class .hljs-title, .hljs-title.class_ { color: #4ec9b0 !important; } /* Teal: Classes, Types */
        .hljs-string, .hljs-doctag, .hljs-regexp { color: #ce9178 !important; } /* Orange: Strings */
        .hljs-title, .hljs-title.function_, .hljs-function .hljs-title { color: #dcdcaa !important; } /* Yellow: Functions */
        .hljs-number, .hljs-symbol, .hljs-bullet { color: #b5cea8 !important; } /* Light Green: Numbers */
        .hljs-comment, .hljs-quote { color: #6a9955 !important; font-style: italic !important; } /* Muted Green: Comments */
        .hljs-variable, .hljs-template-variable, .hljs-attribute, .hljs-property, .hljs-params, .hljs-attr { color: #9cdcfe !important; } /* Light Blue: Variables, Params */
        .hljs-meta, .hljs-meta .hljs-keyword { color: #c586c0 !important; } /* Purple: Meta */
        .hljs-literal, .hljs-tag, .hljs-name, .hljs-selector-tag { color: #569cd6 !important; } /* Blue: true, false, const, html tags */
        .hljs-operator, .hljs-punctuation { color: #d4d4d4 !important; } /* Gray: Brackets, equal signs */

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

    async connectedCallback() {
        super.connectedCallback();
        await this.ensureDependencies();
    }

    async ensureDependencies() {
        const loadScript = (src, checkVar) => {
            return new Promise((resolve) => {
                if (window[checkVar]) return resolve(); // Already loaded in memory
                
                // If it's currently downloading, just wait for it
                if (document.querySelector(`script[src="${src}"]`)) {
                    let interval = setInterval(() => {
                        if (window[checkVar]) { clearInterval(interval); resolve(); }
                    }, 50);
                    return;
                }
                
                // Otherwise, inject it straight into the app's hidden DOM
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = () => { console.error(`Failed to load ${src}`); resolve(); };
                document.head.appendChild(script);
            });
        };

        // Fetch the exact local files sitting right there in your assets folder!
        await loadScript('./assets/marked-4.3.0.min.js', 'marked');
        await loadScript('./assets/highlight-11.9.0.min.js', 'hljs');
        
        // Force the UI to instantly repaint the code with the VS Code colors
        this.requestUpdate();
    }

    renderMarkdown(text) {
        if (!text) return '';

        let processedText = text;
        
        processedText = processedText.replace(/\[CODE_START.*?\]\s*```[a-zA-Z]*/gi, '[CODE_START]\n');
        processedText = processedText.replace(/```\s*\[CODE_END\]/gi, '\n[CODE_END]');

        // Convert the custom markers back into Markdown code blocks so the parser catches them
        processedText = processedText.replace(/\[CODE_START.*?\]/gi, '\n```\n');
        processedText = processedText.replace(/\[CODE_END\]/gi, '\n```\n');

        // 🟢 2. AUTO-FORMATTER: Safely format Big-O notation and fix ugly monospace superscripts
        // First, strip existing backticks around Big-O just in case the AI already added them
        processedText = processedText.replace(/`\s*(O\([^\)]+\))\s*`/gi, '$1'); 
        
        // Next, intercept the math and inject beautiful HTML superscripts
        processedText = processedText.replace(/\b(O\([^\)]+\))/gi, (match) => {
            let formatted = match
                .replace(/\^([a-zA-Z0-9]+)/g, '<sup>$1</sup>') // Catches ^2, ^N, etc.
                .replace(/\^\(([^\)]+)\)/g, '<sup>$1</sup>')   // Catches ^(2)
                .replace(/²/g, '<sup>2</sup>')                 // Catches Unicode ²
                .replace(/³/g, '<sup>3</sup>')                 // Catches Unicode ³
                .replace(/ⁿ/gi, '<sup>n</sup>');               // Catches Unicode ⁿ
            
            // Wrap it in our custom glowing badge class!
            return `<code class="big-o-badge">${formatted}</code>`;
        });

        if (window.marked && window.hljs) {
            try {
                const renderer = new window.marked.Renderer();
                renderer.code = function(code, language) {
                    const codeStr = typeof code === 'object' ? (code.text || '') : (code || '');
                    const langStr = typeof code === 'object' ? (code.lang || '') : (language || '');
                    const langName = langStr.toLowerCase();
                    
                    let highlighted = codeStr;
                    let displayLang = langName || 'code';
                    
                    if (window.hljs) {
                        try {
                            if (langName && window.hljs.getLanguage(langName)) {
                                highlighted = window.hljs.highlight(codeStr, { language: langName }).value;
                            } else {
                                // 🟢 FORCE AUTO-COLORING: If the AI forgets 'cpp', highlight.js will guess and color it anyway!
                                const auto = window.hljs.highlightAuto(codeStr);
                                highlighted = auto.value;
                                displayLang = auto.language || 'code';
                            }
                        } catch (e) { 
                            highlighted = codeStr.replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
                        }
                    }

                    const encodedCode = encodeURIComponent(codeStr); 
                    
                    return `
                        <div class="code-block-wrapper">
                            <div class="code-header">
                                <span class="lang-label">${displayLang}</span>
                                <div>
                                    <button class="type-code-btn" data-code="${encodedCode}">⌨️ Type</button>
                                    <button class="copy-code-btn" data-code="${encodedCode}">📋 Copy</button>
                                </div>
                            </div>
                            <pre><code class="hljs">${highlighted}</code></pre>
                        </div>`;
                };

                const markedOptions = { 
                    renderer: renderer, 
                    breaks: true, 
                    gfm: true
                };

                if (typeof window.marked.parse === 'function') {
                    return window.marked.parse(processedText, markedOptions);
                } else { 
                    window.marked.setOptions(markedOptions); 
                    return window.marked(processedText); 
                }
                
            } catch (e) { console.error("Markdown Parser Error:", e); }
        }
        return `<pre style="white-space: pre-wrap; margin: 0; font-family: inherit;">${processedText}</pre>`; 
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
            <!-- 🟢 INJECT VS CODE DARK+ THEME DIRECTLY INTO SHADOW DOM -->
            <link rel="stylesheet" href="./assets/highlight-vscode-dark.min.css">
            
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