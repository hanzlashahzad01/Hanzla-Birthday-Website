const LITTER_HOST = 'https://litter.catbox.moe';
const CATBOX_HOST = 'https://files.catbox.moe';

function buildFetchUrls(id) {
  if (id.startsWith('l')) {
    return [`${LITTER_HOST}/${id.slice(1)}.json`];
  }
  if (id.startsWith('c')) {
    return [`${CATBOX_HOST}/${id.slice(1)}.json`];
  }
  return [
    `${LITTER_HOST}/${id}.json`,
    `${CATBOX_HOST}/${id}.json`,
  ];
}

async function fetchWishDirect(id) {
  for (const url of buildFetchUrls(id)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.name) return data;
    } catch {
      // try next host
    }
  }
  return null;
}

export const saveWish = async (wishData) => {
  const res = await fetch('/api/wish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wishData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save wish');
  }

  const { id } = await res.json();
  if (!id) throw new Error('No wish id returned');

  return {
    id,
    link: `${window.location.origin}/wish/${id}`,
  };
};

export const fetchWish = async (id) => {
  const direct = await fetchWishDirect(id);
  if (direct) return direct;

  const res = await fetch(`/api/wish?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Wish not found or expired');
  }
  return res.json();
};
