import { useState } from "react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import postService from "../../services/postService";
import toast from '../../shared/appToast';
import { PostPrivacy } from "../../shared/generated/enums";
import useSingleFlightAction from "../../hooks/useSingleFlightAction";
import "./SharePostModal.css";
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const SharePostModal = ({ post, isOpen, onClose, onShared }) => {
  const { user } = useAuth();
  const { locale, t } = useLocalization();
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState(PostPrivacy.Public);

  // Single-flight guard: blocks double-submit even on very fast double clicks.
  const { run: handleShare, isRunning: loading } = useSingleFlightAction(async () => {
    try {
      await postService.sharePost(post.id, {
        caption: content,
        privacy,
      });
      toast.success(translateCatalogKey('ui.components.post.sharepostmodal.a-chia-se-bai-viet.b84a67ab'));
      setContent("");
      onClose();
      onShared?.();
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.post.sharepostmodal.chia-se-that-bai.dd30f06b'), { context: "posts.share" });
    }
  });

  if (!isOpen || !post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="share-modal sm:max-w-lg">
        {/* Header */}
        <DialogHeader className="share-modal-header">
          <DialogTitle>{t('post.shareTitle')}</DialogTitle>
          <DialogDescription>{t('post.sharePlaceholder')}</DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="share-modal-body">
          <div className="share-user-info">
            <Avatar src={user?.avatarUrl} className="w-10 h-10" />
            <div>
              <div className="share-user-name">{user?.fullName}</div>
              <Select value={String(privacy)} onValueChange={(value) => setPrivacy(Number(value))}>
                <SelectTrigger className="share-privacy-select" aria-label={t('privacy.audience')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(PostPrivacy.Public)}>{t('privacy.public')}</SelectItem>
                  <SelectItem value={String(PostPrivacy.Friends)}>{t('privacy.friends')}</SelectItem>
                  <SelectItem value={String(PostPrivacy.Private)}>{t('privacy.onlyMe')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            className="share-textarea"
            placeholder={t('post.sharePlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />

          {/* Preview bài viết gốc */}
          <div className="share-original-post">
            <div className="share-original-header">
              <Avatar src={post.author?.avatarUrl} className="w-8 h-8" />
              <div>
                <div className="share-original-author">{post.author?.fullName}</div>
                <div className="share-original-time">
                  {new Date(post.createdAt).toLocaleString(locale)}
                </div>
              </div>
            </div>
            {post.content && (
              <p className="share-original-content">{post.content}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="share-modal-footer">
          <Button
            className="share-submit-btn"
            onClick={handleShare}
            disabled={loading}
          >
            {loading ? t('post.sharing') : t('post.shareNow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostModal;
