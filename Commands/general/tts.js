/**
 * TTS Command - Text to Speech using free Google TTS API
 */

const axios = require('axios');
const config = require('../../config');

const LANG_CODES = {
  en: 'en', ur: 'ur', hi: 'hi', ar: 'ar', fr: 'fr',
  es: 'es', de: 'de', it: 'it', pt: 'pt', ru: 'ru',
  ja: 'ja', ko: 'ko', zh: 'zh-CN', tr: 'tr', nl: 'nl'
};

async function getTTSBuffer(text, lang = 'en') {
  const encodedText = encodeURIComponent(text.slice(0, 200));

  const sources = [
    async () => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;
      const r = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }
      });
      return Buffer.from(r.data);
    },
    async () => {
      const url = `https://api.voicerss.org/?key=&hl=${lang}-${lang.toUpperCase()}&src=${encodedText}&c=MP3&f=16khz_16bit_stereo`;
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
      return Buffer.from(r.data);
    },
    async () => {
      const url = `https://www.laurine.site/api/tts/tts-nova?text=${encodedText}`;
      const r = await axios.get(url, { timeout: 20000 });
      const audioUrl = r.data?.url || r.data?.data?.url || (typeof r.data === 'string' ? r.data : null);
      if (!audioUrl) throw new Error('No audio URL');
      const audio = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 20000 });
      return Buffer.from(audio.data);
    }
  ];

  for (const source of sources) {
    try {
      const buf = await source();
      if (buf && buf.length > 1000) return buf;
    } catch {}
  }
  throw new Error('All TTS sources failed');
}

module.exports = {
  name: 'tts',
  aliases: ['speak', 'voice'],
  category: 'general',
  description: 'Convert text to speech audio',
  usage: '.tts <text> [lang]',

  async execute(sock, msg, args, extra) {
    try {
      if (!args.length) {
        return extra.reply('🗣️ Usage: *.tts <text> [lang]*\nExample: .tts Hello World\n.tts Salam ur\n\nLanguages: en, ur, hi, ar, fr, es, de, it, pt, ru, ja, ko, zh, tr');
      }

      let lang = 'en';
      const lastArg = args[args.length - 1].toLowerCase();
      if (LANG_CODES[lastArg]) {
        lang = LANG_CODES[lastArg];
        args = args.slice(0, -1);
      }

      const text = args.join(' ').trim();
      if (!text) return extra.reply('❌ Please provide text to convert!');

      await sock.sendMessage(extra.from, { react: { text: '🔄', key: msg.key } });

      const audioBuffer = await getTTSBuffer(text, lang);

      await sock.sendMessage(extra.from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        caption: `🗣️ TTS: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" [${lang}]`
      }, { quoted: msg });

    } catch (err) {
      console.error('[TTS] Error:', err.message);
      await extra.reply('❌ Failed to generate TTS audio. Please try again.');
    }
  }
};
