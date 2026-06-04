// ==UserScript==
// @name         Logs Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.8
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
  "use strict";

  const globalStore = new Proxy({}, {
    get(_, key) {
      const val = localStorage.getItem(key);
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    },
    set(_, key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    },
    deleteProperty(_, key) {
      localStorage.removeItem(key);
      return true;
    },
    has(_, key) {
      return localStorage.getItem(key) !== null;
    },
    ownKeys() {
      return Object.keys(localStorage);
    },
    getOwnPropertyDescriptor(_, key) {
      if (localStorage.getItem(key) === null) return undefined;
      return {
        enumerable: true,
        configurable: true,
        writable: true
      };
    }
  });

  console.log("Starting Syntax Highlighter");
  if (location.href.includes("pull-requests?create")) return;

  const fcss = `:focus,focus-visible,:target,:open,:active,:current`;
  const focusCSS = `${fcss},:has(${fcss}),:focus *,[contenteditable="true"],[contenteditable="true"] *`;

  const matchesNode = (node, css) => {
    try {
      node = node.nodeName == "#text" ? node.parentElement : node;
      return node.matches(css);
    } catch {
      return false;
    }
  };

  const isFocus = (node) => {
    if (matchesNode(node, focusCSS)) {
      if (node?.dataset?.touched ?? node?.parentElement?.dataset?.touched) return true;
      (node?.dataset ?? {}).touched = true;
      (node?.parentElement?.dataset ?? {}).touched = true;
    }
    return false;
  };

  if (document.firstElementChild) {
    document.firstElementChild.dataset.origin = location.origin;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const postTask = (callback, options = {}) => {
    if (typeof scheduler !== 'undefined' && scheduler.postTask) {
      return scheduler.postTask(callback, {
        priority: "background",
        ...options
      });
    }
    return setTimeout(callback, 0);
  };

  const waitNotBusy = () =>
    new Promise(async (resolve) => {
      await sleep(1);
      try {
        new Promise((r) => postTask(r));
      } catch {}
      sleep(1);
      try {
        if (window.requestIdleCallback) new Promise((r) => requestIdleCallback(r));
      } catch {}
      sleep(1);
      try {
        new Promise((r) => requestAnimationFrame(r));
      } catch {}
      sleep(1);
      resolve(true);
    });

  const isTampermonkey = typeof GM_addStyle === "function" && typeof GM_getResourceText === "function";

  const addStyle = (css) => {
    if (isTampermonkey) {
      GM_addStyle(css);
    } else {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }
  };

  if (isTampermonkey) {
    addStyle(GM_getResourceText("PRISM_CSS"));
  }

  const textShadow = `rgba(0,0,0,1)`;
  addStyle(`
    @media (prefers-color-scheme: light){
      pre,pre *{
          text-shadow: -.1ch -.1ch 0 grey, .1ch -.1ch 0 grey, -.1ch .1ch 0 grey, .1ch .1ch 0 grey !important;
      }
    }
  
    html:not(:has(button[style*="grayscale"])){
        pre.console-output, .log-viewer-container {
            background: #1a1a1a !important;
            color: #eeeeee !important;
            padding: 15px !important;
            font-family: 'Consolas', 'Monaco', monospace !important;
            line-height: 1.5 !important;
        }
        .non-alpha { color: #00ff00 !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .sym-paren  { color: orange !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .sym-curly  { color: #ff79c6 !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .sym-square { color: #ba7dff !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .highlight-nums { color: deepskyblue !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .highlight-yellow { color: yellow !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .highlight-red { color: red !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow}; }
        .token.string { color: #e6db74 !important; }
        .token.comment { color: #75715e !important; }
        code, pre>code[class*=language-] { color: powderblue !important; text-shadow: -1px -1px 0 ${textShadow}, 1px -1px 0 ${textShadow}, -1px 1px 0 ${textShadow}, 1px 1px 0 ${textShadow} !important; }
    }
  `);

  const glowSymbols = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (
        parent?.tagName === "SCRIPT" ||
        parent?.tagName === "STYLE" ||
        matchesNode(node, `[contenteditable="true"],[contenteditable="true"] *`) ||
        isFocus(node)
      ) continue;
      nodes.push(node);
    }

    const regex = /([^a-zA-Z0-9\s])/g;
    const numRegex = /([0-9]+)/g;
    const yRegex = /(\bY\b)/g;
    const rRegex = /(\bR\b)/g;

    const symClass = (ch) => {
      if ('()“”"'.includes(ch)) return "sym-paren";
      if ("{}".includes(ch)) return "sym-curly";
      if ("[]‘’'".includes(ch)) return "sym-square";
      return "non-alpha";
    };
      nodes.forEach((textNode) => {
        if (!textNode.parentElement) return;

        let text = String(textNode.nodeValue).normalize("NFD");
        const trimmed = text.trim();

        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
          try {
            const parsed = JSON.parse(trimmed);
            const pretty = JSON.stringify(parsed, null, 2);
            if (pretty !== trimmed) {
              textNode.nodeValue = pretty;
              text = pretty;
            }
          } catch {}
        }

        // Safeguard: Mark the parent node so we never scan this exact text content again
        // textNode.parentElement.dataset.colored = "true";

        let hasChanges = false;
        const fragment = document.createDocumentFragment();

        // Combined or sequential breakdown that turns modifications into static entities
        let lastIndex = 0;
        let match;
        regex.lastIndex = 0;

        if (regex.test(text)) {
          regex.lastIndex = 0;
          while ((match = regex.exec(text)) !== null) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            const span = document.createElement("span");
            span.className = symClass(match[0]);
            span.textContent = match[0];
            fragment.appendChild(span);
            lastIndex = regex.lastIndex;
            hasChanges = true;
          }
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (hasChanges) {
          const nextNode = textNode.replaceWith(fragment);
          return; // Break out early because textNode is replaced
        }

        if (yRegex.test(text)) {
          yRegex.lastIndex = 0;
          while ((match = yRegex.exec(text)) !== null) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            const span = document.createElement("span");
            span.className = 'highlight-yellow';
            span.textContent = match[0];
            fragment.appendChild(span);
            lastIndex = yRegex.lastIndex;
            hasChanges = true;
          }
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (hasChanges) {
          const nextNode = textNode.replaceWith(fragment);
          return; // Break out early because textNode is replaced
        }

        if (rRegex.test(text)) {
          rRegex.lastIndex = 0;
          while ((match = rRegex.exec(text)) !== null) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            const span = document.createElement("span");
            span.className = 'highlight-red';
            span.textContent = match[0];
            fragment.appendChild(span);
            lastIndex = rRegex.lastIndex;
            hasChanges = true;
          }
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (hasChanges) {
          const nextNode = textNode.replaceWith(fragment);
          return; // Break out early because textNode is replaced
        }

        lastIndex = 0;
        numRegex.lastIndex = 0;
        if (numRegex.test(text) && !/highlight-nums|number/.test(textNode.parentElement.className)) {
          numRegex.lastIndex = 0;
          while ((match = numRegex.exec(text)) !== null) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            const span = document.createElement("span");
            span.className = "highlight-nums";
            span.textContent = match[0];
            fragment.appendChild(span);
            lastIndex = numRegex.lastIndex;
            hasChanges = true;
          }
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (hasChanges) {
          textNode.replaceWith(fragment);
        }
      });
  };

  const applyPrism = async (el) => {
    if (!el || (el.dataset.prismDone && el.querySelector(".token"))) return;
    console.log("Applying Prism Syntax Highlighting...");

    const codeElement = document.createElement("code");
    codeElement.className = "language-bash";
    codeElement.textContent = el.innerText;
    el.innerHTML = "";
    el.appendChild(codeElement);

    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(codeElement);
    }
    el.dataset.prismDone = "true";
  };

  globalThis.runEnhancement = async () => {
    for (const _ of [...Array(4)]) {
      const consolePre = document.querySelector("pre.console-output");
      if (consolePre) {
        await applyPrism(consolePre);
      }

      const targets = [
        ...document.querySelectorAll('.run-output, .run-output *, .react-code-text, code, [class*="log-viewer"], .yaml-editor, .CodeMirror-lines, pre, html:not([data-origin*="jenkins"]) a, time, td'),
        document.querySelector("cloudbees-log-viewer-main"),
        document.querySelector(".log-viewer-container"),
      ].filter(Boolean);

      targets.forEach((target) => {
        if (target.shadowRoot) glowSymbols(target.shadowRoot);
        glowSymbols(target);

        target.querySelectorAll("*").forEach((el) => {
          if (el.shadowRoot) glowSymbols(el.shadowRoot);
        });
      });
    }
  };
})();
