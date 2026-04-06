/**
 * Facebook Video Downloader
 * Strategy: Direct page scrape (most reliable) → 10 API fallbacks
 */

const axios = require('axios');
const config = require('../../config');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_MOB = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';

const FB_REGEX = /https?:\/\/(www\.|m\.|web\.|mbasic\.)?facebook\.com\/.+|https?:\/\/(www\.)?fb\.watch\/.+|https?:\/\/fb\.com\/.+/i;

// ── Decode Facebook-escaped URLs ──────────────────────────────────────────────
function decodeUrl(u) {
  return u ? u.replace(/\\u0025/g, '%').replace(/\\/g, '') : null;
}

// ── Extract video URLs directly from Facebook page HTML ───────────────────────
async function scrapeDirectFromFacebook(url) {
  // First try mobile version (less JS-heavy, easier to scrape)
  const mobileUrl = url.replace('www.facebook.com', 'mbasic.facebook.com')
                       .replace('m.facebook.com', 'mbasic.facebook.com');

  const headers = {
    'User-Agent': UA_MOB,
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate'
  };

  let html = '';

  // Try mbasic first
  try {
    const r = await axios.get(mobileUrl, { headers, timeout: 25000, maxRedirects: 5 });
    html = r.data;
  } catch {
    // Try regular www
    try {
      const r = await axios.get(url, { headers: { ...headers, 'User-Agent': UA }, timeout: 25000 });
      html = r.data;
    } catch {}
  }

  if (!html) return null;

  // Patterns to extract video URLs from Facebook HTML
  const patterns = [
    /"hd_src":"([^"]+)"/,
    /"sd_src":"([^"]+)"/,
    /"browser_native_hd_url":"([^"]+)"/,
    /"browser_native_sd_url":"([^"]+)"/,
    /"playable_url_quality_hd":"([^"]+)"/,
    /"playable_url":"([^"]+)"/,
    /hd_src_no_ratelimit:"([^"]+)"/,
    /sd_src_no_ratelimit:"([^"]+)"/,
    /"video_url":"([^"]+)"/,
    /data-store="([^"]+)"[^>]*video/
  ];

  let hdUrl = null;
  let sdUrl = null;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const decoded = decodeUrl(match[1]);
      if (!decoded || !decoded.startsWith('http')) continue;
      if (pattern.source.includes('hd')) {
        hdUrl = hdUrl || decoded;
      } else {
        sdUrl = sdUrl || decoded;
      }
    }
  }

  const videoUrl = hdUrl || sdUrl;
  if (!videoUrl) return null;

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/ \| Facebook$/i, '').trim() : 'Facebook Video';

  return { url: videoUrl, quality: hdUrl ? 'HD' : 'SD', title };
}

