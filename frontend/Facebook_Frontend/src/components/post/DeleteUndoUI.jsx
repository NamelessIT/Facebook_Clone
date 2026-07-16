import { Flag, RotateCcw, X } from 'lucide-react';
import './DeleteUndoUI.css';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const DeleteUndoUI = ({ timeRemaining, onUndo, onReport, onDismiss }) => {
  const { t } = useLocalization();
  return (
    <div className="duu-card">
      <div className="duu-content">
        <span className="duu-message">{t('post.hidden')}</span>
        <span className="duu-timer">{timeRemaining}s</span>
      </div>

      <div className="duu-actions">
        <button className="duu-btn duu-btn--report" onClick={onReport}>
          <Flag size={15} />
          {t('common.report')}
        </button>
        <button className="duu-btn duu-btn--undo" onClick={onUndo}>
          <RotateCcw size={15} />
          {t('common.undo')}
        </button>
        <button className="duu-btn duu-btn--close" onClick={onDismiss} aria-label={translateCatalogKey('ui.components.post.deleteundoui.xoa-ngay.9ca24606')}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default DeleteUndoUI;
