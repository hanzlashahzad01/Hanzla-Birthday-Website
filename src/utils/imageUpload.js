export const verifyImageUrl = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image URL not accessible'));
    img.src = url;
  });

export const uploadImageToServer = async (base64Image) => {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Server upload failed');
  }
  const data = await res.json();
  if (!data.url) throw new Error('No URL returned from server');
  await verifyImageUrl(data.url);
  return data.url;
};

export const uploadImages = async (base64Images) => {
  const results = [];
  for (const img of base64Images) {
    if (img.startsWith('http')) {
      await verifyImageUrl(img);
      results.push(img);
      continue;
    }
    results.push(await uploadImageToServer(img));
  }
  return results;
};
