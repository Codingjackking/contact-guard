/**
 * src/index.js
 * Public API surface for the contact-guard package.
 *
 * Named exports  (for bundlers / ES modules):
 *   import { encode, decode, init } from "contact-guard";
 *
 * Default export:
 *   import ContactGuard from "contact-guard";
 *   ContactGuard.init({ xorKey: "..." });
 */

export {
  encode,
  decode,
  rot13,
  xorCipher,
  xorDecipher,
  b64Encode,
  b64Decode,
  toCharArray,
  fromCharArray,
} from "./core.js";

export { injectHoneypots, revealElement, attachRevealListeners } from "./dom.js";

import { encode, decode, rot13, xorCipher, xorDecipher, b64Encode, b64Decode } from "./core.js";
import { injectHoneypots, attachRevealListeners } from "./dom.js";

/**
 * init({ xorKey, autoReveal, honeypots })
 *
 * @param {object} options
 * @param {string} options.xorKey     - Required. Must match the key used to encode.
 * @param {boolean} [options.autoReveal=true]  - Wire up DOM reveal listeners.
 * @param {boolean} [options.honeypots=true]   - Inject honeypot addresses.
 */
function init(options = {}) {
  const { xorKey, autoReveal = true, honeypots = true } = options;

  if (!xorKey) {
    throw new Error("[contact-guard] init() requires an xorKey option.");
  }

  if (honeypots) injectHoneypots();
  if (autoReveal) attachRevealListeners(xorKey);
}

const ContactGuard = {
  encode,
  decode,
  init,
  rot13,
  xor: { cipher: xorCipher, decipher: xorDecipher },
  b64: { encode: b64Encode, decode: b64Decode },
};

export default ContactGuard;
