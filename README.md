# Social Media Security Toolkit

Educational web toolkit for social media cybersecurity awareness.

## Features

- Password Strength Checker (client-side)
- Email Leak Checker (LeakCheck Public API)
- Phishing/Malicious URL Scanner (VirusTotal via server-side proxy)
- OSINT Username Finder (direct public profile-page verification where platforms allow it)

## Privacy and Ethics

- Educational and awareness purposes only
- No data storage: passwords, emails, usernames, and URLs are processed transiently
- No authenticated scraping; only public profile-page checks where platform responses allow safe verification
- External API keys stay server-side in Next.js API routes

## Tech Stack

- Next.js (Pages Router), React, TypeScript
- API routes in `src/pages/api/*`

## Environment Variables

Create `.env.local` from `.env.example`.

### Required

- `VT_API_KEY`  
  Used by `/api/vt-url` for VirusTotal URL scanning.

### Not required for email checker

- `/api/email-leak` uses LeakCheck Public API and does not require any API key.
- Powered by LeakCheck.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Validation Commands

```bash
npm run lint
npm run build
npm test
```

## Deployment (Vercel)

Set environment variables in Vercel Project Settings:

- `VT_API_KEY`

Then deploy normally with Vercel.

## VirusTotal (VT) limits and behavior

- VirusTotal free tier is rate-limited and can be slow under load.
- Scans are asynchronous, so you may briefly see "Analyzing..." before final results are ready.
- This app uses a server-side proxy, auto-retries when VT analysis is pending, and keeps a 15-minute in-memory cache to reduce quota usage.
- "Did not respond (timeout)" means some vendor engines did not return in time; this is not a guarantee of safety.

Troubleshooting:

- Ensure `VT_API_KEY` is set in Vercel/local env.
- Avoid scanning private IPs or reserved domains.
- Some fictional training domains may not exist and can be rejected by VT.

## Security: Secrets

- Never commit `.env.local`
- `.env.local` is ignored by `.gitignore`; keep it that way
- Rotate keys immediately if exposed
- Do not print or log key values
- Before pushing, scan staged changes for accidental secrets:

```bash
git diff --staged
```

- Optional local scan for key-like strings in source files:

```bash
rg -n "API_KEY|SECRET|TOKEN" src README.md .env.example
```
