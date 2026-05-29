/**
 * Cloudflare Worker — proxy Groq Whisper (API key không lộ trên GitHub Pages).
 *
 * Deploy:
 * 1. Tạo API key free: https://console.groq.com
 * 2. wrangler secret put GROQ_API_KEY
 * 3. wrangler deploy
 * 4. Trong index.html (trước voice-assistant.js):
 *    window.VOICE_STT_CONFIG = { mode: 'whisper', whisperProxyUrl: 'https://YOUR.workers.dev' };
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }
    if (!env.GROQ_API_KEY) {
      return json({ error: 'Missing GROQ_API_KEY secret' }, 500);
    }

    try {
      const incoming = await request.formData();
      const file = incoming.get('file');
      if (!file) return json({ error: 'No audio file' }, 400);

      const body = new FormData();
      body.append('file', file, 'voice.webm');
      body.append('model', 'whisper-large-v3');
      body.append('language', 'vi');
      body.append('response_format', 'json');

      const groq = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.GROQ_API_KEY },
        body,
      });

      const data = await groq.json();
      if (!groq.ok) {
        return json({ error: data.error?.message || groq.statusText }, groq.status);
      }
      return json({ text: data.text || '' });
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
