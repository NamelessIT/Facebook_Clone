import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TIMERS } from '../../shared/generated/constants';
import './NotInterestedItem.css';
import { useLocalization } from '../../contexts/useLocalization';

const AUTO_DISMISS_SECONDS = TIMERS.notInterestedAutoDismissSeconds;

const NotInterestedItem = ({ onUndo, onDismiss }) => {
  const { t } = useLocalization();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onDismiss?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDismiss]);

  const handleUndo = () => {
    onUndo?.();
  };

  return (
    <div className="ni-card">
      <div className="ni-body">
        <div className="ni-icon-wrap">
          <X size={20} />
        </div>
        <div className="ni-text">
          <p className="ni-title">{t('post.hiddenTitle')}</p>
          <p className="ni-desc">
            {t('post.hiddenDescription')}
          </p>
        </div>
      </div>
      <div className="ni-actions">
        <button className="ni-undo-btn" onClick={handleUndo}>
          {t('common.undo')}
        </button>
        <span className="ni-timer">{secondsLeft}s</span>
      </div>
    </div>
  );
};

export default NotInterestedItem;
