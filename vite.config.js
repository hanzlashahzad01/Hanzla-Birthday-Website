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
              const rawBase64 = parts[1];

              // Use ImgBB (same as production)
              const IMGBB_API_KEY = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
              
              if (!IMGBB_API_KEY) {
                // Fallback to Catbox for local dev if no key set
                const mimeType = parts[0].split(':')[1];
                const buffer = Buffer.from(rawBase64, 'base64');
                const blob = new Blob([buffer], { type: mimeType });
                const formData = new FormData();
                formData.append('reqtype', 'fileupload');
                formData.append('fileToUpload', blob, 'image.jpg');

                const response = await fetch('https://catbox.moe/user/api.php', {
                  method: 'POST',
                  body: formData,
                });

                if (!response.ok) {
                  throw new Error(`Catbox status ${response.status}`);
                }
                const fileUrl = await response.text();
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ url: fileUrl.trim() }));
                return;
              }

              const formData = new URLSearchParams();
              formData.append('key', IMGBB_API_KEY);
              formData.append('image', rawBase64);

              const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
              });

              const result = await response.json();
              if (!response.ok || !result.success) {
                throw new Error(result.error?.message || 'ImgBB upload failed');
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: result.data.url }));

            } catch (error) {
              console.error('Dev upload proxy error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Dev proxy error: ' + error.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ]
})
