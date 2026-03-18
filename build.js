/**
 * build.js
 * Zero-dependency bundler that produces three dist targets:
 *   dist/contact-guard.esm.js   - ES module  (for bundlers like Vite, Webpack)
 *   dist/contact-guard.cjs.js   - CommonJS   (for Node require())
 *   dist/contact-guard.umd.js   - UMD        (for <script> tag in Jekyll)
 *
 * Run: node build.js
 */

const fs   = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Read source files
// ---------------------------------------------------------------------------
const coreSrc = fs.readFileSync(path.join(__dirname, "src/core.js"), "utf8");
const domSrc  = fs.readFileSync(path.join(__dirname, "src/dom.js"),  "utf8");

// Strip ES import/export statements - we'll re-assemble manually
function stripImportsExports(src) {
  return src
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "")
    .replace(/^export\s+\{[^}]*\}\s*from\s+['"].*?['"];?\s*$/gm, "")
    .replace(/^export\s+(function|const|let|var|class)\s+/gm, "$1 ")
    .replace(/^export\s+default\s+/gm, "/* export default */ ");
}

const coreStripped = stripImportsExports(coreSrc);
const domStripped  = stripImportsExports(domSrc);

// ---------------------------------------------------------------------------
// UMD build  (browser <script> tag — attaches to window.ContactGuard)
// ---------------------------------------------------------------------------
const umd = `/**
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
  ${coreStripped}

  // ---- DOM -----------------------------------------------------------------
  ${domStripped}

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
`;

// ---------------------------------------------------------------------------
// ESM build  (for Vite / Webpack / native ES modules)
// ---------------------------------------------------------------------------
const esm = `/**
 * contact-guard v1.0.0 — ES Module build
 */
"use strict";

${coreStripped}

${domStripped}

export function init(options = {}) {
  const { xorKey, autoReveal = true, honeypots = true } = options;
  if (!xorKey) throw new Error("[contact-guard] init() requires an xorKey option.");
  if (honeypots)  injectHoneypots();
  if (autoReveal) attachRevealListeners(xorKey);
}

export default {
  encode, decode, init, rot13,
  xor: { cipher: xorCipher, decipher: xorDecipher },
  b64: { encode: b64Encode, decode: b64Decode },
};
`;

// ---------------------------------------------------------------------------
// CJS build  (for Node.js CLI and require())
// ---------------------------------------------------------------------------
const cjs = `/**
 * contact-guard v1.0.0 — CommonJS build
 */
"use strict";

${coreStripped}

module.exports = {
  encode,
  decode,
  rot13,
  xorCipher,
  xorDecipher,
  b64Encode,
  b64Decode,
  toCharArray,
  fromCharArray,
};
`;

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
if (!fs.existsSync(path.join(__dirname, "dist"))) {
  fs.mkdirSync(path.join(__dirname, "dist"));
}

fs.writeFileSync(path.join(__dirname, "dist/contact-guard.umd.js"), umd);
fs.writeFileSync(path.join(__dirname, "dist/contact-guard.esm.js"), esm);
fs.writeFileSync(path.join(__dirname, "dist/contact-guard.cjs.js"), cjs);

console.log("✓ dist/contact-guard.umd.js");
console.log("✓ dist/contact-guard.esm.js");
console.log("✓ dist/contact-guard.cjs.js");
