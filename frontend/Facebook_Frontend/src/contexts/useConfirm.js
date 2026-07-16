import { useContext } from 'react';
import ConfirmContextValue from './confirmContextValue';

export const useConfirm = () => {
  const value = useContext(ConfirmContextValue);
  if (!value) throw new Error('useConfirm must be used inside ConfirmProvider');
  return value.confirm;
};

export const usePrompt = () => {
  const value = useContext(ConfirmContextValue);
  if (!value) throw new Error('usePrompt must be used inside ConfirmProvider');
  return value.prompt;
};
