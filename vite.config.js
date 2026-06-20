import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { saveWishJson, fetchWishById } from './api/wishHelpers.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/wish')) {
            try {
              if (req.method === 'GET') {
                const id = new URL(req.url, 'http://localhost').searchParams.get('id');
                if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid wish id' }));
                  return;
                }
                const data = await fetchWishById(id);
                if (!data) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Wish not found or expired' }));
                  return;
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return;
              }

              if (req.method === 'POST') {
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const wishData = JSON.parse(Buffer.concat(buffers).toString('utf-8'));
                if (!wishData?.name) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Wish name is required' }));
                  return;
                }
                const id = await saveWishJson(wishData);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ id }));
                return;
              }

              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            } catch (error) {
              console.error('Dev wish proxy error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message || 'Wish API failed' }));
            }
            return;
          }

          if (req.url === '/api/upload' && req.method === 'POST') {
            try {
              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const bodyString = Buffer.concat(buffers).toString('utf-8');
              const { image } = JSON.parse(bodyString);

              if (!image) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No image data provided' }));
                return;
              }

              const parts = image.split(';base64,');
              if (parts.length < 2) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid image data format' }));
                return;
              }
              const mimeType = parts[0].split(':')[1] || 'image/jpeg';
              const rawBase64 = parts[1];

              // Try ImgBB if key is set locally
              const IMGBB_API_KEY = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
              if (IMGBB_API_KEY) {
                try {
                  const formData = new URLSearchParams();
                  formData.append('key', IMGBB_API_KEY);
                  formData.append('image', rawBase64);
                  const response = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString(),
                  });
                  const result = await response.json();
                  if (response.ok && result.success) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ url: result.data.url }));
                    return;
                  }
                } catch (e) {
                  console.warn('ImgBB dev proxy failed, falling back to Catbox:', e.message);
                }
              }

              const fileBuffer = Buffer.from(rawBase64, 'base64');
              const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
              const filename = `image.${ext}`;
              const HEADERS = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
              };

              const buildMultipart = (fields, fileField) => {
                const boundary = '----FormBoundary' + Date.now();
                const chunks = [];
                for (const [name, val] of Object.entries(fields)) {
                  chunks.push(Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`,
                    'utf8'
                  ));
                }
                chunks.push(Buffer.from(
                  `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
                  'utf8'
                ));
                chunks.push(fileBuffer);
                chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
                return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
              };

              const tryUpload = async (url, fields, fileField) => {
                const { body, contentType } = buildMultipart(fields, fileField);
                const r = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': contentType, ...HEADERS },
                  body,
                });
                const text = (await r.text()).trim();
                return text.startsWith('https://') ? text : null;
              };

              let fileUrl = await tryUpload('https://catbox.moe/user/api.php', { reqtype: 'fileupload' }, 'fileToUpload');
              if (!fileUrl) {
                fileUrl = await tryUpload(
                  'https://litterbox.catbox.moe/resources/internals/api.php',
                  { reqtype: 'fileupload', time: '72h' },
                  'fileToUpload'
                );
              }
              if (!fileUrl) {
                fileUrl = await tryUpload('https://0x0.st', {}, 'file');
              }
              if (!fileUrl) {
                throw new Error('All upload services failed');
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: fileUrl }));

            } catch (error) {
              console.error('Dev upload proxy error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Upload failed: ' + error.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ]
})
