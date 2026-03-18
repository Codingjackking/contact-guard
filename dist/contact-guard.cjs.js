/**
 * contact-guard v1.0.0 — CommonJS build
 */
"use strict";

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
