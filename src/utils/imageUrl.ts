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

/**
 * Returns an accurate image URL matching the product's name.
 * Product name ALWAYS takes priority over category so "Cavendish Bananas" displays bananas
 * and "Fresh Nagpur Oranges" displays oranges even if category is "apples".
 */
export const getAccurateProductImage = (
  name: string,
  category = '',
  currentUrl?: string | null
): string => {
  const nameLower = (name || '').toLowerCase();
  const catLower = (category || '').toLowerCase();
  const curUrl = (currentUrl || '').trim();

  // Known specific images
  const BANANA_IMG = 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80';
  const ORANGE_IMG = 'https://images.unsplash.com/photo-1547514701-42782101795e?w=500&q=80';
  const APPLE_IMG = 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80';
  const MANGO_IMG = 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&q=80';
  const GRAPES_IMG = 'https://images.unsplash.com/photo-1596363505729-4190a9506133?w=500&q=80';
  const PAPAYA_IMG = 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=500&q=80';
  const WATERMELON_IMG = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&q=80';
  const POMEGRANATE_IMG = 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80';
  const STRAWBERRY_IMG = 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&q=80';

  const MILK_IMG = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80';
  const PANEER_IMG = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80';
  const BUTTER_IMG = 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&q=80';
  const CURD_IMG = 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=500&q=80';
  const CHEESE_IMG = 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500&q=80';

  const TOMATO_IMG = 'https://images.unsplash.com/photo-1546470427-e26264be0b11?w=500&q=80';
  const POTATO_IMG = 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&q=80';
  const ONION_IMG = 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500&q=80';
  const CAPSICUM_IMG = 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&q=80';

  const BREAD_IMG = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80';
  const EGG_IMG = 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80';

  // 1. Check Product Name explicitly (Name has highest priority)
  if (nameLower.includes('banana') || nameLower.includes('cavendish') || nameLower.includes('kela')) {
    return BANANA_IMG;
  }
  if (nameLower.includes('orange') || nameLower.includes('nagpur') || nameLower.includes('santre') || nameLower.includes('santra') || nameLower.includes('citrus')) {
    return ORANGE_IMG;
  }
  if (nameLower.includes('apple') || nameLower.includes('gala') || nameLower.includes('fuji') || nameLower.includes('kashmiri') || nameLower.includes('seb')) {
    return APPLE_IMG;
  }
  if (nameLower.includes('mango') || nameLower.includes('alphonso') || nameLower.includes('aam')) {
    return MANGO_IMG;
  }
  if (nameLower.includes('grape') || nameLower.includes('angoor')) {
    return GRAPES_IMG;
  }
  if (nameLower.includes('papaya') || nameLower.includes('papita')) {
    return PAPAYA_IMG;
  }
  if (nameLower.includes('watermelon') || nameLower.includes('tarbooz')) {
    return WATERMELON_IMG;
  }
  if (nameLower.includes('pomegranate') || nameLower.includes('anaar')) {
    return POMEGRANATE_IMG;
  }
  if (nameLower.includes('strawberry') || nameLower.includes('berry')) {
    return STRAWBERRY_IMG;
  }

  // Dairy
  if (nameLower.includes('milk') || nameLower.includes('doodh')) return MILK_IMG;
  if (nameLower.includes('paneer') || nameLower.includes('cottage cheese')) return PANEER_IMG;
  if (nameLower.includes('butter') || nameLower.includes('makhan')) return BUTTER_IMG;
  if (nameLower.includes('curd') || nameLower.includes('yogurt') || nameLower.includes('dahi')) return CURD_IMG;
  if (nameLower.includes('cheese')) return CHEESE_IMG;

  // Vegetables
  if (nameLower.includes('tomato') || nameLower.includes('tamatar')) return TOMATO_IMG;
  if (nameLower.includes('potato') || nameLower.includes('aloo')) return POTATO_IMG;
  if (nameLower.includes('onion') || nameLower.includes('pyaz')) return ONION_IMG;
  if (nameLower.includes('capsicum') || nameLower.includes('shimla mirch') || nameLower.includes('pepper')) return CAPSICUM_IMG;

  // Bakery
  if (nameLower.includes('bread') || nameLower.includes('toast')) return BREAD_IMG;
  if (nameLower.includes('egg') || nameLower.includes('anda')) return EGG_IMG;

  // 2. If currentUrl is already valid and not a mismatched placeholder
  if (curUrl && curUrl.startsWith('http')) {
    return curUrl;
  }

  // 3. Fallback based on category
  if (catLower.includes('banana')) return BANANA_IMG;
  if (catLower.includes('orange') || catLower.includes('citrus')) return ORANGE_IMG;
  if (catLower.includes('apple')) return APPLE_IMG;
  if (catLower.includes('dairy') || catLower.includes('milk')) return MILK_IMG;
  if (catLower.includes('fruit')) return APPLE_IMG;
  if (catLower.includes('vegetable')) return TOMATO_IMG;
  if (catLower.includes('bakery')) return BREAD_IMG;

  return curUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
};
