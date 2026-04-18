import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent } from 'undici';

const insecureDispatcher = new Agent({
  connect: { rejectUnauthorized: false },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPORTS_FEED = 'https://vnexpress.net/rss/the-thao.rss';

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function extractImage(description = '') {
  const match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssRegex(xml) {
  const channelTitle = (xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const items = itemBlocks.map((block) => {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      if (!m) return '';
      let v = m[1];
      const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cdata) v = cdata[1];
      return v.trim();
    };
    const description = pick('description');
    return {
      title: stripHtml(pick('title')),
      link: pick('link'),
      pubDate: pick('pubDate'),
      description: stripHtml(description),
      image: extractImage(description),
    };
  });
  return { channel: { title: stripHtml(channelTitle), description: '' }, items };
}

async function fetchFeed(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(url, {
    dispatcher: insecureDispatcher,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);

  const xml = await res.text();
  const data = parseRssRegex(xml);

  cache.set(url, { at: Date.now(), data });
  return data;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (_req, res) => {
  try {
    const data = await fetchFeed(SPORTS_FEED);
    res.json({ success: true, data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`VnSports reader → http://localhost:${PORT}`);
});
