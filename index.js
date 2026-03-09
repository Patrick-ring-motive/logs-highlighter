// ==UserScript==
// @name         Logs Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Highlight Any Logs
// @author       Gemini and Me
// @match        *://*/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js
// @resource     PRISM_CSS https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css
// ==/UserScript==

(function() {
    'use strict';
    console.log('Starting Syntax Higlighter');
    if(location.href.includes('pull-requests?create'))return;
    const fcss = `:focus,focus-visible,:target,:open,:active,:hover,:current`;
    const focusCSS = `${fcss},:has(${fcss}),:focus *,[contenteditable="true"],[contenteditable="true"] *`;
    const matchesNode = (node,css) =>{
        try{
            node = node.nodeName == '#text' ? node.parentElement : node;
            return node.matches(css);
        }catch{
            return false;
        }
    }
    const isFocus = node =>{
        if(matchesNode(node,focusCSS)){
            if(node?.dataset?.touched ?? node?.parentElement?.dataset?.touched) return true;
            (node?.dataset??{}).touched = true;
            (node?.parentElement?.dataset??{}).touched = true;
        }
        return false;
    };
    document.firstElementChild.dataset.origin = location.origin;
    const Q = fn => {
      try {
        return fn?.()
      } catch {}
    };
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const postTask = (callback, options = {}) => scheduler.postTask(callback, {
      priority: "background",
      ...options
    });

    const waitNotBusy = () =>new Promise(async(resolve)=>{
        await sleep(1);
        try{
            await new Promise(r=>postTask(r));
        }catch{}
        await sleep(1);
        try{
            await new Promise(r=>requestIdleCallback(r));
        }catch{}
        await sleep(1);
        try{
            await new Promise(r=>requestAnimationFrame(r));
        }catch{}
        await sleep(1);
        resolve(true);
    });


    // --- Environment detection ---
    const isTampermonkey = typeof GM_addStyle === 'function' && typeof GM_getResourceText === 'function';

    const addStyle = (css) => {
        if (isTampermonkey) {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            style.onerror = e =>console.warn(e);
            document.head.appendChild(style);
        }
    };

    const loadPrism = () => new Promise((resolve) => {
        if (typeof Prism !== 'undefined') return resolve();
        const prismCSS = document.createElement('link');
        Object.defineProperty(prismCSS,'onerror',{
            get:()=>{},
            set:()=>{}
        });
        Object.defineProperty(prismCSS,'onload',{
            get:()=>{},
            set:()=>{}
        });
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css';
       if(!/github\.com/.test(location.href)) document.head.appendChild(prismCSS);

        const prismCore = document.createElement('script');
        prismCore.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        prismCore.onload = () => {
            const prismBash = document.createElement('script');
            prismBash.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js';
            prismBash.onload = resolve;
            document.head.appendChild(prismBash);
        };
        prismCore.onerror = e =>console.warn(e);
       if(!/github\.com/.test(location.href)) document.head.appendChild(prismCore);
    });

    if (isTampermonkey) {
        addStyle(GM_getResourceText('PRISM_CSS'));
    } else {
        loadPrism();
    }

    const textShadow = `rgba(0,0,0,1)`;
    addStyle(`
        pre.console-output, .log-viewer-container {
            background: #1a1a1a !important;
            color: #eeeeee !important;
            padding: 15px !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
            line-height: 1.5 !important;
        }
        .non-alpha {
            color: #00ff00 !important;
            text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow};
        }
        .sym-paren  { color: #ffff00 !important; } /* ( )  — yellow */
        .sym-curly  { color: #ff79c6 !important; } /* { }  — pink   */
        .sym-square { color: #ba7dff !important; } /* [ ]  — purple   */
        .sym-quote  { color: #ffff00 !important; } /* ' " \` — yellow */
        .sym-paren, .sym-curly, .sym-square, .sym-quote {
            text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow};
        }
        .highlight-nums {
            color: deepskyblue !important;
            text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow};
        }
       :is(a,a *):has(.highlight-nums,.non-alpha,.sym-paren,.sym-curly,.sym-square,.sym-quote),
       :is(a,a *):has(.highlight-nums,.non-alpha,.sym-paren,.sym-curly,.sym-square,.sym-quote) :not(.highlight-nums,.non-alpha,.sym-paren,.sym-curly,.sym-square,.sym-quote){
            color: #5fe6ff !important;
            text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow};
            --background-image: linear-gradient(lightgrey, lightgrey), url("your-image.png");
            background-blend-mode: darken !important;
            white-space:nowrap;
        }
        .token.string { color: #e6db74 !important; }
        .token.comment { color: #75715e !important; }
        code,pre>code[class*=language-]{
          color: powderblue !important;
          text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow} !important;
        }
        html:not([class*="dark"]) code{
          background-image: linear-gradient(lightgrey, lightgrey), url("your-image.png");
          background-blend-mode: darken;
        }

        code span{
          --display:block !important;
        }

    `);

    // Returns true if the color is approximately achromatic (white, black, or grey)
    const isAchromatic = (el) => {
        if (!el) {
           // console.log(el);
            return false;
        }
        const color = getComputedStyle(el).color;
        //console.log(color);
        // oklch(L C H) — achromatic when chroma C is near 0
        const oklchMatch = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
        if (oklchMatch) {
            const chroma = parseFloat(oklchMatch[2]);
            return chroma < 0.08;
        }

        // rgb/rgba — achromatic when R ≈ G ≈ B (each within 80% of the next)
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const channels = rgbMatch.slice(1).map(Number).sort((a, b) => b - a); // [high, mid, low]
            const [high, mid, low] = channels;
            if (high === 0) return true; // pure black
            return (mid / high) >= 0.8 && (low / (mid || 1)) >= 0.8;
        }

        return false;
    };

    // Decoupled Symbol Highlighter
    const glowSymbols = (root) => {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;

        while (node = walker.nextNode()) {
            // Avoid re-processing or breaking scripts/styles
            const parent = node.parentElement;
            if (parent?.tagName === 'SCRIPT'
             || parent?.tagName === 'STYLE'
             || parent?.classList?.contains?.('non-alpha')
             || matchesNode(node,`[contenteditable="true"],[contenteditable="true"] *`)
             || isFocus(node)) continue;
            nodes.push(node);
        }



            const regex = /([^a-zA-Z0-9\s])/g;
            const numRegex = /([0-9]+)/g;
            const bkColor = `rgba(255,255,255,0.0)`;
            const symClass = (ch) => {
                if ('()'.includes(ch))       return 'sym-paren';
                if ('{}'.includes(ch))       return 'sym-curly';
                if ('[]'.includes(ch))       return 'sym-square';
                if (`'"\`‘’“”`.includes(ch)) return 'sym-quote';
                return 'non-alpha';
            };

        nodes.forEach(textNode => {
            // Pretty-print JSON if the text looks like a JSON object or array
            const trimmed = textNode.nodeValue.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                try {
                    const parsed = JSON.parse(trimmed);
                    const pretty = JSON.stringify(parsed, null, 2);
                    if (pretty !== trimmed) {
                        textNode.nodeValue = pretty;
                    }
                } catch {}
            }

            const text = String(textNode.nodeValue).normalize('NFD');
            // Skip nodes whose computed text color is white, black, or grey
            // if (textNode.parentElement.tagName !== 'A' && !isAchromatic(textNode.parentElement)) return;
            if (regex.test(text)) {
              //  (textNode.parentElement?.style??{}).backgroundColor = bkColor;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                let hasChanges = false;
                regex.lastIndex = 0;
                if(textNode.parentElement.dataset.colored)return;
                while ((match = regex.exec(text)) !== null) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    const span = document.createElement('span');
                    span.dataset.colored = true;
                    span.className = symClass(match[0]);
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    lastIndex = regex.lastIndex;
                    hasChanges = true;
                    if(!textNode.parentElement.matches(':has(.pipeline-new-node),td,td *,[style*="relative"] *')
                       && !textNode.parentElement.matches(focusCSS)
                       && !String(textNode.parentElement.className).includes('token')){
                        //textNode.parentElement.style.display = 'block';
                    }
                }
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));

                // Only replace if changes were actually made
                if (hasChanges) {
                    textNode.replaceWith(fragment);
                }
            }


            if (numRegex.test(text) && !/highlight-nums|number/.test(textNode?.parentElement?.className)) {
              //  (textNode.parentElement?.style??{}).backgroundColor = bkColor;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                let hasChanges = false;
                numRegex.lastIndex = 0;

                while ((match = numRegex.exec(text)) !== null) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    const span = document.createElement('span');
                    span.className = 'highlight-nums';
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    lastIndex = numRegex.lastIndex;
                    hasChanges = true;
                }
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));

                // Only replace if changes were actually made
                if (hasChanges) {
                    textNode.replaceWith(fragment);
                }
            }
        });
    };

    const applyPrism = async (el) => {
        if (!el || (el.dataset.prismDone && el.querySelector('.token'))) return;
        console.log("Applying Prism Syntax Highlighting...");

        const codeElement = document.createElement('code');
        codeElement.className = 'language-bash';
        codeElement.textContent = el.innerText;
        el.innerHTML = '';
        el.appendChild(codeElement);

        await Prism.highlightElement(codeElement);
        el.dataset.prismDone = "true";
    };

    const runEnhancement = async () => {
        //console.log("Running Enhancements...");

        // 1. Logic for Prism (Limited to specific console blocks)
        const consolePre = document.querySelector('pre.console-output');
        if (consolePre) {
            await applyPrism(consolePre);
        }

        // 2. Logic for GlowSymbols (Broadly applied, including Shadow DOM)
        // Find all possible containers
        const targets = [
           // document.body,
            ...document.querySelectorAll('code,[class*="log-viewer"],.yaml-editor,.CodeMirror-lines,pre,html:not([data-origin*="jenkins"]) a,time,td'),
            document.querySelector('cloudbees-log-viewer-main'),
            document.querySelector('.log-viewer-container')
        ].filter(Boolean);


        targets.forEach(target => {
            // Process the target itself (and its ShadowRoot if it exists)
            if (target.shadowRoot) glowSymbols(target.shadowRoot);
            glowSymbols(target);

            // Process any nested ShadowRoots
            target.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) glowSymbols(el.shadowRoot);
            });
        });
    };
    const interval = 500;
    let lastRun = Date.now();
    runEnhancement();
    window.addEventListener('load', async() => {
        const btn = document.createElement('button');
        btn.innerHTML = '🟢 Glow';
        btn.style = 'position:fixed; top:10px; right:10px; z-index:10000; padding:10px; background:#222; color:#00ff00; border:1px solid #00ff00; cursor:pointer; font-weight:bold; border-radius: 5px;';
        btn.onclick = runEnhancement;
        //document.body.appendChild(btn);
        await runEnhancement();
        while(true){
            await waitNotBusy();
            if(document.visibilityState === 'visible'
               && document.hidden !== true
               && document.readyState === 'complete'
               && window.opener?.closed !== true
               && window.outerHeight > 0
               && screen.availHeight > 0){
                if(Date.now() - lastRun > interval){
                    lastRun = Date.now();
                    await runEnhancement();
                }
            }
            await sleep(interval);
        }
    });
})();
