import { useState, useRef } from 'react';
import { MoreHorizontal, Link2, FolderPlus, X } from 'lucide-react';
import toast from '../../shared/appToast';
import { getImageUrl } from '../../utils/formatUrl';
import savedItemsService from '../../services/savedItemsService';
import './CardSavedPost.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

// Modal chọn bộ sưu tập để lưu vào
const CollectionModal = ({ postId, collections, selectedCollectionIds, onClose, onSaveToCollection }) => {
  const [selectedIds, setSelectedIds] = useState(() => new Set(selectedCollectionIds ?? []));
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleToggle = (colId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const handleConfirm = () => {
    onSaveToCollection(postId, { nextCollectionIds: [...selectedIds] });
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    onSaveToCollection(postId, { newName: newName.trim() });
    setNewName('');
    setShowCreate(false);
    onClose();
  };

  return (
    <div className="csp-modal-overlay" onClick={onClose}>
      <div className="csp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="csp-modal-header">
          <span>{translateCatalogKey('ui.components.post.cardsavedpost.them-vao-bo-suu-tap.aa41fc9a')}</span>
          <button className="csp-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="csp-modal-body">
          {collections.map((col) => (
            <button
              key={col.id}
              className={`csp-col-item ${selectedIds.has(col.id) ? 'csp-col-item--active' : ''}`}
              onClick={() => handleToggle(col.id)}
            >
              <span className="csp-col-icon">📁</span>
              <span>{col.name}</span>
              {selectedIds.has(col.id) && <span className="csp-col-check">✓</span>}
            </button>
          ))}
          {!showCreate ? (
            <button className="csp-create-btn" onClick={() => setShowCreate(true)}>
              {translateCatalogKey('ui.components.post.cardsavedpost.tao-bo-suu-tap-moi.b1b7bfc2')}
            </button>
          ) : (
            <div className="csp-create-form">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={translateCatalogKey('ui.components.post.cardsavedpost.ten-bo-suu-tap.3ba1b8a3')}
                className="csp-create-input"
                autoFocus
              />
              <button className="csp-create-confirm" onClick={handleCreate}>{translateCatalogKey('ui.components.post.cardsavedpost.tao.a78faee3')}</button>
              <button className="csp-create-cancel" onClick={() => setShowCreate(false)}>{translateCatalogKey('common.cancel')}</button>
            </div>
          )}
        </div>
        <div className="csp-modal-footer">
          <button className="csp-modal-confirm" onClick={handleConfirm}>
            {translateCatalogKey('ui.components.post.cardsavedpost.xong.4efb5e51')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Lấy thumbnail đầu tiên từ post (image hoặc video)
const getPostThumbnail = (post) => {
  if (!post.medias || post.medias.length === 0) return null;

  // Ưu tiên ảnh trước
  const firstImage = post.medias.find((m) => m.mediaType === 0 || m.type === 'image');
  if (firstImage) return getImageUrl(firstImage.url || firstImage.mediaUrl);

  // Nếu không có ảnh, lấy thumbnail của video
  const firstVideo = post.medias.find((m) => m.mediaType === 1 || m.type === 'video');
  if (firstVideo) return firstVideo.thumbnailUrl ? getImageUrl(firstVideo.thumbnailUrl) : null;

  return null;
};

const CardSavedPost = ({ post, onUnsave, collections = [], onSaveToCollection, onViewDetail, savedCollection }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const menuRef = useRef(null);

  const thumbnail = getPostThumbnail(post);
  const contentText = post.content || translateCatalogKey('post.noTextContent');

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(translateCatalogKey('common.linkCopied'));
    });
  };

  const handleUnsaveFromMenu = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    onUnsave(post.id);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu((v) => !v);
  };

  const handleCollectionModalOpen = async (e) => {
    e.stopPropagation();
    try {
      const res = await savedItemsService.getPostCollectionState(post.id);
      setSelectedCollectionIds(res.data?.data?.collectionIds ?? []);
      setShowCollectionModal(true);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.post.cardsavedpost.khong-the-tai-trang-thai-bo-suu-tap.b72d487b'), { context: "saved.collectionState.load" });
    }
  };

  return (
    <div className="csp-card">
      {/* Ảnh thumbnail bên trái - clickable để xem chi tiết */}
      <div className="csp-thumbnail" onClick={() => onViewDetail?.()}>
        {thumbnail ? (
          <img src={thumbnail} alt={translateCatalogKey('ui.components.post.cardsavedpost.post-media.981dca15')} className="csp-thumbnail-img" />
        ) : (
          <div className="csp-thumbnail-empty" />
        )}
      </div>

      {/* Nội dung bên phải */}
      <div className="csp-content" onClick={() => onViewDetail?.()}>
        {/* Tên tác giả */}
        <p className="csp-author">{post.author?.fullName || translateCatalogKey('chat.userFallback')}</p>

        {/* Nội dung bài post */}
        <p className="csp-text">
          {contentText.length > 120 ? contentText.slice(0, 120) + '...' : contentText}
        </p>

        {/* Mục đã lưu vào */}
        <p className="csp-collection-tag">
          📁 {savedCollection || post.savedCollection || translateCatalogKey('ui.components.post.cardsavedpost.tat-ca-bai-viet-a-luu.eb75678c')}
        </p>

        {/* Actions row */}
        <div className="csp-actions">
          {/* Thêm vào bộ sưu tập */}
          <button
            className="csp-action-btn"
            onClick={handleCollectionModalOpen}
            title={translateCatalogKey('ui.components.post.cardsavedpost.them-vao-bo-suu-tap.aa41fc9a')}
          >
            <FolderPlus size={16} />
            <span>{translateCatalogKey('ui.components.post.cardsavedpost.them-vao-bo-suu-tap.aa41fc9a')}</span>
          </button>

          {/* Chia sẻ / Sao chép link */}
          <button
            className="csp-action-btn"
            onClick={handleCopyLink}
            title={translateCatalogKey('post.copyLink')}
          >
            <Link2 size={16} />
            <span>{translateCatalogKey('post.share')}</span>
          </button>

          {/* 3 chấm dropdown */}
          <div className="csp-menu-wrap" ref={menuRef}>
            <button
              className="csp-action-btn csp-action-btn--icon"
              onClick={handleMenuToggle}
              title={translateCatalogKey('settings.preferences')}
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <div className="csp-dropdown">
                <button className="csp-dropdown-item csp-dropdown-item--danger" onClick={handleUnsaveFromMenu}>
                  {translateCatalogKey('ui.components.post.cardsavedpost.bo-luu.731edeee')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal bộ sưu tập */}
      {showCollectionModal && (
        <CollectionModal
          postId={post.id}
          collections={collections}
          selectedCollectionIds={selectedCollectionIds}
          onClose={(e) => { e?.stopPropagation?.(); setShowCollectionModal(false); }}
          onSaveToCollection={onSaveToCollection}
        />
      )}
    </div>
  );
};

export default CardSavedPost;
