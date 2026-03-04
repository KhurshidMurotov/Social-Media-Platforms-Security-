# Social Media Security Toolkit

Educational web toolkit for social media cybersecurity awareness.

## Features

- Password Strength Checker (client-side)
- Email Leak Checker (Have I Been Pwned or LeakCheck via server-side proxy)
- Phishing/Malicious URL Scanner (VirusTotal via server-side proxy)
- OSINT Username Finder (profile links + limited verification via safe public APIs)

## Privacy and Ethics

- Educational and awareness purposes only
- No data storage: passwords, emails, usernames, and URLs are processed transiently
- No scraping of unsupported platforms
- External API keys stay server-side in Next.js API routes

## Tech Stack

- Next.js (Pages Router), React, TypeScript
- API routes in `src/pages/api/*`

## Environment Variables

Create `.env.local` from `.env.example`.

### Required

- `VT_API_KEY`  
  Used by `/api/vt-url` for VirusTotal URL scanning.

### Conditionally required

At least one of the following must be set for `/api/hibp`:

- `HIBP_API_KEY` (Have I Been Pwned API key)
- `LEAKCHECK_API_KEY` (LeakCheck API key)

If neither email provider key is set, the API returns `503` with code `MISSING_API_KEY`.

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
- `HIBP_API_KEY` or `LEAKCHECK_API_KEY`

Then deploy normally with Vercel.

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

