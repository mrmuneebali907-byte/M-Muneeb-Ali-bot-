/**
 * Pinterest Downloader - Download images/videos from Pinterest
 */

const axios = require('axios');
const config = require('../../config');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

module.exports = {
  name: 'pinterest',
  aliases: ['pin', 'pindl', 'pinterestdl'],
  category: 'media',
  description: 'Download images/videos from Pinterest',
  usage: '.pinterest <Pinterest URL>',
  
  async execute(sock, msg, args, extra) {
    try {
      // Check if message has already been processed
      if (processedMessages.has(msg.key.id)) {
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(msg.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(msg.key.id);
      }, 5 * 60 * 1000);
      
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text ||
                   args.join(' ');
      
      if (!text) {
        return await extra.reply(
          '📌 *Pinterest Downloader*\n\n' +
          'Download images or videos from Pinterest.\n\n' +
          `Usage: ${config.prefix}pinterest <Pinterest URL>\n\n` +
          'Example:\n' +
          `${config.prefix}pinterest https://in.pinterest.com/pin/1109363320773690068/`
        );
      }
      
      // Extract URL from text - match Pinterest pin URLs (including pin.it shortened URLs)
      let urlMatch = text.match(/https?:\/\/[^\s]*pinterest[^\s]*\/pin\/[^\s]+/i);
      
      // Also match pin.it shortened URLs
      if (!urlMatch) {
        urlMatch = text.match(/https?:\/\/pin\.it\/[^\s]+/i);
      }
      
      // Match pin.it without https
      if (!urlMatch) {
        urlMatch = text.match(/pin\.it\/[^\s]+/i);
      }
      
      if (!urlMatch) {
        return await extra.reply('❌ Please provide a valid Pinterest pin URL!\n\nExamples:\n• https://in.pinterest.com/pin/1109363320773690068/\n• https://pin.it/dddddd\n• pin.it/dddddd');
      }
      
      const pinterestUrl = urlMatch[0];
      
      await sock.sendMessage(extra.from, {
        react: { text: '📥', key: msg.key }
      });
      
      const encoded = encodeURIComponent(pinterestUrl);
      const UA_HDR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      // Multi-API fallback sources
      const pinterestSources = [
        async () => {
          const r = await axios.get(`https://api.nexray.web.id/downloader/pinterest?url=${encoded}`, { timeout: 25000, headers: { 'User-Agent': UA_HDR } });
          const d = r.data?.result;
          if (d) return { url: d.video || d.image || d.url, isVideo: !!d.video, title: d.title || 'Pinterest Pin', author: d.author };
          throw new Error('No data');
        },
        async () => {
          const r = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?url=${encoded}`, { timeout: 20000 });
          const d = r.data?.data;
          if (d?.url) return { url: d.url, isVideo: d.type === 'video', title: d.title || 'Pinterest Pin', author: '' };
          throw new Error('No data');
        },
        async () => {
          const r = await axios.get(`https://toolsdl.net/api/pinterest?url=${encoded}`, { timeout: 20000, headers: { 'User-Agent': UA_HDR } });
          const d = r.data;
          if (d?.url) return { url: d.url, isVideo: /\.mp4/.test(d.url), title: d.title || 'Pinterest Pin', author: '' };
          throw new Error('No data');
        },
        async () => {
          const r = await axios.get(`https://api.tiklydown.eu.org/api/download/v2?url=${encoded}`, { timeout: 20000 });
          const d = r.data?.data;
          if (d?.play) return { url: d.play, isVideo: true, title: d.title || 'Pinterest Pin', author: '' };
          if (d?.origin?.images?.[0]) return { url: d.origin.images[0].url, isVideo: false, title: d.title || 'Pinterest Pin', author: '' };
          throw new Error('No data');
        },
        async () => {
          const r = await axios.post('https://pinterestdownloader.com/download', { url: pinterestUrl }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': UA_HDR },
            timeout: 25000
          });
          const d = r.data;
          if (d?.download_url) return { url: d.download_url, isVideo: /\.mp4/.test(d.download_url || ''), title: d.title || 'Pinterest Pin', author: '' };
          throw new Error('No data');
        },
        async () => {
          const r = await axios.get(`https://www.savepin.app/download.php?url=${encoded}&loop=0&lang=en`, {
            headers: { 'User-Agent': UA_HDR, 'Referer': 'https://www.savepin.app/' }, timeout: 25000
          });
          const vidMatch = r.data?.match(/href="([^"]+\.mp4[^"]*)"/);
          const imgMatch = r.data?.match(/href="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/);
          if (vidMatch) return { url: vidMatch[1].replace(/&amp;/g, '&'), isVideo: true, title: 'Pinterest Pin', author: '' };
          if (imgMatch) return { url: imgMatch[1].replace(/&amp;/g, '&'), isVideo: false, title: 'Pinterest Pin', author: '' };
          throw new Error('No data');
        }
      ];

      let pinResult = null;
      for (const src of pinterestSources) {
        try {
          pinResult = await src();
          if (pinResult?.url) break;
        } catch {}
      }

      if (!pinResult?.url) {
        return await extra.reply('❌ Could not find media for this Pinterest pin. It may be private or unavailable.');
      }

      const imageUrl = pinResult.url;
      const isVideo = pinResult.isVideo;
      const title = pinResult.title || 'Pinterest Pin';
      const author = pinResult.author || '';
      
      // Build caption
      let caption = `📌 *${title}*\n\n`;
      if (author && author !== 'Unknown') {
        caption += `👤 Author: ${author}\n`;
      }
      caption += `\n*Downloaded by ${config.botName}*`;
      
      // Send only the main media (not thumbnail separately to avoid duplicates)
      if (isVideo) {
        // Download video as buffer (Pinterest tokenized URLs need to be downloaded)
        try {
          const videoResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes for video download
            maxContentLength: 100 * 1024 * 1024, // 100MB limit
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'video/mp4,video/*,*/*',
              'Referer': 'https://www.pinterest.com/'
            }
          });
          
          const videoBuffer = Buffer.from(videoResponse.data);
          
          if (!videoBuffer || videoBuffer.length === 0) {
            throw new Error('Empty video buffer');
          }
          
          // Basic validation - just check size
          if (videoBuffer.length < 100) {
            throw new Error('Video buffer too small, likely corrupted');
          }
          
          console.log(`Video downloaded successfully: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);
          
          // Send video buffer - let WhatsApp auto-detect mimetype
          await sock.sendMessage(extra.from, {
            video: videoBuffer,
            caption: caption
          }, { quoted: msg });
        } catch (videoError) {
          console.error('Video download/send error:', videoError.message);
          return await extra.reply('❌ Failed to download or send video. The video might be expired or require authentication.');
        }
      } else {
        // For images, use the main image URL (not thumbnail)
        await sock.sendMessage(extra.from, {
          image: { url: imageUrl },
          caption: caption
        }, { quoted: msg });
      }
      
    } catch (error) {
      console.error('Error in pinterest command:', error);
      return await extra.reply(`❌ Error: ${error.message || 'Unknown error occurred'}`);
    }
  },
};

