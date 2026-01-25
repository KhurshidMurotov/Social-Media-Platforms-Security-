# Social Media Security Toolkit

Educational, web-based cybersecurity awareness toolkit for social media users:

- Password Strength Checker (client-side)
- Email Leak Checker (HIBP or LeakCheck proxy)
- Phishing / Malicious URL Scanner (VirusTotal proxy)
- OSINT Username Finder (link generation + limited verification via safe public APIs)

## Privacy / Ethics (scope)

- **Educational and awareness purposes only**
- **No data storage**: the app does not persist passwords, emails, usernames, or URLs
- **No scraping**: the username module generates profile links; verification is limited to platforms with safe public APIs (e.g. GitHub/Reddit)
- **API keys stay server-side** via Next.js API routes (Vercel serverless)

## Local development

1) Install dependencies:

```bash
npm install
```

2) Create `.env.local` (do not commit) based on `.env.example`:

- `VT_API_KEY` (VirusTotal v3 API key)
- `HIBP_API_KEY` (HaveIBeenPwned API key) **or**
- `LEAKCHECK_API_KEY` (LeakCheck Pro API v2 key)

3) Run:

```bash
npm run dev
```

## Vercel deployment

Set Environment Variables in **Vercel → Project Settings → Environment Variables**:

- `VT_API_KEY`
- `HIBP_API_KEY` or `LEAKCHECK_API_KEY` (optional; if missing the UI will show “demo mode”)

