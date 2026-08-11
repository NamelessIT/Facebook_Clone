import { AlertTriangle, CheckCircle2, Info, LoaderCircle, X } from 'lucide-react';
import { Toaster, resolveValue } from 'react-hot-toast';
import toast from '../../shared/appToast';
import { useLocalization } from '../../contexts/useLocalization';
import './NotificationCenter.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const TYPE_CONFIG = {
  success: { Icon: CheckCircle2, titleKey: 'notification.success', className: 'app-toast--success' },
  error: { Icon: AlertTriangle, titleKey: 'notification.error', className: 'app-toast--error' },
  loading: { Icon: LoaderCircle, titleKey: 'notification.loading', className: 'app-toast--loading' },
  blank: { Icon: Info, titleKey: 'notification.info', className: 'app-toast--info' },
  custom: { Icon: Info, titleKey: 'notification.info', className: 'app-toast--info' },
};

const NotificationCenter = () => {
  const { t } = useLocalization();

  return (
    <Toaster position="top-right" gutter={10} containerClassName="app-toast-region">
      {(item) => {
        const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.blank;
        const { Icon } = config;
        const message = resolveValue(item.message, item);
        const diagnostics = item.diagnostics;
        const clientEventId = String(item.id).slice(-8).toUpperCase();

        return (
          <div className={`app-toast ${config.className} ${item.visible ? 'app-toast--visible' : ''}`} role="status">
            <div className="app-toast-icon" aria-hidden="true">
              <Icon size={20} className={item.type === 'loading' ? 'app-toast-spinner' : ''} />
            </div>
            <div className="app-toast-content">
              <div className="app-toast-heading">
                <strong>{t(config.titleKey)}</strong>
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="app-toast-message">{message}</div>
              {item.type === 'error' && diagnostics && (
                <div className="app-toast-debug">
                  {diagnostics.status && <span>{"HTTP"} <code>{diagnostics.status}</code></span>}
                  {diagnostics.errorCode && <span>{t('notification.errorCode')} <code>{diagnostics.errorCode}</code></span>}
                  {diagnostics.correlationId && <span>{t('notification.requestId')} <code>{diagnostics.correlationId}</code></span>}
                  {diagnostics.endpoint && <span className="app-toast-debug-endpoint"><code>{diagnostics.method}</code> {diagnostics.endpoint}</span>}
                  {diagnostics.validationErrors?.map((validationError) => (
                    <span className="app-toast-validation" key={validationError}>{validationError}</span>
                  ))}
                </div>
              )}
              {item.type === 'error' && !diagnostics && (
                <div className="app-toast-debug">
                  <span>{t('notification.clientEventId')}</span>
                  <code>{clientEventId}</code>
                </div>
              )}
            </div>
            <button className="app-toast-close" type="button" onClick={() => toast.dismiss(item.id)} aria-label={t('common.close')}>
              <X size={16} />
            </button>
            {item.type !== "loading" && <span className="app-toast-progress" />}
          </div>
        );
      }}
    </Toaster>
  );
};

export default NotificationCenter;
