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

    const parts = image.split(';base64,');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    const mimeType = parts[0].split(':')[1] || 'image/jpeg';
    const rawBase64 = parts[1];
    const fileBuffer = Buffer.from(rawBase64, 'base64');
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
    const filename = `photo.${ext}`;

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept': '*/*',
    };

    function buildMultipart(fields, fileField) {
      const boundary = '----UploadBoundary' + Date.now();
      const parts = [];
      for (const [name, val] of Object.entries(fields)) {
        parts.push(Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`,
          'utf8'
        ));
      }
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
        'utf8'
      ));
      parts.push(fileBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
      const body = Buffer.concat(parts);
      return { body, contentType: `multipart/form-data; boundary=${boundary}` };
    }

    // 1. Try ImgBB (permanent, if API key set)
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    if (IMGBB_API_KEY) {
      try {
        const form = new URLSearchParams();
        form.append('key', IMGBB_API_KEY);
        form.append('image', rawBase64);
        const r = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        const j = await r.json();
        if (r.ok && j.success) {
          console.log('ImgBB success:', j.data.url);
          return res.status(200).json({ url: j.data.url });
        }
        console.warn('ImgBB failed:', j);
      } catch (e) { console.warn('ImgBB error:', e.message); }
    }

    // 2. Try Catbox (permanent storage)
    try {
      const { body, contentType } = buildMultipart({ reqtype: 'fileupload' }, 'fileToUpload');
      const r = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        headers: { 'Content-Type': contentType, ...HEADERS },
        body,
      });
      const text = (await r.text()).trim();
      if (text.startsWith('https://')) {
        console.log('Catbox success:', text);
        return res.status(200).json({ url: text });
      }
      console.warn('Catbox failed, status:', r.status, 'body:', text.substring(0, 80));
    } catch (e) { console.warn('Catbox error:', e.message); }

    // 3. Try Litterbox (72 hour temporary — good enough for birthday wishes)
    try {
      const { body, contentType } = buildMultipart({ reqtype: 'fileupload', time: '72h' }, 'fileToUpload');
      const r = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        headers: { 'Content-Type': contentType, ...HEADERS },
        body,
      });
      const text = (await r.text()).trim();
      if (text.startsWith('https://')) {
        console.log('Litterbox success:', text);
        return res.status(200).json({ url: text });
      }
      console.warn('Litterbox failed, status:', r.status, 'body:', text.substring(0, 80));
    } catch (e) { console.warn('Litterbox error:', e.message); }

    // 4. Try 0x0.st (simple file host)
    try {
      const { body, contentType } = buildMultipart({}, 'file');
      const r = await fetch('https://0x0.st', {
        method: 'POST',
        headers: { 'Content-Type': contentType, ...HEADERS },
        body,
      });
      const text = (await r.text()).trim();
      if (text.startsWith('https://')) {
        console.log('0x0.st success:', text);
        return res.status(200).json({ url: text });
      }
      console.warn('0x0.st failed, status:', r.status, 'body:', text.substring(0, 80));
    } catch (e) { console.warn('0x0.st error:', e.message); }

    return res.status(500).json({ error: 'All upload services failed. Please try again.' });

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
}
