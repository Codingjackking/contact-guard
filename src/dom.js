/**
 * src/dom.js
 * DOM-specific logic: honeypot injection and interaction-gated reveal.
 * Only runs in a browser context.
 */

import { decode } from "./core.js";

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

export function injectHoneypots() {
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
export function revealElement(el, xorKey) {
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

export function attachRevealListeners(xorKey) {
  const targets = document.querySelectorAll("[data-cg-value]");

  targets.forEach((el) => {
    const reveal = () => revealElement(el, xorKey);

    ["mouseover", "touchstart", "focus"].forEach((evt) => {
      el.addEventListener(evt, reveal, { once: true, passive: true });
    });

    setTimeout(reveal, REVEAL_DELAY);
  });
}