// ── API fallback sources ──────────────────────────────────────────────────────
function getApiSources(url) {
  const encoded = encodeURIComponent(url);
  return [
    // 1. fdownloader.net (very reliable)
    async () => {
      const r = await axios.get(`https://api.fdownloader.net/api/download?url=${encoded}&lang=en`, {
        headers: { 'User-Agent': UA, 'Origin': 'https://fdownloader.net', 'Referer': 'https://fdownloader.net/' },
        timeout: 25000
      });
      const d = r.data?.data || r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 2. snapsave.app (POST — very reliable)
    async () => {
      const r = await axios.post('https://snapsave.app/action.php',
        new URLSearchParams({ url }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Origin': 'https://snapsave.app',
            'Referer': 'https://snapsave.app/'
          },
          timeout: 25000
        }
      );
      const hdMatch = r.data?.match(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*HD/);
      const sdMatch = r.data?.match(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*SD/);
      const anyMatch = r.data?.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/);
      const videoUrl = hdMatch?.[1] || sdMatch?.[1] || anyMatch?.[1];
      if (videoUrl) return { url: videoUrl.replace(/&amp;/g, '&'), title: 'Facebook Video', quality: hdMatch ? 'HD' : 'SD' };
      throw new Error('no video');
    },
    // 3. getfvid.com (POST)
    async () => {
      const r = await axios.post('https://www.getfvid.com/downloader',
        new URLSearchParams({ url, ajax: '1' }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Referer': 'https://www.getfvid.com/'
          },
          timeout: 25000
        }
      );
      const data = typeof r.data === 'object' ? r.data : {};
      if (data.hd_url) return { url: data.hd_url, title: data.title || 'Facebook Video', quality: 'HD' };
      if (data.sd_url) return { url: data.sd_url, title: data.title || 'Facebook Video', quality: 'SD' };
      // Also try HTML match
      const match = String(r.data).match(/href="(https?:\/\/video[^"]+)"/);
      if (match) return { url: match[1].replace(/&amp;/g, '&'), title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 4. siputzx API
    async () => {
      const r = await axios.get(`https://api.siputzx.my.id/api/d/fb?url=${encoded}`, { timeout: 20000 });
      const d = r.data?.data || r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      if (d?.url) return { url: d.url, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 5. fbdown.best (POST)
    async () => {
      const r = await axios.post('https://fbdown.best/wp-json/aio-dl/video-data/',
        JSON.stringify({ url }),
        { headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, timeout: 25000 }
      );
      const medias = r.data?.medias;
      if (Array.isArray(medias) && medias.length) {
        const hd = medias.find(m => m.quality === 'hd' || (m.quality && m.quality.includes('HD')));
        const item = hd || medias[0];
        if (item?.url) return { url: item.url, title: r.data?.title || 'Facebook Video', quality: item.quality || 'SD' };
      }
      throw new Error('no video');
    },
    // 6. savethevideo API
    async () => {
      const r = await axios.get(`https://savethevideo.net/api/json?url=${encoded}`, {
        headers: { 'User-Agent': UA, 'Referer': 'https://savethevideo.net/' },
        timeout: 20000
      });
      const d = r.data;
      if (d?.url) return { url: d.url, title: d.title || 'Facebook Video', quality: 'SD' };
      if (Array.isArray(d?.links) && d.links[0]) return { url: d.links[0].url, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 7. fbvid.com scrape (POST)
    async () => {
      const r = await axios.post('https://fbvid.com/wp-json/aio-dl/video-data/',
        JSON.stringify({ url }),
        { headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, timeout: 25000 }
      );
      const medias = r.data?.medias;
      if (Array.isArray(medias) && medias.length && medias[0]?.url) {
        return { url: medias[0].url, title: r.data?.title || 'Facebook Video', quality: 'SD' };
      }
      throw new Error('no video');
    },
    // 8. Vreden API
    async () => {
      const r = await axios.get(`https://api.vreden.my.id/api/fb?url=${encoded}`, { timeout: 20000 });
      const d = r.data?.result;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 9. saveig.best style
    async () => {
      const r = await axios.post('https://saveig.best/api/ajaxSearch',
        new URLSearchParams({ q: url, t: 'media', lang: 'en' }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, timeout: 25000 }
      );
      const html2 = typeof r.data === 'string' ? r.data : r.data?.data || '';
      const match2 = html2.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/);
      if (match2) return { url: match2[1].replace(/&amp;/g, '&'), title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 10. bk9 API
    async () => {
      const r = await axios.get(`https://bk9.fun/download/fb?url=${encoded}`, { timeout: 20000 });
      const d = r.data?.BK9 || r.data?.data || r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      if (d?.url) return { url: d.url, title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 11. ytdl-api-wrapper style (co.wuk.sh) — supports fb
    async () => {
      const r = await axios.post('https://co.wuk.sh/api/json',
        { url, vQuality: '720' },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 25000 }
      );
      if (r.data?.url) return { url: r.data.url, title: 'Facebook Video', quality: 'HD' };
      if (r.data?.audio) return { url: r.data.audio, title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 12. y2mate style scrape
    async () => {
      const r = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax',
        new URLSearchParams({ k_query: url, k_page: 'Facebook', hl: 'en', q_auto: 1 }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, timeout: 25000 }
      );
      const links = r.data?.links?.mp4;
      if (links) {
        const keys = Object.keys(links);
        const best = keys.find(k => k.includes('1080') || k.includes('720') || k.includes('480')) || keys[0];
        if (best && links[best]?.url) return { url: links[best].url, title: r.data?.title || 'Facebook Video', quality: best };
      }
      throw new Error('no video');
    },
    // 13. loader.to API
    async () => {
      const r = await axios.get(`https://loader.to/api/button/?url=${encoded}&f=mp4`, {
        headers: { 'User-Agent': UA }, timeout: 20000
      });
      const vid = r.data?.url || r.data?.download_url;
      if (vid) return { url: vid, title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 14. rapidapi savefrom-style (unofficial)
    async () => {
      const r = await axios.get(`https://api.savefrom.net/api/convert/?url=${encoded}`, {
        headers: { 'User-Agent': UA, 'Referer': 'https://en.savefrom.net/' }, timeout: 20000
      });
      const medias = r.data?.[0]?.medias || r.data?.medias;
      if (Array.isArray(medias) && medias.length) {
        const hd = medias.find(m => m.quality === '720p' || m.quality === '480p') || medias[0];
        if (hd?.url) return { url: hd.url, title: r.data?.[0]?.meta?.title || 'Facebook Video', quality: hd.quality || 'SD' };
      }
      throw new Error('no video');
    },
    // 15. nDownloader-style (supports facebook)
    async () => {
      const r = await axios.post('https://ndownloader.com/api/download',
        new URLSearchParams({ url }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, timeout: 25000 }
      );
      const d = r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 16. SnapSave alternative endpoint
    async () => {
      const r = await axios.post('https://snapsave.io/action.php',
        new URLSearchParams({ url }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Origin': 'https://snapsave.io',
            'Referer': 'https://snapsave.io/'
          },
          timeout: 25000
        }
      );
      const m = String(r.data).match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/);
      if (m) return { url: m[1].replace(/&amp;/g, '&'), title: 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 17. fdown.net API
    async () => {
      const r = await axios.get(`https://fdown.net/api/v1/download?url=${encoded}`, {
        headers: { 'User-Agent': UA, 'Referer': 'https://fdown.net/' }, timeout: 20000
      });
      const d = r.data;
      if (d?.links?.Download_HD) return { url: d.links.Download_HD, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.links?.Download_SD) return { url: d.links.Download_SD, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 18. fbdownloader.net
    async () => {
      const r = await axios.get(`https://fbdownloader.net/api/?url=${encoded}`, {
        headers: { 'User-Agent': UA }, timeout: 20000
      });
      const d = r.data?.data || r.data;
      if (d?.hd_link) return { url: d.hd_link, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd_link) return { url: d.sd_link, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 19. Nayan API
    async () => {
      const r = await axios.get(`https://api.nayan.my.id/api/fb?url=${encoded}`, { timeout: 20000 });
      const d = r.data?.result || r.data?.data || r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    },
    // 20. Dylux API (another free fallback)
    async () => {
      const r = await axios.get(`https://api.dylux.me/fb?url=${encoded}`, { timeout: 20000 });
      const d = r.data?.data || r.data;
      if (d?.hd) return { url: d.hd, title: d.title || 'Facebook Video', quality: 'HD' };
      if (d?.sd) return { url: d.sd, title: d.title || 'Facebook Video', quality: 'SD' };
      throw new Error('no video');
    }
  ];
}

// ── Download video as buffer ──────────────────────────────────────────────────
async function toBuffer(videoUrl) {
  const r = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 200 * 1024 * 1024,
    headers: {
      'User-Agent': UA,
      'Referer': 'https://www.facebook.com/',
      'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
    }
  });
  const buf = Buffer.from(r.data);
  if (!buf || buf.length < 5000) throw new Error('buffer too small');
  return buf;
}

// ── Main module ───────────────────────────────────────────────────────────────
module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'facebookdl'],
  category: 'media',
  description: 'Download Facebook videos',
  usage: '.facebook <Facebook URL>',

  async execute(sock, msg, args, extra) {
    try {
      const url = args.join(' ').trim();

      if (!url) {
        return extra.reply(
          '📘 *Facebook Video Downloader*\n\n' +
          `Usage: *${extra.prefix || '.'}facebook <URL>*\n\n` +
          'Supports:\n• facebook.com/watch\n• facebook.com/reels\n• fb.watch links\n• Video posts'
        );
      }

      if (!FB_REGEX.test(url)) {
        return extra.reply('❌ Invalid Facebook link. Please send a valid Facebook video URL.');
      }

      await sock.sendMessage(extra.from, { react: { text: '🔄', key: msg.key } });

      let result = null;

      // Strategy 1: Direct page scrape (fastest, no API limit)
      try {
        result = await scrapeDirectFromFacebook(url);
        if (result?.url) console.log('[FB] ✅ Direct scrape succeeded');
      } catch (e) {
        console.log('[FB] Direct scrape failed:', e.message);
      }

      // Strategy 2-11: API fallbacks
      if (!result?.url) {
        const sources = getApiSources(url);
        for (let i = 0; i < sources.length; i++) {
          try {
            result = await sources[i]();
            if (result?.url) {
              console.log(`[FB] ✅ API source ${i + 1} succeeded`);
              break;
            }
          } catch (e) {
            console.log(`[FB] API ${i + 1} failed: ${e.message}`);
          }
        }
      }

      if (!result?.url) {
        return extra.reply(
          '❌ *Download Failed*\n\n' +
          'Could not download this video. Possible reasons:\n' +
          '• Video is private or friends-only\n' +
          '• Link has expired\n' +
          '• Video was deleted\n\n' +
          '_Please ensure the video is publicly accessible._'
        );
      }

      const caption =
        `📘 *Facebook Video*\n` +
        (result.title && result.title !== 'Facebook Video' ? `📌 ${result.title}\n` : '') +
        `📊 Quality: ${result.quality || 'SD'}\n\n` +
        `> _Downloaded by ${config.botName}_`;

      // Try to send as buffer first (more reliable delivery)
      let sent = false;
      try {
        const buf = await toBuffer(result.url);
        await sock.sendMessage(extra.from, {
          video: buf,
          mimetype: 'video/mp4',
          caption
        }, { quoted: msg });
        sent = true;
      } catch (bufErr) {
        console.log('[FB] Buffer send failed, trying URL method:', bufErr.message);
      }

      // Fallback: send by URL directly
      if (!sent) {
        await sock.sendMessage(extra.from, {
          video: { url: result.url },
          mimetype: 'video/mp4',
          caption
        }, { quoted: msg });
      }

      await sock.sendMessage(extra.from, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      console.error('[Facebook] Fatal error:', error.message);
      await extra.reply('❌ An error occurred. Please try again with a different link.');
    }
  }
};
