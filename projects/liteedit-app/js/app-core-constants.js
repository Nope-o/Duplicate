export const MAX_FILES = 20;
export const HISTORY_LIMIT = 20;

export const LARGE_IMAGE_PIXEL_THRESHOLD = 18000000;
export const MAX_TOTAL_PIXELS = 120000000;
export const ADJUST_TILE_SIZE = 1024;

export const TOOL_PRESETS = {
  pen: { size: 7, opacity: 100, color: '#60a5fa' },
  highlighter: { size: 24, opacity: 35, color: '#facc15' },
  blur: { size: 22, opacity: 60, color: '#60a5fa' }
};

export const SOCIAL_PRESETS = {
  'instagram-post': { width: 1080, height: 1080, cropRatio: '1:1' },
  'instagram-story': { width: 1080, height: 1920, cropRatio: '9:16' },
  'youtube-thumb': { width: 1280, height: 720, cropRatio: '16:9' },
  'whatsapp-status': { width: 1080, height: 1920, cropRatio: '9:16' },
  'whatsapp-share': { width: 1200, height: 628, cropRatio: '1.91:1' }
};
