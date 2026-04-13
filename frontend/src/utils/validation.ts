import { countries, Country } from './countries';

export const validatePhoneNumber = (phone: string, countryIso: string): { isValid: boolean; message?: string } => {
  const country = countries.find(c => c.iso === countryIso) || { name: 'selected country', phoneLength: 8, code: '+974' };
  
  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // If the number starts with the country code (e.g. 974 for Qatar), strip it
  const countryCodeDigits = country.code.replace(/\D/g, '');
  if (cleanPhone.startsWith(countryCodeDigits) && cleanPhone.length > country.phoneLength) {
    cleanPhone = cleanPhone.slice(countryCodeDigits.length);
  }

  // Common issue: leading zero
  if (cleanPhone.startsWith('0') && cleanPhone.length === country.phoneLength + 1) {
    cleanPhone = cleanPhone.slice(1);
  }
  
  if (cleanPhone.length !== country.phoneLength) {
    return {
      isValid: false,
      message: `PHONE NUMBER MUST BE EXACTLY ${country.phoneLength} DIGITS FOR ${country.name.toUpperCase()}`
    };
  }
  
  return { isValid: true };
};

export const getPhoneValidationProtocol = (countryIso: string): string => {
  const country = countries.find(c => c.iso === countryIso) || { phoneLength: 8 };
  return `PROTOCOL: EXACTLY ${country.phoneLength} DIGITS REQUIRED`;
};
