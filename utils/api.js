/**
 * API Integration Utilities
 */

const axios = require('axios');

const api = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// API Endpoints
const APIs = {
  // Image Generation
  generateImage: async (prompt) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/ai/stablediffusion`, {
        params: { prompt }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to generate image');
    }
  },
  
  // AI Chat - Shizo API
  chatAI: async (text) => {
    try {
      const response = await api.get(`https://api.shizo.top/ai/gpt?apikey=shizo&query=${encodeURIComponent(text)}`);
      if (response.data && response.data.msg) {
        return { msg: response.data.msg };
      }
      return response.data;
    } catch (error) {
      throw new Error('Failed to get AI response');
    }
  },
  
  // YouTube Download
  ytDownload: async (url, type = 'audio') => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/d/ytmp3`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download YouTube video');
    }
  },
  
  // Instagram Download
  igDownload: async (url) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/d/igdl`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download Instagram content');
    }
  },
  
  // TikTok Download
  tiktokDownload: async (url) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/d/tiktok`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download TikTok video');
    }
  },
  
  // Translate
  translate: async (text, to = 'en') => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/tools/translate`, {
        params: { text, to }
      });
      return response.data;
    } catch (error) {
      throw new Error('Translation failed');
    }
  },
  
  // Random Meme
  getMeme: async () => {
    try {
      const response = await api.get('https://meme-api.com/gimme');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch meme');
    }
  },
  
  // Random Quote
  getQuote: async () => {
    try {
      const response = await api.get('https://api.quotable.io/random');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch quote');
    }
  },
  
  // Random Joke
  getJoke: async () => {
    try {
      const response = await api.get('https://official-joke-api.appspot.com/random_joke');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch joke');
    }
  },
  
  // Weather
  getWeather: async (city) => {
    try {
      const response = await api.get(`https://api.siputzx.my.id/api/tools/weather`, {
        params: { city }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch weather');
    }
  },
  
  // Shorten URL
  shortenUrl: async (url) => {
    try {
      const response = await api.get(`https://tinyurl.com/api-create.php`, {
        params: { url }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to shorten URL');
    }
  },
  
  // Wikipedia Search
  wikiSearch: async (query) => {
    try {
      const response = await api.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw new Error('Wikipedia search failed');
    }
  },
  
  // Song Download APIs
  getIzumiDownloadByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube?url returned no download');
  },
  
  getIzumiDownloadByQuery: async (query) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(query)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi youtube-play returned no download');
  },
  
  getYupraDownloadByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
      return {
        download: res.data.data.download_url,
        title: res.data.data.title,
        thumbnail: res.data.data.thumbnail
      };
    }
    throw new Error('Yupra returned no download');
  },
  
  getOkatsuDownloadByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
      return {
        download: res.data.dl,
        title: res.data.title,
        thumbnail: res.data.thumb
      };
    }
    throw new Error('Okatsu ytmp3 returned no download');
  },
  
  getEliteProTechDownloadByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
      return {
        download: res.data.downloadURL,
        title: res.data.title
      };
    }
    throw new Error('EliteProTech ytdown returned no download');
  },
  
    getEliteProTechVideoByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
      return {
        download: res.data.downloadURL,
        title: res.data.title
      };
    }
    throw new Error('EliteProTech ytdown video returned no download');
  },
  
  // Video Download APIs
  getYupraVideoByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
      return {
        download: res.data.data.download_url,
        title: res.data.data.title,
        thumbnail: res.data.data.thumbnail
      };
    }
    throw new Error('Yupra returned no download');
  },
  
  getOkatsuVideoByUrl: async (youtubeUrl) => {
    const AXIOS_DEFAULTS = {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };
    
    const tryRequest = async (getter, attempts = 3) => {
      let lastError;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await getter();
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
      throw lastError;
    };
    
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
      return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu ytmp4 returned no mp4');
  },
  
  // TikTok Download API
  getTikTokDownload: async (url) => {
    const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;
    try {
      const response = await axios.get(apiUrl, { 
        timeout: 15000,
        headers: {
          'accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data && response.data.status && response.data.data) {
        let videoUrl = null;
        let title = null;
        
        if (response.data.data.urls && Array.isArray(response.data.data.urls) && response.data.data.urls.length > 0) {
          videoUrl = response.data.data.urls[0];
          title = response.data.data.metadata?.title || 'TikTok Video';
        } else if (response.data.data.video_url) {
          videoUrl = response.data.data.video_url;
          title = response.data.data.metadata?.title || 'TikTok Video';
        } else if (response.data.data.url) {
          videoUrl = response.data.data.url;
          title = response.data.data.metadata?.title || 'TikTok Video';
        } else if (response.data.data.download_url) {
          videoUrl = response.data.data.download_url;
          title = response.data.data.metadata?.title || 'TikTok Video';
        }
        
        return { videoUrl, title };
      }
      throw new Error('Invalid API response');
    } catch (error) {
      throw new Error('TikTok download failed');
    }
  },
  
  // Screenshot Website API
  screenshotWebsite: async (url) => {
    try {
      const apiUrl = `https://eliteprotech-apis.zone.id/ssweb?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl, {
        timeout: 30000,
        responseType: 'arraybuffer',
        headers: {
          'accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Return the image buffer directly (API returns PNG binary)
      if (response.headers['content-type']?.includes('image')) {
        return Buffer.from(response.data);
      }
      
      // If API returns JSON with URL, try to parse it
      try {
        const data = JSON.parse(Buffer.from(response.data).toString());
        return data.url || data.data?.url || data.image || apiUrl;
      } catch (e) {
        // If not JSON, assume it's image data and return buffer
        return Buffer.from(response.data);
      }
    } catch (error) {
      throw new Error('Failed to take screenshot');
    }
  },
  
  // ── YouTube Audio Download – 10 fallback sources ──────────────────────────
  getYTAudioSources: (url) => {
    const enc = encodeURIComponent(url);
    return [
      async () => {
        const r = await api.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${enc}`);
        const d = r.data?.data;
        if (d?.download) return { download: d.download, title: d.title, duration: d.duration };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.vreden.my.id/api/ytmp3?url=${enc}`);
        const d = r.data?.result;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.nekosite.tech/download/ytmp3?url=${enc}`);
        const d = r.data?.data || r.data;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await axios.post('https://co.wuk.sh/api/json', { url }, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 30000
        });
        if (r.data?.url) return { download: r.data.url, title: 'YouTube Audio' };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://ytdl.fly.dev/ytdl?url=${enc}&format=mp3`);
        const d = r.data;
        if (d?.url) return { download: d.url, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://bk9.fun/download/ytmp3?url=${enc}`);
        const d = r.data?.BK9 || r.data;
        if (d?.url) return { download: d.url, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.agcresi.net/api/ytmp3?url=${enc}`);
        const d = r.data?.result || r.data;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.tipmee.online/api/dl/yt-audio?url=${enc}`);
        const d = r.data?.data || r.data;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      }
    ];
  },

  // ── YouTube Video Download – 8 fallback sources ───────────────────────────
  getYTVideoSources: (url) => {
    const enc = encodeURIComponent(url);
    return [
      async () => {
        const r = await api.get(`https://api.siputzx.my.id/api/d/ytmp4?url=${enc}`);
        const d = r.data?.data;
        if (d?.download) return { download: d.download, title: d.title, duration: d.duration };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.vreden.my.id/api/ytmp4?url=${enc}`);
        const d = r.data?.result;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await axios.post('https://co.wuk.sh/api/json', { url, vCodec: 'h264', vQuality: '720', aFormat: 'mp3' }, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 30000
        });
        if (r.data?.url) return { download: r.data.url, title: 'YouTube Video' };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://bk9.fun/download/ytmp4?url=${enc}`);
        const d = r.data?.BK9 || r.data;
        if (d?.url) return { download: d.url, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://api.agcresi.net/api/ytmp4?url=${enc}`);
        const d = r.data?.result || r.data;
        if (d?.download) return { download: d.download, title: d.title };
        throw new Error('no url');
      },
      async () => {
        const r = await api.get(`https://ytdl.fly.dev/ytdl?url=${enc}&format=mp4`);
        const d = r.data;
        if (d?.url) return { download: d.url, title: d.title };
        throw new Error('no url');
      }
    ];
  },

  // TikTok Download Sources - returns array of async functions for withFallback
  getTikTokSources: (url) => {
    const encoded = encodeURIComponent(url);
    return [
      async () => {
        const r = await api.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encoded}`);
        const d = r.data?.data || r.data;
        if (d?.video) return { videoUrl: d.video, title: d.title || 'TikTok Video' };
        throw new Error('No video');
      },
      async () => {
        const r = await api.get(`https://tikwm.com/api/?url=${encoded}&hd=1`);
        const d = r.data?.data;
        if (d?.play) return { videoUrl: d.play, title: d.title || 'TikTok Video' };
        throw new Error('No video');
      },
      async () => {
        const r = await api.post('https://ssstik.io/abc?url=dl', new URLSearchParams({ id: url, locale: 'en', tt: '' }), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const match = r.data?.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"[^>]*>Without watermark/);
        if (match) return { videoUrl: match[1], title: 'TikTok Video' };
        throw new Error('No video');
      },
      async () => {
        const r = await api.get(`https://api.tikmate.online/api/lookup?url=${encoded}`);
        const d = r.data;
        if (d?.token) {
          const dl = await api.get(`https://api.tikmate.online/download?token=${d.token}&id=${d.id}`);
          if (dl.request?.res?.responseUrl) return { videoUrl: dl.request.res.responseUrl, title: d.title || 'TikTok Video' };
        }
        throw new Error('No video');
      },
      async () => {
        const r = await api.get(`https://api.douyin.wtf/api?url=${encoded}&minimal=false`);
        const d = r.data;
        if (d?.video_data?.nwm_video_url_HQ) return { videoUrl: d.video_data.nwm_video_url_HQ, title: d.desc || 'TikTok Video' };
        throw new Error('No video');
      }
    ];
  },

  // AI Chat with multiple fallbacks
  chatAIWithFallbacks: async (text) => {
    const sources = [
      async () => {
        const r = await api.get(`https://api.siputzx.my.id/api/ai/gpt3?text=${encodeURIComponent(text)}`);
        const msg = r.data?.data || r.data?.msg;
        if (msg) return { response: msg };
        throw new Error('No response');
      },
      async () => {
        const r = await api.get(`https://api.shizo.top/ai/gpt?apikey=shizo&query=${encodeURIComponent(text)}`);
        if (r.data?.msg) return { response: r.data.msg };
        throw new Error('No response');
      },
      async () => {
        const r = await api.get(`https://pollinations.ai/prompt/${encodeURIComponent(text)}`);
        if (r.data) return { response: String(r.data) };
        throw new Error('No response');
      },
      async () => {
        const r = await api.get(`https://api.siputzx.my.id/api/ai/llama?text=${encodeURIComponent(text)}`);
        const msg = r.data?.data || r.data?.response;
        if (msg) return { response: msg };
        throw new Error('No response');
      }
    ];

    for (const src of sources) {
      try {
        return await src();
      } catch {}
    }
    throw new Error('All AI sources failed');
  },

  // Text to Speech API
  textToSpeech: async (text) => {
    try {
      const apiUrl = `https://www.laurine.site/api/tts/tts-nova?text=${encodeURIComponent(text)}`;
      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data) {
        // Check if response.data is a string (direct URL)
        if (typeof response.data === 'string' && (response.data.startsWith('http://') || response.data.startsWith('https://'))) {
          return response.data;
        }
        
        // Check nested data structure
        if (response.data.data) {
          const data = response.data.data;
          if (data.URL) return data.URL;
          if (data.url) return data.url;
          if (data.MP3) return `https://ttsmp3.com/created_mp3_ai/${data.MP3}`;
          if (data.mp3) return `https://ttsmp3.com/created_mp3_ai/${data.mp3}`;
        }
        
        // Check top-level URL fields
        if (response.data.URL) return response.data.URL;
        if (response.data.url) return response.data.url;
        if (response.data.MP3) return `https://ttsmp3.com/created_mp3_ai/${response.data.MP3}`;
        if (response.data.mp3) return `https://ttsmp3.com/created_mp3_ai/${response.data.mp3}`;
      }
      
      throw new Error('Invalid API response structure');
    } catch (error) {
      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }
};

module.exports = APIs;
