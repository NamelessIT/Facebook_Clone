import { AlertTriangle, CheckCircle2, Info, LoaderCircle, X } from 'lucide-react';
import { Toaster, resolveValue, toast } from 'react-hot-toast';
import { useLocalization } from '../../contexts/useLocalization';
import './NotificationCenter.css';

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
        const eventCode = String(item.id).slice(-8).toUpperCase();

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
              {item.type === "error" && (
                <div className="app-toast-debug">
                  <span>{t('notification.eventCode')}</span>
                  <code>{eventCode}</code>
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
