# 🎯 CandidateHunter

> AI-powered candidate screening directly in your browser. Open a LinkedIn or Ashby profile and get an instant ADVANCE/ARCHIVE verdict — no copy-paste, no context switching.

[![Chrome](https://img.shields.io/badge/Chrome-v1.8-0073b1?logo=googlechrome&logoColor=white)](https://github.com/iamsourcer/candidatehunter/releases/latest)
[![Firefox](https://img.shields.io/badge/Firefox-v1.8-7c3aed?logo=firefox&logoColor=white)](https://github.com/iamsourcer/candidatehunter/releases/latest)

## What it does

- **Auto-analyzes** LinkedIn and Ashby candidate profiles as you browse
- **AI verdict** — ADVANCE or ARCHIVE with a match % and 2-sentence summary
- **Phone screen scripts** generated automatically for ADVANCE candidates
- **Projects** — organize candidates into named lists, export as JSON
- **Role configurations** — switch evaluation criteria per open role
- **Multi-ATS** — LinkedIn + Ashby (DOM scraping, no API key required)

## Download

→ **[Latest release](https://github.com/iamsourcer/candidatehunter/releases/latest)**

| Browser | File |
|---|---|
| Chrome / Brave / Edge / Arc | `candidatehunter-chrome.zip` |
| Firefox 101+ | `candidatehunter-firefox.zip` |

## Install

### Chrome
1. Download and unzip `candidatehunter-chrome.zip`
2. Go to `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select the unzipped folder
4. Click the 🎯 icon → Settings → add your AI API key

### Firefox
1. Download and unzip `candidatehunter-firefox.zip`
2. Go to `about:debugging` → **This Firefox**
3. Click **Load Temporary Add-on** → select `manifest.json`
4. Click the 🎯 icon → Settings → add your AI API key

> **Note:** Firefox temporary add-ons are removed on restart. Permanent install requires Mozilla signing.

## AI Providers

The extension works with any of these (you bring your own API key):

| Provider | Model | Cost |
|---|---|---|
| Anthropic | claude-sonnet-4-6 (default) | ~$3/M tokens |
| OpenAI | gpt-4o-mini | ~$0.15/M tokens |
| DeepSeek | deepseek-chat | ~$0.14/M tokens |
| Groq | free tier | Free (rate limited) |
| Google Gemini | gemini-1.5-flash | Free tier available |

## Repo structure

```
candidatehunter/
├── index.html          ← Landing page (GitHub Pages)
├── chrome/             ← Chrome extension source
├── firefox/            ← Firefox extension source
└── README.md
```

## License

MIT
