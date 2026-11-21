// Fetches the channel's public RSS feed and merges new videos into data/videos.json.
// No API key needed. The feed only lists the newest ~15 videos, so we keep
// everything we've ever seen and add to it on every run.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const CHANNEL_ID = "UCbgeglwVGEgYHdiXUxcmBoA"; // @AlfieForKids
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const FILE = new URL("../data/videos.json", import.meta.url);

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const pick = (xml, re) => (xml.match(re) || [])[1] || "";

const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
const xml = await res.text();

const fresh = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
  id: pick(e, /<yt:videoId>([^<]+)/),
  title: decode(pick(e, /<title>([^<]*)/)),
  published: pick(e, /<published>([^<]+)/),
  description: decode(pick(e, /<media:description>([^<]*)/)),
}));

let existing = { channel: {}, videos: [] };
try { existing = JSON.parse(await readFile(FILE, "utf8")); } catch {}

const byId = new Map(existing.videos.map((v) => [v.id, v]));
for (const v of fresh) if (v.id) byId.set(v.id, { ...byId.get(v.id), ...v });

const videos = [...byId.values()].sort((a, b) => b.published.localeCompare(a.published));
const next = {
  channel: {
    id: CHANNEL_ID,
    name: pick(xml, /<author>\s*<name>([^<]+)/) || existing.channel.name || "Alfie For Kids",
    url: "https://www.youtube.com/@AlfieForKids",
  },
  videos,
};

// Only rewrite when something changed, so the workflow doesn't make empty commits.
const before = JSON.stringify(existing);
const after = JSON.stringify(next);
if (before === after) {
  console.log(`No change (${videos.length} videos).`);
} else {
  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(FILE, JSON.stringify(next, null, 2) + "\n");
  console.log(`Updated: ${videos.length} videos (${videos.length - existing.videos.length} new).`);
}
