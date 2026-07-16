import { useState } from 'react';
import { Plus, Film } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ReelsGrid from '../../components/reels/ReelsGrid';
import UploadReelModal from '../../components/reels/UploadReelModal';
import './ReelsPage.css';
import { useLocalization } from '../../contexts/useLocalization';

const ReelsPage = () => {
  const { user: currentUser } = useAuth();
  const { t } = useLocalization();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    // Force ReelsGrid to re-fetch by changing key
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="reels-page">
      <div className="reels-page-header">
        <div className="reels-page-title">
          <Film size={22} />
          <h2>{t('reels.title')}</h2>
        </div>
        {currentUser && (
          <button
            className="reels-upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={18} />
            {t('reels.create')}
          </button>
        )}
      </div>

      <div className="reels-page-body">
        <ReelsGrid key={refreshKey} />
      </div>

      <UploadReelModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default ReelsPage;
