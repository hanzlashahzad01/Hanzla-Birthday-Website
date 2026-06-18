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
    const rawBase64 = parts[1];

    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    if (!IMGBB_API_KEY) {
      return res.status(500).json({ error: 'Server config error: IMGBB_API_KEY not set' });
    }

    // Upload to ImgBB using base64 (works perfectly from Vercel)
    const formData = new URLSearchParams();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', rawBase64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('ImgBB error:', result);
      return res.status(500).json({ error: 'ImgBB upload failed: ' + (result.error?.message || 'Unknown error') });
    }

    const url = result.data.url;
    console.log('ImgBB upload success:', url);
    return res.status(200).json({ url });

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
