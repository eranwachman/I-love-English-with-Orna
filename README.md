# I Love English with Orna 🌟

A colorful, kid-friendly dashboard (ages 8–12) that shows every video from the
[@AlfieForKids](https://www.youtube.com/@AlfieForKids) YouTube channel.
Anyone can watch — **no YouTube account or login needed**.

## Features
- Newest video highlighted, "NEW!" badges, big playful cards
- Star collecting and levels, confetti, favorites (saved in the browser only)
- Search, "Surprise me!" button, next-video button
- Privacy-friendly player (`youtube-nocookie.com`), no tracking, no accounts

## Auto-updating
A GitHub Action (`.github/workflows/update.yml`) runs every 30 minutes, reads the
channel's public RSS feed (no API key), adds new videos to `data/videos.json`
and redeploys the site to GitHub Pages. The feed lists only the newest ~15
videos, so older ones are kept in `data/videos.json` once seen.

## Run locally
```
node scripts/update.mjs      # refresh data/videos.json
npx serve .                  # or any static server
```
