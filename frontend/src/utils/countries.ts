export interface Country {
  name: string;
  iso: string;
  code: string;
  phoneLength: number;
}

export const countries: Country[] = [
  { name: 'Qatar', iso: 'QA', code: '+974', phoneLength: 8 },
  { name: 'India', iso: 'IN', code: '+91', phoneLength: 10 },
  { name: 'United Arab Emirates', iso: 'AE', code: '+971', phoneLength: 9 },
  { name: 'Saudi Arabia', iso: 'SA', code: '+966', phoneLength: 9 },
  { name: 'United Kingdom', iso: 'GB', code: '+44', phoneLength: 10 },
  { name: 'United States', iso: 'US', code: '+1', phoneLength: 10 },
  { name: 'Kuwait', iso: 'KW', code: '+965', phoneLength: 8 },
  { name: 'Oman', iso: 'OM', code: '+968', phoneLength: 8 },
  { name: 'Bahrain', iso: 'BH', code: '+973', phoneLength: 8 },
  { name: 'Singapore', iso: 'SG', code: '+65', phoneLength: 8 },
  { name: 'Australia', iso: 'AU', code: '+61', phoneLength: 9 },
  { name: 'Canada', iso: 'CA', code: '+1', phoneLength: 10 },
];
