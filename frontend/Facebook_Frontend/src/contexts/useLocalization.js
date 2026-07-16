import { useContext } from 'react';
import LocalizationContextValue from './localizationContextValue';

export const useLocalization = () => {
  const context = useContext(LocalizationContextValue);
  if (!context) throw new Error('useLocalization must be used inside LocalizationProvider');
  return context;
};
