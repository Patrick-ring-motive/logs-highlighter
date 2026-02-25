// ==UserScript==
// @name         Logs Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Higlight Any Logs
// @author       Gemini and Me
// @match        https://*/*
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js
// @resource     PRISM_CSS https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css
// ==/UserScript==

(function() {
    'use strict';
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
            document.head.appendChild(style);
        }
    };

    const loadPrism = () => new Promise((resolve) => {
        if (typeof Prism !== 'undefined') return resolve();
        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css';
        document.head.appendChild(prismCSS);

        const prismCore = document.createElement('script');
        prismCore.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        prismCore.onload = () => {
            const prismBash = document.createElement('script');
            prismBash.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js';
            prismBash.onload = resolve;
            document.head.appendChild(prismBash);
        };
        document.head.appendChild(prismCore);
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
        .highlight-nums {
            color: deepskyblue !important;
            text-shadow:
              -1px -1px 0 ${textShadow},
               1px -1px 0 ${textShadow},
              -1px  1px 0 ${textShadow},
               1px  1px 0 ${textShadow};
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
        code{
          background-image: linear-gradient(lightgrey, lightgrey), url("your-image.png");
          background-blend-mode: darken;
        }

        code span{
          --display:block !important;
        }

    `);

    // Decoupled Symbol Highlighter
    const glowSymbols = (root) => {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        const nodes = [];
        let node;

        while (node = walker.nextNode()) {
            // Avoid re-processing or breaking scripts/styles
            const parent = node.parentElement;
            if (parent?.tagName === 'SCRIPT' || parent?.tagName === 'STYLE' || parent?.classList.contains('non-alpha')) continue;
            nodes.push(node);
        }



            const regex = /([^a-zA-Z0-9\s])/g;
            const numRegex = /([0-9]+)/g;
            const bkColor = `rgba(255,255,255,0.0)`;

        nodes.forEach(textNode => {
            const text = textNode.nodeValue;
            if (regex.test(text)) {
              //  (textNode.parentElement?.style??{}).backgroundColor = bkColor;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                let hasChanges = false;
                regex.lastIndex = 0;

                while ((match = regex.exec(text)) !== null) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    const span = document.createElement('span');
                    span.className = 'non-alpha';
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    lastIndex = regex.lastIndex;
                    hasChanges = true;
                    textNode.parentElement.style.display = 'block';
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
