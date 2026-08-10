import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmContextValue from './confirmContextValue';
import { useLocalization } from './useLocalization';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

const ConfirmProvider = ({ children }) => {
  const { t } = useLocalization();
  const resolverRef = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const close = useCallback((result) => {
    resolverRef.current?.(dialog?.mode === 'prompt' ? (result ? inputValue : null) : result);
    resolverRef.current = null;
    setDialog(null);
  }, [dialog?.mode, inputValue]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setDialog({ ...(typeof options === 'string' ? { message: options } : options), mode: 'confirm' });
  }), []);

  const prompt = useCallback((options) => new Promise((resolve) => {
    const next = typeof options === 'string' ? { message: options } : options;
    resolverRef.current?.(null);
    resolverRef.current = resolve;
    setInputValue(next.defaultValue || '');
    setDialog({ ...next, mode: 'prompt', danger: false });
  }), []);

  const contextValue = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <ConfirmContextValue.Provider value={contextValue}>
      {children}
      <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open && dialog) close(false); }}>
        {dialog && (
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogMedia className={dialog.danger === false ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}>
                <AlertTriangle />
              </AlertDialogMedia>
              <AlertDialogTitle>{dialog.title || t('confirm.title')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <span className="block">{dialog.message}</span>
                {dialog.detail && (
                  <span className="block rounded-lg border bg-muted/60 p-3 text-left text-xs text-foreground">
                    {dialog.detail}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {dialog.mode === 'prompt' && (
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={dialog.placeholder || ''}
                className="h-10"
                autoFocus
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => close(false)}>
                {dialog.cancelText || t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant={dialog.danger === false ? 'default' : 'destructive'}
                onClick={() => close(true)}
              >
                {dialog.confirmText || t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContextValue.Provider>
  );
};

export default ConfirmProvider;
