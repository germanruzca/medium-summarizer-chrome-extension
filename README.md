# Medium Summarizer AI

> Summarize any Medium article instantly using Claude AI — right from your browser.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Webpack](https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack)
![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome)
![Claude](https://img.shields.io/badge/Claude-Sonnet--4.6-7C3AED?logo=anthropic)
![DOMPurify](https://img.shields.io/badge/DOMPurify-XSS%20Safe-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Medium Summarizer AI is a Chrome Extension that reads a Medium article directly from the page you have open, cleans the text, and sends it to **Claude Sonnet 4.6** to generate a structured markdown summary — all inside the popup, no copy-paste needed.

**Screenshot placeholder** *(add a screenshot of the popup here)*

---

## Quick Start

1. **Clone and build**
   ```bash
   git clone <repo-url>
   cd medium-summarizer-chrome-extension
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** → select the `dist/` folder

3. **Add your API key**
   - Click the extension icon in your toolbar
   - Go to the **Settings** tab
   - Paste your Anthropic API key and hit **Save**
   - Use **Verify** to confirm the key works before summarizing

---

## How to get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-api03-...`)

---

## How to use

1. 🌐 Open any Medium article
2. 🖱️ Click the **Medium Summarizer AI** icon in your Chrome toolbar
3. ✨ Click **Summarize Article**
4. 📖 Read the structured summary — or copy it to clipboard
5. 🕰️ View past summaries anytime in the **History** tab

---

## How article text is fetched

The extension reads the article in two stages:

1. **Direct DOM read (primary)** — the content script extracts text directly from the open Medium tab. No network request needed, works instantly.
2. **Archive.ph fallback** — if the DOM extraction returns too little text (e.g. heavy paywall), the extension fetches via `archive.ph/newest/<url>`.

Before sending to Claude, all text goes through a cleaning pipeline:

- HTML tags stripped
- HTML entities decoded
- UI noise removed (short fragments like "Follow", "Sign in", clap counts)
- Hard-capped at **2 500 words** — enough for any Medium article, avoids expensive multi-chunk calls

---

## Cost

Using `claude-sonnet-4-6`:

| | Price per 1M tokens |
|---|---|
| Input | $3.00 |
| Output | $15.00 |

A typical Medium article costs roughly **~$0.003** to summarize (single API call, ~2 000 input tokens + ~1 000 output tokens).

---

## Security

| Area | Approach |
|---|---|
| XSS | All markdown rendered via `marked` is sanitized with **DOMPurify** before hitting `innerHTML` |
| API key storage | Stored in `chrome.storage.local` — stays on device, never synced to Google |
| Message passing | Content script and background worker reject messages from outside the extension |
| API key validation | Regex check before any network call |
| External links | `rel="noopener noreferrer"` on all `target="_blank"` anchors |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript (strict) | Type-safe source |
| Webpack 5 | Bundling all entry points |
| Chrome MV3 | Extension platform |
| Claude Sonnet 4.6 | AI summarization |
| marked.js | Markdown → HTML rendering |
| DOMPurify | XSS sanitization |

---

## Project Structure

```
medium-summarizer-chrome-extension/
├── src/
│   ├── popup/          # UI: HTML, TypeScript, CSS
│   ├── background/     # MV3 service worker
│   ├── content/        # Content script — DOM text extraction
│   └── utils/
│       ├── scraper.ts  # Text extraction, cleaning, Archive fallback
│       ├── claude.ts   # Claude API integration
│       └── storage.ts  # chrome.storage wrappers + cost calc
├── public/icons/       # Extension icons (16/48/128px)
├── manifest.json       # Manifest V3
├── webpack.config.js
├── tsconfig.json
└── package.json
```

---

## Development

```bash
npm run dev    # Watch mode with source maps
npm run build  # Production build
npm run zip    # Build + zip dist/ → extension.zip
```

After any source change: go to `chrome://extensions` and click the **↻ reload** icon on the card. If you changed the content script, also refresh the Medium tab.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT © 2025
