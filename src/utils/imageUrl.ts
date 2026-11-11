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

export const isGenericPlaceholder = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('photo-1542838132-92c53300491e') || // generic supermarket rack
    lower.includes('photo-1584308666744-24d5c474f2ae') ||
    lower.includes('placeholder') ||
    lower.trim() === ''
  );
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
  const CABBAGE_IMG = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&q=80';
  const CAULIFLOWER_IMG = 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=500&q=80';
  const CARROT_IMG = 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=500&q=80';
  const CUCUMBER_IMG = 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=500&q=80';
  const SPINACH_IMG = 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&q=80';
  const GINGER_IMG = 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=80';
  const GARLIC_IMG = 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=500&q=80';

  const CHOCOLATE_IMG = 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&q=80';
  const TEA_IMG = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80';
  const ATTA_IMG = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80';
  const RICE_IMG = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80';
  const OIL_IMG = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80';

  const BREAD_IMG = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80';
  const EGG_IMG = 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500&q=80';
  const BISCUIT_IMG = 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80';
  const SNACKS_IMG = 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&q=80';

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
  if (nameLower.includes('cabbage') || nameLower.includes('gobhi') || nameLower.includes('patta')) return CABBAGE_IMG;
  if (nameLower.includes('cauliflower') || nameLower.includes('phool')) return CAULIFLOWER_IMG;
  if (nameLower.includes('tomato') || nameLower.includes('tamatar')) return TOMATO_IMG;
  if (nameLower.includes('potato') || nameLower.includes('aloo')) return POTATO_IMG;
  if (nameLower.includes('onion') || nameLower.includes('pyaz')) return ONION_IMG;
  if (nameLower.includes('capsicum') || nameLower.includes('shimla mirch') || nameLower.includes('pepper')) return CAPSICUM_IMG;
  if (nameLower.includes('carrot') || nameLower.includes('gajar')) return CARROT_IMG;
  if (nameLower.includes('cucumber') || nameLower.includes('kheera')) return CUCUMBER_IMG;
  if (nameLower.includes('spinach') || nameLower.includes('palak')) return SPINACH_IMG;
  if (nameLower.includes('ginger') || nameLower.includes('adrak')) return GINGER_IMG;
  if (nameLower.includes('garlic') || nameLower.includes('lehsun')) return GARLIC_IMG;

  // Confectionery & Staples
  if (nameLower.includes('choc') || nameLower.includes('cadbury') || nameLower.includes('kitkat') || nameLower.includes('dairy milk')) return CHOCOLATE_IMG;
  if (nameLower.includes('tea') || nameLower.includes('chai') || nameLower.includes('tulsi')) return TEA_IMG;
  if (nameLower.includes('atta') || nameLower.includes('flour') || nameLower.includes('wheat')) return ATTA_IMG;
  if (nameLower.includes('rice') || nameLower.includes('chawal')) return RICE_IMG;
  if (nameLower.includes('oil') || nameLower.includes('tel')) return OIL_IMG;

  // Bakery & Snacks
  if (nameLower.includes('bread') || nameLower.includes('toast') || nameLower.includes('pav')) return BREAD_IMG;
  if (nameLower.includes('egg') || nameLower.includes('anda')) return EGG_IMG;
  if (nameLower.includes('biscuit') || nameLower.includes('cookie')) return BISCUIT_IMG;
  if (nameLower.includes('chips') || nameLower.includes('snack') || nameLower.includes('namkeen')) return SNACKS_IMG;

  // 2. If currentUrl is already valid and not a mismatched placeholder
  if (curUrl && curUrl.startsWith('http') && !isGenericPlaceholder(curUrl)) {
    return curUrl;
  }

  // 3. Fallback based on category
  if (catLower.includes('banana')) return BANANA_IMG;
  if (catLower.includes('orange') || catLower.includes('citrus')) return ORANGE_IMG;
  if (catLower.includes('apple')) return APPLE_IMG;
  if (catLower.includes('dairy') || catLower.includes('milk')) return MILK_IMG;
  if (catLower.includes('fruit')) return APPLE_IMG;
  if (catLower.includes('vegetable')) return CABBAGE_IMG;
  if (catLower.includes('bakery')) return BREAD_IMG;
  if (catLower.includes('snack') || catLower.includes('biscuit')) return BISCUIT_IMG;
  if (catLower.includes('beverage') || catLower.includes('tea')) return TEA_IMG;

  return curUrl && !isGenericPlaceholder(curUrl) ? curUrl : CABBAGE_IMG;
};
