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
              const mimeType = parts[0].split(':')[1];
              const rawBase64 = parts[1];
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
                const errorText = await response.text();
                console.error('Catbox upload failed in dev proxy:', errorText);
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to upload to Catbox' }));
                return;
              }

              const fileUrl = await response.text();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: fileUrl.trim() }));
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
