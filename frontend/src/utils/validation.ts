import { countries, Country } from './countries';

export const validatePhoneNumber = (phone: string, countryIso: string): { isValid: boolean; message?: string } => {
  const country = countries.find(c => c.iso === countryIso) || { name: 'selected country', phoneLength: 8 };
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length !== country.phoneLength) {
    return {
      isValid: false,
      message: `Phone number must be exactly ${country.phoneLength} digits for ${country.name}`
    };
  }
  
  return { isValid: true };
};

export const getPhoneValidationProtocol = (countryIso: string): string => {
  const country = countries.find(c => c.iso === countryIso) || { phoneLength: 8 };
  return `PROTOCOL: EXACTLY ${country.phoneLength} DIGITS REQUIRED`;
};
