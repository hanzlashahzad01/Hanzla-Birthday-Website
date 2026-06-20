const WHATSAPP_URL_LIMIT = 2048;

export const buildWhatsAppShareUrl = (link, name) => {
  const shortMsg = `🎂 ${name} ke liye birthday wish!\n\n${link}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(shortMsg)}`;
};

export const isLinkWhatsAppFriendly = (link) => link.length <= WHATSAPP_URL_LIMIT;

export const buildWhatsAppShareUrlSafe = (link, name) => {
  if (isLinkWhatsAppFriendly(link)) {
    return buildWhatsAppShareUrl(link, name);
  }
  const msg = `🎂 ${name} ke liye birthday wish banaya hai!\n\nLink copy karke browser mein paste karo (photos ke sath link lambi hai).`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
};
