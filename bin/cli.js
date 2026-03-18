#!/usr/bin/env node
/**
 * bin/cli.js
 * Command-line interface for contact-guard.
 *
 * Usage:
 *   npx contact-guard encode --key "sjsu_ai_2025" --value "nainghtet123@gmail.com"
 *   npx contact-guard decode --key "sjsu_ai_2025" --value "<encoded>"
 *   npx contact-guard encode --key "sjsu_ai_2025" --file contacts.json
 *   npx contact-guard --help
 */

"use strict";

const path = require("path");
const fs   = require("fs");
const { encode, decode } = require(path.join(__dirname, "../dist/contact-guard.cjs.js"));

// ---------------------------------------------------------------------------
// Arg parser  (no external deps)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = val;
    } else {
      args._.push(a);
    }
  }
  return args;
}

const args    = parseArgs(process.argv.slice(2));
const command = args._[0];

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
if (!command || command === "--help" || command === "help" || args.help) {
  console.log(`
contact-guard CLI v1.0.0

COMMANDS:
  encode   Encode a plaintext value or a contacts JSON file
  decode   Decode an encoded value back to plaintext

OPTIONS:
  --key    <string>   XOR key (must match the key used in init())
  --value  <string>   Single value to encode or decode
  --file   <path>     JSON file of contacts to batch-encode (encode only)
  --out    <path>     Write output to a file instead of stdout

EXAMPLES:
  npx contact-guard encode --key "sjsu_ai_2025" --value "me@example.com"
  npx contact-guard decode --key "sjsu_ai_2025" --value "JmV5YQRk..."
  npx contact-guard encode --key "sjsu_ai_2025" --file contacts.json --out encoded.json

CONTACTS JSON FORMAT:
  [
    { "id": "email",    "type": "email", "value": "me@example.com",           "label": "Email me" },
    { "id": "github",   "type": "link",  "value": "https://github.com/you",   "label": "GitHub" },
    { "id": "linkedin", "type": "link",  "value": "https://linkedin.com/in/you" }
  ]
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Validate key
// ---------------------------------------------------------------------------
const xorKey = args.key;
if (!xorKey) {
  console.error("Error: --key is required.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// encode command
// ---------------------------------------------------------------------------
if (command === "encode") {

  // Single value
  if (args.value) {
    const encoded = encode(args.value, xorKey);
    console.log(encoded);
    process.exit(0);
  }

  // Batch from JSON file
  if (args.file) {
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }

    let contacts;
    try {
      contacts = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
      console.error("Error: Could not parse JSON file:", e.message);
      process.exit(1);
    }

    if (!Array.isArray(contacts)) {
      console.error("Error: JSON file must be an array of contact objects.");
      process.exit(1);
    }

    const results = contacts.map((c) => ({
      id           : c.id    || c.value,
      type         : c.type  || "text",
      label        : c.label || null,
      encodedValue : encode(c.value, xorKey),
      // Convenience: ready-to-paste HTML snippet
      snippet      : buildSnippet(c.type || "text", encode(c.value, xorKey), c.label || null),
    }));

    const output = JSON.stringify(results, null, 2);

    if (args.out) {
      fs.writeFileSync(path.resolve(args.out), output);
      console.log(`✓ Written to ${args.out}`);
    } else {
      console.log(output);
    }

    process.exit(0);
  }

  console.error("Error: Provide --value or --file.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// decode command
// ---------------------------------------------------------------------------
if (command === "decode") {
  if (!args.value) {
    console.error("Error: --value is required for decode.");
    process.exit(1);
  }
  try {
    const plain = decode(args.value, xorKey);
    console.log(plain);
  } catch (e) {
    console.error("Decode failed:", e.message);
    process.exit(1);
  }
  process.exit(0);
}

console.error(`Unknown command: ${command}. Run with --help for usage.`);
process.exit(1);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildSnippet(type, encodedValue, label) {
  const labelAttr = label ? `\n      data-cg-label="${label}"` : "";
  return (
    `<span class="cg-contact"\n` +
    `      data-cg-type="${type}"\n` +
    `      data-cg-value="${encodedValue}"${labelAttr}\n` +
    `      tabindex="0"\n` +
    `      aria-label="Protected contact — hover to reveal">\n` +
    `  [hover to reveal]\n` +
    `</span>`
  );
}
