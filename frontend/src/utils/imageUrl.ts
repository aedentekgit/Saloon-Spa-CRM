const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5005/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const getApiBaseLastSegment = () => {
  try {
    const segments = new URL(API_BASE_URL).pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  } catch {
    return '';
  }
};

const stripApiBasePath = (value: string) => {
  try {
    const basePath = new URL(API_BASE_URL).pathname.replace(/^\/+|\/+$/g, '');
    if (!basePath) return value;
    return value.replace(new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`, 'i'), '');
  } catch {
    return value;
  }
};

const normalizeRelativeUploadPath = (rawPath: string) => {
  let cleanPath = rawPath.trim().replace(/\\/g, '/').replace(/^file:\/+/i, '');
  cleanPath = cleanPath.replace(/^\.?\//, '');
  cleanPath = stripApiBasePath(cleanPath);

  const apiUploadsIndex = cleanPath.toLowerCase().lastIndexOf('/api/uploads/');
  if (apiUploadsIndex !== -1) {
    cleanPath = cleanPath.slice(apiUploadsIndex + '/api/'.length);
  }

  const uploadsIndex = cleanPath.toLowerCase().lastIndexOf('/uploads/');
  if (uploadsIndex !== -1) {
    cleanPath = cleanPath.slice(uploadsIndex + 1);
  }

  if (cleanPath.toLowerCase().startsWith('api/uploads/')) {
    cleanPath = cleanPath.slice(4);
  }
  if (cleanPath.toLowerCase().startsWith('uploads/') || cleanPath.toLowerCase().startsWith('images/')) {
    return cleanPath;
  }

  return `uploads/${cleanPath}`;
};

export const getImageUrl = (path?: string | null) => {
  if (!path) return '';

  const value = String(path).trim();
  if (!value || value.toLowerCase() === 'undefined' || value.toLowerCase() === 'null') return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const cleanPath = normalizeRelativeUploadPath(value);
  return `${API_BASE_URL}/${cleanPath}`;
};

export const getAssetBaseUrl = () => API_BASE_URL;
