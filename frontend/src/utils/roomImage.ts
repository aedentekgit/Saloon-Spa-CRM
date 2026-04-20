type RoomBranch = {
  name?: string;
} | string | undefined;

export interface RoomImageSource {
  name?: string;
  type?: string;
  branch?: RoomBranch;
  image?: string;
}

const ROOM_PHOTO_POOL = [
  '/images/hero_workspace.png',
  '/images/about_hero.png'
];

const ROOM_PHOTO_FILES = new Set([
  'hero_workspace.png',
  'about_hero.png'
]);

const ROOM_OBJECT_POSITIONS = [
  '50% 50%',
  '50% 35%',
  '50% 65%',
  '38% 50%',
  '62% 50%',
  '45% 42%',
  '55% 58%'
];

const ROOM_PALETTES = [
  { bgTop: '#F9F4EC', bgBottom: '#D8C2A5', glow: '#FFF8EE', accent: '#332766', accentSoft: '#B6947A', text: '#2E1A25' },
  { bgTop: '#F6EFE6', bgBottom: '#CDB89D', glow: '#FFF7EF', accent: '#5C4335', accentSoft: '#C6A88F', text: '#332319' },
  { bgTop: '#F8F2EA', bgBottom: '#D7C7B3', glow: '#FFF9F2', accent: '#6B4B39', accentSoft: '#D8BEA8', text: '#2F1F18' },
  { bgTop: '#F6F1EB', bgBottom: '#CFB79A', glow: '#FFF8F1', accent: '#48605A', accentSoft: '#A6B2AA', text: '#26312E' },
  { bgTop: '#F7F0E7', bgBottom: '#C9B09B', glow: '#FFF6ED', accent: '#5E3550', accentSoft: '#C7A2B6', text: '#2B1825' },
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getBranchName = (branch: RoomBranch) => {
  if (!branch) return 'Zen Spa';
  if (typeof branch === 'string') return branch;
  return branch.name || 'Zen Spa';
};

const getFileName = (value: string) => {
  const clean = value.split('?')[0].split('#')[0].replace(/\\/g, '/');
  return clean.split('/').pop()?.toLowerCase() || '';
};

const isRoomPhotoPath = (value: string) => ROOM_PHOTO_FILES.has(getFileName(value));

const isCustomRoomImage = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return false;
  if (/^(data:|blob:|https?:\/\/)/i.test(normalized)) return true;

  const clean = normalized.replace(/^\.?\//, '').toLowerCase();
  if (clean.startsWith('uploads/') || clean.includes('/uploads/')) return true;

  if (clean.startsWith('images/') || clean.includes('/images/')) {
    return isRoomPhotoPath(clean);
  }

  return false;
};

const normalizeCustomRoomImage = (value: string, baseUrl: string) => {
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;

  const clean = value.replace(/^\.?\//, '');
  if (clean.startsWith('uploads/') || clean.includes('/uploads/')) {
    return `${baseUrl}/${clean}`;
  }

  if (isRoomPhotoPath(clean)) {
    return `/images/${clean}`;
  }

  return `${baseUrl}/uploads/${clean}`;
};

const getRoomSeed = (room: RoomImageSource) => {
  return `${room.name || 'Room'}|${room.type || ''}|${getBranchName(room.branch)}`;
};

const pickRoomImageSrc = (room: RoomImageSource) => {
  const seed = hashString(getRoomSeed(room));
  const normalized = getRoomSeed(room).toLowerCase();

  if (normalized.includes('premium') || normalized.includes('vip')) {
    return ROOM_PHOTO_POOL[1];
  }

  if (normalized.includes('standard') || normalized.includes('deluxe') || normalized.includes('suite')) {
    return ROOM_PHOTO_POOL[0];
  }

  return ROOM_PHOTO_POOL[seed % ROOM_PHOTO_POOL.length];
};

const pickRoomObjectPosition = (room: RoomImageSource) => {
  const normalized = `${room.name || ''} ${room.type || ''}`.toLowerCase();
  if (normalized.includes('panorama')) return '50% 30%';
  if (normalized.includes('chamber')) return '50% 36%';
  if (normalized.includes('studio')) return '55% 50%';
  if (normalized.includes('alcove')) return '42% 58%';
  if (normalized.includes('suite')) return '50% 42%';
  if (normalized.includes('premium')) return '50% 48%';
  if (normalized.includes('vip')) return '50% 52%';

  const seed = hashString(getRoomSeed(room));
  return ROOM_OBJECT_POSITIONS[seed % ROOM_OBJECT_POSITIONS.length];
};

const getInitials = (name?: string) => {
  const parts = (name || 'Room')
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts
    .map(part => part[0] || '')
    .join('')
    .toUpperCase();

  return initials || 'RM';
};

const pickPalette = (room: RoomImageSource) => {
  const seed = `${room.name || 'Room'}|${room.type || ''}|${getBranchName(room.branch)}`;
  const normalized = seed.toLowerCase();

  if (normalized.includes('vip') || normalized.includes('premium')) {
    return ROOM_PALETTES[0];
  }

  if (normalized.includes('deluxe') || normalized.includes('studio')) {
    return ROOM_PALETTES[1];
  }

  if (normalized.includes('standard') || normalized.includes('suite')) {
    return ROOM_PALETTES[2];
  }

  if (normalized.includes('chamber') || normalized.includes('alcove')) {
    return ROOM_PALETTES[3];
  }

  return ROOM_PALETTES[hashString(seed) % ROOM_PALETTES.length];
};

const buildRoomVisualSvg = (room: RoomImageSource) => {
  const palette = pickPalette(room);
  const roomName = escapeXml(room.name || 'Room');
  const roomType = escapeXml((room.type || 'Workspace').toUpperCase());
  const branchName = escapeXml(getBranchName(room.branch).toUpperCase());
  const initials = escapeXml(getInitials(room.name));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${roomName}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bgTop}" />
          <stop offset="100%" stop-color="${palette.bgBottom}" />
        </linearGradient>
        <radialGradient id="glow" cx="68%" cy="18%" r="65%">
          <stop offset="0%" stop-color="${palette.glow}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${palette.glow}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="arch" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.18" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="${palette.accent}" flood-opacity="0.16" />
        </filter>
      </defs>

      <rect width="800" height="1000" rx="64" fill="url(#bg)" />
      <circle cx="640" cy="160" r="230" fill="url(#glow)" />
      <circle cx="130" cy="880" r="170" fill="${palette.accent}" fill-opacity="0.08" />
      <rect x="90" y="110" width="620" height="780" rx="56" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.22" />

      <g filter="url(#shadow)">
        <rect x="180" y="175" width="440" height="560" rx="220" fill="url(#arch)" stroke="${palette.accent}" stroke-opacity="0.24" stroke-width="4" />
        <rect x="228" y="315" width="344" height="140" rx="52" fill="#FFFFFF" fill-opacity="0.42" />
        <rect x="248" y="458" width="304" height="44" rx="22" fill="${palette.accent}" fill-opacity="0.18" />
        <rect x="272" y="506" width="36" height="156" rx="18" fill="#FFFFFF" fill-opacity="0.34" />
        <rect x="492" y="506" width="36" height="156" rx="18" fill="#FFFFFF" fill-opacity="0.34" />
        <rect x="322" y="590" width="156" height="52" rx="26" fill="#FFFFFF" fill-opacity="0.22" />
      </g>

      <circle cx="600" cy="260" r="54" fill="#FFFFFF" fill-opacity="0.35" />
      <circle cx="162" cy="248" r="16" fill="#FFFFFF" fill-opacity="0.28" />
      <circle cx="194" cy="220" r="8" fill="#FFFFFF" fill-opacity="0.34" />
      <circle cx="214" cy="262" r="6" fill="#FFFFFF" fill-opacity="0.28" />
      <circle cx="598" cy="250" r="8" fill="${palette.accent}" fill-opacity="0.38" />
      <circle cx="624" cy="288" r="5" fill="${palette.accent}" fill-opacity="0.38" />

      <rect x="160" y="820" width="480" height="110" rx="30" fill="#FFFFFF" fill-opacity="0.20" />
      <text x="198" y="868" fill="${palette.text}" font-family="Georgia, serif" font-size="34" font-weight="700" letter-spacing="0.5">${roomName}</text>
      <text x="198" y="904" fill="${palette.accent}" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="5">${roomType}</text>
      <text x="198" y="934" fill="${palette.accentSoft}" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="4">${branchName}</text>

      <circle cx="612" cy="858" r="44" fill="${palette.accent}" fill-opacity="0.16" />
      <text x="612" y="872" text-anchor="middle" fill="${palette.accent}" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="1">${initials}</text>
    </svg>
  `;
};

export const resolveRoomImageMeta = (room: RoomImageSource, baseUrl: string) => {
  const image = room.image?.trim();
  if (image && isCustomRoomImage(image)) {
    return {
      src: normalizeCustomRoomImage(image, baseUrl),
      objectPosition: '50% 50%'
    };
  }

  return {
    src: pickRoomImageSrc(room),
    objectPosition: pickRoomObjectPosition(room)
  };
};

export const resolveRoomImageSrc = (room: RoomImageSource, baseUrl: string) => {
  return resolveRoomImageMeta(room, baseUrl).src;
};

export const resolveRoomImageStyle = (room: RoomImageSource, baseUrl: string) => {
  return {
    objectPosition: resolveRoomImageMeta(room, baseUrl).objectPosition
  } as const;
};
