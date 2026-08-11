import { useState, useRef } from 'react';
import { X, Upload, Film, CheckCircle } from 'lucide-react';
import toast from '../../shared/appToast';
import reelService from '../../services/reelService';
import { useLocalization } from '../../contexts/useLocalization';
import { LIMITS } from '../../shared/generated/constants';
import { getApiErrorDetails } from '../../shared/apiError';
import './UploadReelModal.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const MAX_SIZE_MB = LIMITS.maxVideoUploadMb;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const PRIVACY_OPTIONS = [
  { value: 1, labelKey: 'privacy.public' },
  { value: 2, labelKey: 'privacy.friends' },
  { value: 3, labelKey: 'privacy.onlyMe' },
];

const UploadReelModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLocalization();
  const [form, setForm] = useState({ title: '', description: '', privacy: 1 });
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'privacy' ? Number(value) : value }));
  };

  const validateAndSetVideo = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(t('reels.invalidVideoType'));
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(t('reels.videoTooLarge', undefined, { max: MAX_SIZE_MB }));
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadError(null);
    setVideoFile(file);
    setVideoPreview(url);
  };

  const handleFileInput = (e) => {
    validateAndSetVideo(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    validateAndSetVideo(e.dataTransfer.files[0]);
  };

  const handleVideoLoaded = () => {
    if (videoPreviewRef.current) {
      setVideoDuration(Math.round(videoPreviewRef.current.duration));
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setProgress(0);
    setUploadError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error(t('reels.selectVideoRequired'));
      return;
    }
    if (!form.title.trim()) {
      toast.error(t('reels.titleRequired'));
      return;
    }

    const formData = new FormData();
    formData.append('videoFile', videoFile);
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('privacy', form.privacy);
    if (videoDuration > 0) formData.append('duration', videoDuration);

    setUploading(true);
    setProgress(0);
    setUploadError(null);

    try {
      const res = await reelService.uploadReel(formData, (ev) => {
        if (ev.total) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      });
      const created = res.data?.data || res.data;
      toast.success(t('reels.createSuccess'));
      handleRemoveVideo();
      setForm({ title: '', description: '', privacy: 1 });
      onSuccess?.(created);
      onClose();
    } catch (error) {
      const details = getApiErrorDetails(error, t('reels.createFailed'));
      setUploadError(details);
      toast.apiError(error, t('reels.createFailed'), { context: "reels.upload" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !uploading && onClose()}>
      <DialogContent className="urm-dialog sm:max-w-2xl" showCloseButton={!uploading}>
        <DialogHeader className="urm-header">
          <DialogTitle className="urm-header-title">
            <Film size={20} />
            <span>{t('reels.createTitle')}</span>
          </DialogTitle>
          <DialogDescription>{t('reels.dropVideoHint', undefined, { max: MAX_SIZE_MB })}</DialogDescription>
        </DialogHeader>

        <form className="urm-body" onSubmit={handleSubmit}>
          {/* Video zone */}
          {!videoPreview ? (
            <div
              className={`urm-dropzone${dragOver ? ' urm-dropzone--over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              aria-label={t('reels.selectVideo')}
            >
              <Upload size={32} className="urm-upload-icon" />
              <p className="urm-dropzone-text">{t('reels.dropVideo')}</p>
              <p className="urm-dropzone-hint">
                {t('reels.dropVideoHint', undefined, { max: MAX_SIZE_MB })}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="urm-file-input"
                onChange={handleFileInput}
              />
            </div>
          ) : (
            <div className="urm-preview-wrap">
              <video
                ref={videoPreviewRef}
                src={videoPreview}
                className="urm-preview-video"
                controls
                onLoadedMetadata={handleVideoLoaded}
              />
              <div className="urm-preview-info">
                <CheckCircle size={14} className="urm-preview-check" />
                <span>{videoFile.name}</span>
                <span className="urm-preview-size">
                  ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
                {!uploading && (
                  <button
                    type="button"
                    className="urm-remove-btn"
                    onClick={handleRemoveVideo}
                    aria-label={t('reels.removeVideo')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="urm-fields">
            <div className="urm-field">
              <Label className="urm-label" htmlFor="urm-title">
                {t('common.title')} <span className="urm-required">*</span>
              </Label>
              <Input
                id="urm-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={100}
                placeholder={t('reels.titlePlaceholder')}
                className="urm-input"
              />
              <span className="urm-char-count">{form.title.length}/100</span>
            </div>

            <div className="urm-field">
              <Label className="urm-label" htmlFor="urm-desc">{t('common.description')}</Label>
              <Textarea
                id="urm-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={500}
                placeholder={t('reels.descriptionPlaceholder')}
                className="urm-textarea"
                rows={2}
              />
              <span className="urm-char-count">{form.description.length}/500</span>
            </div>

            <div className="urm-field">
              <Label className="urm-label" htmlFor="urm-privacy">{t('privacy.audience')}</Label>
              <Select value={String(form.privacy)} onValueChange={(value) => setForm((prev) => ({ ...prev, privacy: Number(value) }))}>
                <SelectTrigger id="urm-privacy" className="urm-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                {PRIVACY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="urm-progress-wrap">
              <Progress value={progress} className="urm-progress-bar" />
              <span className="urm-progress-text">{progress}%</span>
            </div>
          )}

          {uploadError && (
            <div className="urm-error" role="alert">
              <strong>{uploadError.message}</strong>
              <div className="urm-error-details">
                {uploadError.status && <span>{t('notification.httpStatus')}: <code>{uploadError.status}</code></span>}
                {uploadError.errorCode && <span>{t('notification.errorCode')}: <code>{uploadError.errorCode}</code></span>}
                {uploadError.correlationId && <span>{t('notification.requestId')}: <code>{uploadError.correlationId}</code></span>}
                {uploadError.retryAfter && <span>{t('notification.retryAfter', undefined, { seconds: uploadError.retryAfter })}</span>}
              </div>
            </div>
          )}

          <div className="urm-footer">
            <Button
              type="button"
              variant="outline"
              className="urm-btn urm-btn--secondary"
              onClick={onClose}
              disabled={uploading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="urm-btn urm-btn--primary"
              disabled={uploading || !videoFile}
            >
              {uploading
                ? t('reels.uploadingProgress', undefined, { progress })
                : t('reels.publish')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadReelModal;
