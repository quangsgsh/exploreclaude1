import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SPORTS_FEED = 'https://vnexpress.net/rss/the-thao.rss';
const OUTPUT = 'docs/news.json';

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

function parseRss(xml) {
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
  return { channel: { title: stripHtml(channelTitle) }, items };
}

const res = await fetch(SPORTS_FEED, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  },
});

if (!res.ok) {
  throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
}

const xml = await res.text();
const data = parseRss(xml);

if (data.items.length === 0) {
  throw new Error('No items parsed from feed — refusing to overwrite');
}

const output = {
  channel: data.channel,
  items: data.items,
  fetchedAt: new Date().toISOString(),
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
console.log(`Wrote ${data.items.length} items to ${OUTPUT}`);
