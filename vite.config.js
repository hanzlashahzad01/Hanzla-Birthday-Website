import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-upload-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
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

              // Fallback: Catbox using manually constructed multipart body
              const fileBuffer = Buffer.from(rawBase64, 'base64');
              const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
              const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
              const filename = `image.${ext}`;

              const part1 = Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="reqtype"\r\n\r\n` +
                `fileupload\r\n` +
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\n` +
                `Content-Type: ${mimeType}\r\n\r\n`,
                'utf-8'
              );
              const part2 = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
              const bodyBuffer = Buffer.concat([part1, fileBuffer, part2]);

              const catboxRes = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                headers: {
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                  'Content-Length': bodyBuffer.length,
                },
                body: bodyBuffer,
              });

              if (!catboxRes.ok) {
                throw new Error(`Catbox returned status ${catboxRes.status}`);
              }

              const fileUrl = (await catboxRes.text()).trim();
              if (!fileUrl.startsWith('http')) {
                throw new Error('Catbox returned invalid URL: ' + fileUrl);
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
