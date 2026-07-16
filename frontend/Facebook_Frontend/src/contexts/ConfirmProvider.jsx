import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import ConfirmContextValue from './confirmContextValue';
import { useLocalization } from './useLocalization';
import '../components/feedback/ConfirmDialog.css';

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
      {dialog && (
        <div className="app-confirm-backdrop" role="presentation" onMouseDown={() => close(false)}>
          <section className="app-confirm" role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="app-confirm-icon"><AlertTriangle size={22} /></div>
            <div className="app-confirm-copy">
              <h2 id="app-confirm-title">{dialog.title || t('confirm.title')}</h2>
              <p>{dialog.message}</p>
              {dialog.detail && <div className="app-confirm-detail">{dialog.detail}</div>}
              {dialog.mode === "prompt" && (
                <input className="app-confirm-input" value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={dialog.placeholder || ''} autoFocus />
              )}
            </div>
            <button className="app-confirm-close" type="button" onClick={() => close(false)} aria-label={t('common.close')}><X size={18} /></button>
            <div className="app-confirm-actions">
              <button className="app-confirm-btn app-confirm-btn--cancel" type="button" onClick={() => close(false)}>{dialog.cancelText || t('common.cancel')}</button>
              <button className={`app-confirm-btn ${dialog.danger === false ? 'app-confirm-btn--primary' : 'app-confirm-btn--danger'}`} type="button" onClick={() => close(true)}>{dialog.confirmText || t('common.confirm')}</button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContextValue.Provider>
  );
};

export default ConfirmProvider;
