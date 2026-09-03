export const fmt = (n) => new Intl.NumberFormat('en-PK').format(Number(n || 0));

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-US');
  } catch {
    return String(d);
  }
};

/**
 * Normalizes Google Drive, Dropbox, Gmail, or cloud image links into direct renderable image URLs.
 */
export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // If base64 or already a direct data URL
  if (trimmed.startsWith('data:image/')) return trimmed;

  // 1. Google Drive / Docs Links
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  // 2. Dropbox Links
  if (trimmed.includes('dropbox.com')) {
    return trimmed
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace(/[?&]dl=[01]/, '');
  }

  // 3. Imgur non-direct links
  if (
    trimmed.includes('imgur.com') &&
    !trimmed.includes('i.imgur.com') &&
    !trimmed.includes('.png') &&
    !trimmed.includes('.jpg') &&
    !trimmed.includes('.jpeg')
  ) {
    const imgurId = trimmed.split('/').pop().split('.')[0];
    if (imgurId) return `https://i.imgur.com/${imgurId}.png`;
  }

  return trimmed;
};

/**
 * Resolves application icons accurately avoiding double '/assets/' and encoding filenames with spaces.
 */
export const getAppIconUrl = (iconStr, title = 'App') => {
  if (!iconStr) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=7c18eb&color=fff&size=80&bold=true`;
  }
  const trimmed = String(iconStr).trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('data:image/')) {
    return normalizeImageUrl(trimmed);
  }
  let cleanPath = trimmed;
  while (cleanPath.startsWith('/assets/')) {
    cleanPath = cleanPath.replace(/^\/assets\//, '');
  }
  while (cleanPath.startsWith('assets/')) {
    cleanPath = cleanPath.replace(/^assets\//, '');
  }
  if (!cleanPath.startsWith('Apps Icons/') && !cleanPath.includes('/')) {
    cleanPath = `Apps Icons/${cleanPath}`;
  }
  return encodeURI(`/assets/${cleanPath}`);
};

