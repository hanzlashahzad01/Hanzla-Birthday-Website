export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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

    // Parse base64
    const parts = image.split(';base64,');
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }
    const mimeType = parts[0].split(':')[1];
    const rawBase64 = parts[1];
    const buffer = Buffer.from(rawBase64, 'base64');

    // Create Blob and FormData for Catbox
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
      console.error('Catbox upload failed:', errorText);
      return res.status(response.status).json({ error: 'Failed to upload to Catbox' });
    }

    const fileUrl = await response.text();
    return res.status(200).json({ url: fileUrl.trim() });
  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
