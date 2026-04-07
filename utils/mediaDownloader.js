/**
 * Media Downloader Utility
 * Provides reliable buffer download with retries and fallback support
 */

const axios = require('axios');

/**
 * Download a URL to a Buffer with retries
 */
async function downloadBuffer(url, options = {}) {
  const { headers = {}, retries = 3, timeout = 30000 } = options;
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers
        }
      });

      const buffer = Buffer.from(response.data);
      if (!buffer || buffer.length < 100) {
        throw new Error('Downloaded buffer is too small or empty');
      }
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Download failed after retries');
}

/**
 * Try a list of async source functions in order, returning the first success
 * sources: array of async () => result functions
 * label: string label for error messages
 */
async function withFallback(sources, label = 'Source') {
  const errors = [];

  for (let i = 0; i < sources.length; i++) {
    try {
      const result = await sources[i]();
      if (result) return result;
      errors.push(`${label} #${i + 1}: returned empty result`);
    } catch (err) {
      errors.push(`${label} #${i + 1}: ${err.message}`);
    }
  }

  throw new Error(`All ${label} sources failed:\n${errors.join('\n')}`);
}

module.exports = { downloadBuffer, withFallback };
