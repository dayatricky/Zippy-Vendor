// src/utils/imageUrl.ts

/**
 * Extracts backend origin from NEXT_PUBLIC_API_URL or defaults to Elyria / local backend.
 * e.g. "http://192.168.1.66:5014/api/v1" -> "http://192.168.1.66:5014"
 */
export const getBackendBaseUrl = (): string => {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'https://zippy-api.elyriasoft.com/api/v1').trim().replace(/\/+$/, '');
  const origin = raw.replace(/\/api(\/v1)?\/?$/, '');
  return origin || 'http://192.168.1.66:5014';
};

/**
 * Resolves local backend paths (e.g. /uploads/products/unique-name.jpg)
 * to full accessible URLs (e.g. http://192.168.1.66:5014/uploads/products/unique-name.jpg).
 * Returns absolute URLs, blob:, or data: URLs untouched.
 */
export const resolveImageUrl = (
  url?: string | null,
  fallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80'
): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }
  const trimmed = url.trim();

  // If already absolute HTTP/HTTPS or local object/data URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Next.js static assets from public/ folder
  if (trimmed === '/zippy-logo-crop.jpg' || trimmed === 'zippy-logo-crop.jpg' || trimmed.startsWith('/icons/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Backend local storage paths (/uploads/products/..., uploads/categories/..., etc.)
  const backendBase = getBackendBaseUrl();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendBase}${cleanPath}`;
};
