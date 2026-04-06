/**
 * Lyrics Finder - 10+ API fallbacks
 */

const axios = require('axios');
const config = require('../../config');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getSources(query) {
  const q = encodeURIComponent(query);
  return [
    // 1. Lyrics.ovh (free, no key)
    async () => {
      const search = await axios.get(`https://api.lyrics.ovh/suggest/${q}`, { timeout: 10000 });
      const top = search.data?.data?.[0];
      if (!top) throw new Error('No result');
      const artist = top.artist.name, title = top.title;
      const r = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 10000 });
      if (r.data?.lyrics) return { title, artist, lyrics: r.data.lyrics };
      throw new Error('No lyrics');
    },
    // 2. Siputzx
    async () => {
      const r = await axios.get(`https://api.siputzx.my.id/api/s/lyrics?query=${q}`, { timeout: 15000 });
      const d = r.data?.data;
      if (d?.lyrics) return { title: d.title, artist: d.artist, lyrics: d.lyrics, thumbnail: d.image };
      throw new Error('No lyrics');
    },
    // 3. Vreden
    async () => {
      const r = await axios.get(`https://api.vreden.my.id/api/lyrics?query=${q}`, { timeout: 15000 });
      const d = r.data?.result;
      if (d?.lyrics) return { title: d.title, artist: d.artist, lyrics: d.lyrics, thumbnail: d.thumbnail };
      throw new Error('No lyrics');
    },
    // 4. Genius via lyricsgenius-style API
    async () => {
      const r = await axios.get(`https://some-random-api.com/lyrics?title=${q}`, { timeout: 15000, headers: { 'User-Agent': UA } });
      if (r.data?.lyrics) return {
        title: r.data.title,
        artist: r.data.author,
        lyrics: r.data.lyrics,
        thumbnail: r.data.thumbnail?.genius
      };
      throw new Error('No lyrics');
    },
    // 5. Chart-lyrics
    async () => {
      const search = await axios.get(`https://api.chartlyrics.com/apiv1.asmx/SearchLyric?lyricText=&artist=&song=${q}`, { timeout: 15000 });
      const match = search.data?.match(/<TrackId>(\d+)<\/TrackId>.*?<Checksum>([^<]+)<\/Checksum>/s);
      if (!match) throw new Error('No result');
      const lyricResp = await axios.get(`https://api.chartlyrics.com/apiv1.asmx/GetLyric?lyricId=${match[1]}&lyricCheckSum=${match[2]}`, { timeout: 15000 });
      const lyricMatch = lyricResp.data?.match(/<Lyric><!\[CDATA\[([\s\S]+?)\]\]><\/Lyric>/);
      if (lyricMatch) return { title: query, artist: 'Unknown', lyrics: lyricMatch[1] };
      throw new Error('No lyrics');
    },
    // 6. Happi.dev lyrics (free tier)
    async () => {
      const r = await axios.get(`https://api.happi.dev/v1/music?q=${q}&limit=1&type=0`, {
        timeout: 15000, headers: { 'x-happi-key': 'free' }
      });
      const song = r.data?.result?.[0];
      if (!song) throw new Error('No result');
      const lr = await axios.get(song.api_lyrics, { timeout: 15000, headers: { 'x-happi-key': 'free' } });
      if (lr.data?.result?.lyrics) return { title: song.track, artist: song.artist, lyrics: lr.data.result.lyrics };
      throw new Error('No lyrics');
    },
    // 7. musixmatch via public API
    async () => {
      const r = await axios.get(`https://api.musixmatch.com/ws/1.1/track.search?q_track_artist=${q}&page_size=1&s_track_rating=desc&apikey=`, { timeout: 15000 });
      throw new Error('No API key'); // Skip without key
    },
    // 8. lrclib (synchronized lyrics)
    async () => {
      const r = await axios.get(`https://lrclib.net/api/search?q=${q}`, { timeout: 15000, headers: { 'User-Agent': UA } });
      const top = r.data?.[0];
      if (top?.plainLyrics) return { title: top.trackName, artist: top.artistName, lyrics: top.plainLyrics };
      throw new Error('No lyrics');
    },
    // 9. Azlyrics scrape
    async () => {
      const searchR = await axios.get(`https://search.azlyrics.com/search.php?q=${q}`, { timeout: 15000, headers: { 'User-Agent': UA } });
      const linkMatch = searchR.data?.match(/href="(https:\/\/www\.azlyrics\.com\/lyrics\/[^"]+)"/);
      if (!linkMatch) throw new Error('No result');
      const pageR = await axios.get(linkMatch[1], { timeout: 20000, headers: { 'User-Agent': UA } });
      const lyricsMatch = pageR.data?.match(/<!-- Usage of azlyrics\.com content[^>]*>.*?<\/div>.*?<div[^>]*>([\s\S]+?)<\/div>/);
      if (lyricsMatch) {
        const lyrics = lyricsMatch[1].replace(/<[^>]*>/g, '').trim();
        const titleMatch = pageR.data?.match(/<title>([^<]+) Lyrics<\/title>/);
        return { title: titleMatch?.[1] || query, artist: 'Unknown', lyrics };
      }
      throw new Error('No lyrics');
    },
    // 10. Spotify unofficial lyrics search
    async () => {
      const r = await axios.get(`https://api.song.link/v1-alpha.1/links?url=${q}&userCountry=US`, { timeout: 15000 });
      throw new Error('No lyrics from song.link');
    }
  ];
}

module.exports = {
  name: 'lyrics',
  aliases: ['lyric', 'lirik', 'lrc'],
  category: 'media',
  description: 'Get lyrics of any song',
  usage: '.lyrics <song name>',

  async execute(sock, msg, args, extra) {
    try {
      if (!args.length) {
        return extra.reply(`❌ Please provide a song name!\n\nExample: ${config.prefix}lyrics Despacito`);
      }

      const query = args.join(' ');

      await sock.sendMessage(extra.from, { react: { text: '🔍', key: msg.key } });

      let lyricsData = null;
      const sources = getSources(query);

      for (const source of sources) {
        try {
          lyricsData = await source();
          if (lyricsData?.lyrics) break;
        } catch {
          // Try next source
        }
      }

      if (!lyricsData?.lyrics) {
        return extra.reply(`❌ Could not find lyrics for *${query}*. Please check the song name and try again.`);
      }

      // Format lyrics
      let lyrics = lyricsData.lyrics.trim();
      if (lyrics.length > 4500) {
        lyrics = lyrics.substring(0, 4500) + '\n\n_...Lyrics truncated (too long)_';
      }

      const caption =
        `🎵 *${lyricsData.title || query}*\n` +
        `👤 *Artist:* ${lyricsData.artist || 'Unknown'}\n\n` +
        `📝 *Lyrics:*\n\n${lyrics}\n\n` +
        `> _Fetched by ${config.botName}_`;

      if (lyricsData.thumbnail) {
        try {
          await sock.sendMessage(extra.from, {
            image: { url: lyricsData.thumbnail },
            caption
          }, { quoted: msg });
          return;
        } catch {}
      }

      await sock.sendMessage(extra.from, { text: caption }, { quoted: msg });

    } catch (error) {
      console.error('[lyrics] Error:', error.message);
      await extra.reply('❌ An error occurred while fetching lyrics. Please try again.');
    }
  }
};
