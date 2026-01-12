// Simple Base64 encoder/decoder
// Note: This simple version supports standard ASCII. For emoji support, we use the encodeURIComponent trick.

export const encodeWish = (data) => {
  try {
    const json = JSON.stringify(data);
    // Encode to Base64 with UTF-8 support
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
  } catch (e) {
    console.error("Encoding failed", e);
    return null;
  }
};

export const decodeWish = (encoded) => {
  try {
    if (!encoded) return null;
    // Decode from Base64 with UTF-8 support
    return JSON.parse(decodeURIComponent(atob(encoded).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')));
  } catch (e) {
    console.error("Decoding failed", e);
    // Fallback attempt for standard Base64 (legacy)
    try {
      return JSON.parse(atob(encoded));
    } catch (e2) {
      return null;
    }
  }
};
