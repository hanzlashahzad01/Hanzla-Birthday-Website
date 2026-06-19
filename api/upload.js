export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Parse base64 — strip the data:image/...;base64, prefix
    const parts = image.split(';base64,');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    const mimeType = parts[0].split(':')[1] || 'image/jpeg';
    const rawBase64 = parts[1];

    // Try ImgBB first if API key is available
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
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
          console.log('ImgBB upload success:', result.data.url);
          return res.status(200).json({ url: result.data.url });
        }
        console.warn('ImgBB failed, falling back to Catbox:', result);
      } catch (imgbbErr) {
        console.warn('ImgBB error, falling back to Catbox:', imgbbErr.message);
      }
    }

    // Fallback: Upload to Catbox using manually constructed multipart body
    // (Native FormData/Blob has bugs in some Vercel Node runtimes, so we build it manually)
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

    console.log('Catbox upload success:', fileUrl);
    return res.status(200).json({ url: fileUrl });

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
}
