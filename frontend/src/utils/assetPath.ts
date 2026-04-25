const rawBase = ((import.meta as any).env?.BASE_URL || '/') as string;
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export const withBase = (value: string) => {
  if (!value) return value;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${normalizedBase}${value.replace(/^\/+/, '')}`;
};

