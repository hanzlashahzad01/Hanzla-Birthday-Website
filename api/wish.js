import { saveWishJson, fetchWishById } from './wishHelpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const id = req.query?.id;
    if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid wish id' });
    }

    const data = await fetchWishById(id);
    if (!data) {
      return res.status(404).json({ error: 'Wish not found or expired' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const wishData = req.body;
    if (!wishData?.name) {
      return res.status(400).json({ error: 'Wish name is required' });
    }

    try {
      const id = await saveWishJson(wishData);
      return res.status(200).json({ id });
    } catch (error) {
      console.error('Save wish error:', error);
      return res.status(500).json({ error: error.message || 'Failed to save wish' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
