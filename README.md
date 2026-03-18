# contact-guard

Multi-layer obfuscation package for protecting emails and links on static sites from scrapers.

**Protection pipeline:** `plaintext → XOR cipher → JSON array → Base64 → ROT13`

---

## Installation

```bash
# From npm (after publishing)
npm install contact-guard

# Or link locally during development
npm link
```

---

## Usage

### Option A — Jekyll / plain HTML (UMD script tag)

Copy `dist/contact-guard.umd.js` into your Jekyll repo at `assets/js/`.

In `_layouts/default.html`, before `</body>`:

```html
<script src="{{ '/assets/js/contact-guard.umd.js' | relative_url }}"></script>
<script>
  ContactGuard.init({ xorKey: "your_secret_key" });
</script>
```

### Option B — ES module (Vite, Webpack, native `<script type="module">`)

```js
import ContactGuard from "contact-guard";
// or named imports:
import { encode, decode, init } from "contact-guard";

ContactGuard.init({ xorKey: "your_secret_key" });
```

### Option C — Node.js / CommonJS

```js
const { encode, decode } = require("contact-guard");

const encoded = encode("you@example.com", "your_secret_key");
const plain = decode(encoded, "your_secret_key");
```

---

## CLI

```bash
# Encode a single value
npx contact-guard encode --key "your_secret_key" --value "you@example.com"

# Decode to verify
npx contact-guard decode --key "your_secret_key" --value "JmV5YQRk..."

# Batch encode from a JSON file
npx contact-guard encode --key "your_secret_key" --file contacts.json --out encoded.json

# Help
npx contact-guard --help
```

### contacts.json format

```json
[
  {
    "id": "email",
    "type": "email",
    "value": "you@example.com",
    "label": "Email me"
  },
  {
    "id": "github",
    "type": "link",
    "value": "https://github.com/you",
    "label": "GitHub"
  }
]
```

The `--out` file will contain the encoded values plus ready-to-paste HTML snippets.

---

## HTML element format

Place `<span>` elements in your HTML with these data attributes:

```html
<span
  class="cg-contact"
  data-cg-type="email"
  data-cg-value="<encoded>"
  data-cg-label="Email me"
  tabindex="0"
  aria-label="Email — hover to reveal"
>
  [hover to reveal]
</span>
```

| Attribute       | Values                  | Description                                     |
| --------------- | ----------------------- | ----------------------------------------------- |
| `data-cg-type`  | `email`, `link`, `text` | How to render after decode                      |
| `data-cg-value` | encoded string          | Output of `encode()` or CLI                     |
| `data-cg-label` | any string              | Optional display text (overrides decoded value) |

---

## API Reference

### `init(options)`

Bootstraps the DOM listener. Call once after the page loads.

| Option       | Type    | Default  | Description                          |
| ------------ | ------- | -------- | ------------------------------------ |
| `xorKey`     | string  | required | Must match the key used to encode    |
| `autoReveal` | boolean | `true`   | Wire up hover/focus reveal listeners |
| `honeypots`  | boolean | `true`   | Inject off-screen fake addresses     |

### `encode(plaintext, xorKey) → string`

Encode a value for use as `data-cg-value`. Run this offline or in a build step.

### `decode(encoded, xorKey) → string`

Reverse encode. Called automatically by `init()` at reveal time.

---

## Rebuilding dist

```bash
node build.js
```

Outputs:

- `dist/contact-guard.umd.js` — browser `<script>` tag
- `dist/contact-guard.esm.js` — ES module import
- `dist/contact-guard.cjs.js` — Node.js require()

---

## Changing the XOR key

1. Pick a new key string
2. Re-run the CLI to re-encode all your values
3. Update the key passed to `ContactGuard.init({ xorKey: "..." })`
4. Update `XOR_KEY` in any local encode tooling

---

## Security note

This runs client-side, so a determined person using DevTools can always call
`ContactGuard.decode(value, key)` manually. The goal is defeating automated
scrapers and harvesters, not cryptographic secrecy.
