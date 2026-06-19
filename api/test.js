export default async function handler(req, res) {
  try {
    const response = await fetch('https://catbox.moe/');
    res.status(200).json({ ok: response.ok, status: response.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
