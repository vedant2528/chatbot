# Shwedant — Flask + Google Gemini AI Assistant

A polished, ChatGPT-style chat app backed by the Gemini API.

## What's new in this version

- **Real streaming replies.** The server opens a live SSE stream to Gemini (`streamGenerateContent`) and forwards tokens to the browser as they arrive — no more fake typewriter effect over a finished response. You can stop a reply mid-stream with the stop button.
- **Multi-chat sidebar.** Create, rename (double-click a chat's name), switch between, and delete conversations. Chat history and titles persist in the browser via `localStorage`, so a page refresh doesn't lose anything.
- **Real Markdown rendering.** Bot replies render headings, lists, tables, links, and fenced code blocks (via `marked` + `DOMPurify` for sanitizing, `highlight.js` for syntax highlighting). Every code block gets a one-click Copy button; every reply has its own Copy button too.
- **Safer file handling.** Each uploaded file is checked against an 8 MB per-file cap (in addition to the 16 MB total request cap), and unsupported types are reported back instead of silently failing.
- **Server memory cleanup.** Idle chat sessions are purged automatically after 6 hours so long-running server processes don't leak memory.
- **Refreshed interface.** New graphite/amber visual identity (Fraunces + Inter type pairing), an empty state, a mobile-friendly collapsible sidebar, accessible focus states, and voice input carried over from the original build.

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Get a Gemini API key

Create one at Google AI Studio:

```text
https://aistudio.google.com/app/apikey
```

### 3. Create your `.env`

Copy `.env.example` to `.env` and fill in your key:

```env
GEMINI_API_KEY=your_actual_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 4. Run it

```bash
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Notes

- Never commit your real API key. `.env` is already git-ignored.
- Chat *content* (titles, message text) lives in the browser's `localStorage` per device/browser. The *AI context* the model sees lives in server memory keyed by the same chat id, so it resets if the Flask process restarts — reasonable for local/dev use, but for production you'd want to move both to a real database.
- Upload limits: 16 MB per request, 8 MB per individual file.
- Supported uploads: `txt, md, csv, pdf, docx, xlsx, xls, png, jpg, jpeg, webp`.
- Voice input requires a browser with the Web Speech API (Chrome/Edge).

## Project structure

```text
chatbot/
├── app.py                 # Flask app: routes, Gemini calls, streaming, file parsing
├── requirements.txt
├── .env.example
├── templates/
│   └── index.html         # Page markup
└── static/
    ├── app.js             # Chat logic: sidebar, streaming, markdown rendering
    └── style.css          # Visual design
```
