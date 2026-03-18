/**
 * contact-guard v1.0.0
 * UMD build — use via <script src="contact-guard.umd.js"></script>
 * Attaches window.ContactGuard and auto-inits on DOMContentLoaded.
 *
 * Usage in HTML:
 *   <script src="/assets/js/contact-guard.umd.js"></script>
 *   <script>
 *     ContactGuard.init({ xorKey: "your_secret_key" });
 *   </script>
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);                          // AMD
  } else if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();                   // CommonJS
  } else {
    root.ContactGuard = factory();                // Browser global
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---- CORE ----------------------------------------------------------------
  /**
 * src/core.js
 * Pure crypto/obfuscation functions with no DOM or Node dependencies.
 * Used by both the browser build and the Node CLI.
 */

// ---------------------------------------------------------------------------
// ROT13
// ---------------------------------------------------------------------------
function rot13(str) {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// ---------------------------------------------------------------------------
// XOR cipher  (rotating key)
// ---------------------------------------------------------------------------
function xorCipher(str, key) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    out.push(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;                    // number[]
}

function xorDecipher(charCodes, key) {
  return charCodes
    .map((n, i) => String.fromCharCode(n ^ key.charCodeAt(i % key.length)))
    .join("");
}

// ---------------------------------------------------------------------------
// Base64  (unicode-safe)
// ---------------------------------------------------------------------------
function b64Encode(str) {
  // Works in both browser (btoa) and Node (Buffer)
  const bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return typeof btoa !== "undefined"
    ? btoa(bytes)
    : Buffer.from(bytes, "binary").toString("base64");
}

function b64Decode(b64) {
  const raw =
    typeof atob !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
  return decodeURIComponent(
    raw
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

// ---------------------------------------------------------------------------
// Char-code helpers
// ---------------------------------------------------------------------------
function toCharArray(str) {
  return str.split("").map((c) => c.charCodeAt(0));
}

function fromCharArray(arr) {
  return arr.map((n) => String.fromCharCode(n)).join("");
}

// ---------------------------------------------------------------------------
// Master encode / decode
// Pipeline: plaintext -> XOR -> JSON -> Base64 -> ROT13
// ---------------------------------------------------------------------------
function encode(plaintext, xorKey) {
  if (!xorKey) throw new Error("[contact-guard] xorKey is required");
  const xored     = xorCipher(plaintext, xorKey);
  const jsonArr   = JSON.stringify(xored);
  const b64       = b64Encode(jsonArr);
  const scrambled = rot13(b64);
  return scrambled;
}

function decode(encoded, xorKey) {
  if (!xorKey) throw new Error("[contact-guard] xorKey is required");
  try {
    const b64     = rot13(encoded);
    const jsonArr = b64Decode(b64);
    const arr     = JSON.parse(jsonArr);
    return xorDecipher(arr, xorKey);
  } catch (e) {
    throw new Error("[contact-guard] decode failed: " + e.message);
  }
}


  // ---- DOM -----------------------------------------------------------------
  /**
 * src/dom.js
 * DOM-specific logic: honeypot injection and interaction-gated reveal.
 * Only runs in a browser context.
 */


// ---------------------------------------------------------------------------
// Honeypot injection
// Injects off-screen fake addresses to pollute scraper harvests.
// ---------------------------------------------------------------------------
const HONEYPOTS = [
  "contact@example-noreply.invalid",
  "no-reply@placeholder.test",
  "scraper-trap@honeypot.invalid",
  "null@dev.null",
];

function injectHoneypots() {
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText =
    "position:absolute;left:-9999px;top:-9999px;" +
    "width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
  wrap.className = "cg-hp";

  HONEYPOTS.forEach((fake) => {
    const a = document.createElement("a");
    a.href = "mailto:" + fake;
    a.textContent = fake;
    wrap.appendChild(a);
  });

  document.body.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Reveal a single protected element
// ---------------------------------------------------------------------------
function revealElement(el, xorKey) {
  if (el.dataset.cgRevealed) return;
  el.dataset.cgRevealed = "1";

  const encoded     = el.dataset.cgValue;
  const type        = el.dataset.cgType;
  const label       = el.dataset.cgLabel || null;

  if (!encoded || !type) return;

  let plain;
  try {
    plain = decode(encoded, xorKey);
  } catch (e) {
    console.warn("[contact-guard]", e.message);
    return;
  }
  if (!plain) return;

  const displayText = label || plain;

  if (type === "email") {
    const a = document.createElement("a");
    a.href        = "mailto:" + plain;
    a.textContent = displayText;
    a.className   = el.className;
    a.setAttribute("aria-label", "Email: " + plain);
    el.innerHTML  = "";
    el.appendChild(a);

  } else if (type === "link") {
    const a = document.createElement("a");
    a.href        = plain;
    a.textContent = displayText;
    a.className   = el.className;
    a.target      = "_blank";
    a.rel         = "noopener noreferrer";
    el.innerHTML  = "";
    el.appendChild(a);

  } else if (type === "text") {
    el.textContent = displayText;
  }
}

// ---------------------------------------------------------------------------
// Attach reveal listeners to all [data-cg-value] elements
// Reveals on: mouseover, touchstart, focus, or after REVEAL_DELAY ms idle.
// ---------------------------------------------------------------------------
const REVEAL_DELAY = 2500; // ms — keyboard-only / screen-reader fallback

function attachRevealListeners(xorKey) {
  const targets = document.querySelectorAll("[data-cg-value]");

  targets.forEach((el) => {
    const reveal = () => revealElement(el, xorKey);

    ["mouseover", "touchstart", "focus"].forEach((evt) => {
      el.addEventListener(evt, reveal, { once: true, passive: true });
    });

    setTimeout(reveal, REVEAL_DELAY);
  });
}


  // ---- PUBLIC API ----------------------------------------------------------
  function init(options) {
    options = options || {};
    var xorKey    = options.xorKey;
    var autoReveal = options.autoReveal !== false;
    var honeypots  = options.honeypots  !== false;

    if (!xorKey) throw new Error("[contact-guard] init() requires an xorKey option.");

    if (honeypots)  injectHoneypots();
    if (autoReveal) attachRevealListeners(xorKey);
  }

  return {
    encode : encode,
    decode : decode,
    init   : init,
    rot13  : rot13,
    xor    : { cipher: xorCipher, decipher: xorDecipher },
    b64    : { encode: b64Encode, decode: b64Decode },
  };
}));
