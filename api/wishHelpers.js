const LITTER_HOST = 'https://litter.catbox.moe';
const CATBOX_HOST = 'https://files.catbox.moe';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
  Accept: '*/*',
};

function buildMultipart(fields, fileField, fileBuffer, filename, mimeType) {
  const boundary = '----WishBoundary' + Date.now();
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

function extractIdFromHostUrl(url) {
  const match = url.match(/\/([a-zA-Z0-9]+)\.json$/);
  return match ? match[1] : null;
}

async function uploadJsonToHost(url, fields, fileBuffer) {
  const { body, contentType } = buildMultipart(fields, 'fileToUpload', fileBuffer, 'wish.json', 'application/json');
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...HEADERS },
    body,
  });
  const text = (await r.text()).trim();
  if (!text.startsWith('https://')) return null;
  return text;
}

async function verifyFetchable(url) {
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return false;
    const data = await r.json();
    return Boolean(data?.name);
  } catch {
    return false;
  }
}

export async function saveWishJson(wishData) {
  const fileBuffer = Buffer.from(JSON.stringify(wishData), 'utf-8');

  // Litterbox first — fetch works reliably from browsers and serverless
  const litterUrl = await uploadJsonToHost(
    'https://litterbox.catbox.moe/resources/internals/api.php',
    { reqtype: 'fileupload', time: '72h' },
    fileBuffer
  );
  if (litterUrl) {
    const rawId = extractIdFromHostUrl(litterUrl);
    if (rawId && await verifyFetchable(litterUrl)) {
      return `l${rawId}`;
    }
  }

  const catboxUrl = await uploadJsonToHost(
    'https://catbox.moe/user/api.php',
    { reqtype: 'fileupload' },
    fileBuffer
  );
  if (catboxUrl) {
    const rawId = extractIdFromHostUrl(catboxUrl);
    if (rawId) return `c${rawId}`;
  }

  throw new Error('Could not save wish. Please try again.');
}

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

export async function fetchWishById(id) {
  for (const url of buildFetchUrls(id)) {
    try {
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.name) return data;
    } catch {
      // try next host
    }
  }
  return null;
}

export { LITTER_HOST, CATBOX_HOST, buildFetchUrls };
