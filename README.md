# Medium Summarizer AI

> Summarize any Medium article instantly using Claude AI — right from your browser.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Webpack](https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack)
![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome)
![Claude](https://img.shields.io/badge/Claude-Sonnet--4-7C3AED?logo=anthropic)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

Medium Summarizer AI is a Chrome Extension that reads a Medium article, sends it through Claude claude-sonnet-4-20250514, and renders a structured markdown summary right in the popup — no copy-paste needed.

**Screenshot placeholder** *(add a screenshot of the popup here)*

---

## Quick Start (3 steps)

1. **Clone and build**
   ```bash
   git clone <repo-url>
   cd chrome-extension
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

---

## How to get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-api03-...`)

---

## How to use

1. 🌐 Open any Medium article (e.g. `medium.com/@author/article-title`)
2. 🖱️ Click the **Medium Summarizer AI** icon in your Chrome toolbar
3. ✨ Click **Summarize Article** and wait ~5 seconds
4. 📖 Read the structured summary — or copy it to clipboard
5. 🕰️ View past summaries anytime in the **History** tab

---

## Proxy Strategy

Medium articles can be behind a paywall. The extension uses a waterfall of three proxy services to fetch the full article text:

| Priority | Proxy | Method |
|----------|-------|--------|
| 1 | **Freedium** | `freedium.cfd/<url>` |
| 2 | **Archive.ph** | `archive.ph/newest/<url>` |
| 3 | **12ft.io** | `12ft.io/proxy?q=<url>` |

If all three fail, a clear error message is shown.

---

## Cost Breakdown

Using `claude-sonnet-4-20250514` (as of 2025):

| | Price per 1M tokens |
|---|---|
| Input | $3.00 |
| Output | $15.00 |

A typical 2,000-word Medium article costs roughly **~$0.003** to summarize.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript (strict) | Type-safe source |
| Webpack 5 | Bundling all entry points |
| Chrome MV3 | Extension platform |
| Claude claude-sonnet-4-20250514 | AI summarization |
| marked.js | Markdown → HTML rendering |
| DOMParser | Article HTML scraping |

---

## Project Structure

```
chrome-extension/
├── src/
│   ├── popup/          # UI: HTML, TypeScript, CSS
│   ├── background/     # Service worker
│   ├── content/        # Injected content script
│   └── utils/
│       ├── scraper.ts  # Proxy waterfall + text extraction
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

After any change, go to `chrome://extensions` and click the refresh icon on the extension card.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT © 2025
