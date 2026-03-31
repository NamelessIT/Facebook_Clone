import { useState, useRef } from 'react';
import { X, Upload, Film, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import reelService from '../../services/reelService';
import './UploadReelModal.css';

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const PRIVACY_OPTIONS = [
  { value: 0, label: 'Công khai' },
  { value: 1, label: 'Bạn bè' },
  { value: 2, label: 'Riêng tư' },
];

const UploadReelModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', description: '', privacy: 0 });
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'privacy' ? Number(value) : value }));
  };

  const validateAndSetVideo = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận file .mp4 hoặc .mov');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`File tối đa ${MAX_SIZE_MB}MB`);
      return;
    }
    const url = URL.createObjectURL(file);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error('Vui lòng chọn video');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Tiêu đề không được để trống');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('privacy', form.privacy);
    if (videoDuration > 0) formData.append('duration', videoDuration);

    setUploading(true);
    setProgress(0);

    try {
      const res = await reelService.uploadReel(formData, (ev) => {
        if (ev.total) {
          setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      });
      const created = res.data?.data || res.data;
      toast.success('Đăng Reel thành công!');
      handleRemoveVideo();
      setForm({ title: '', description: '', privacy: 0 });
      onSuccess?.(created);
      onClose();
    } catch {
      toast.error('Đăng Reel thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="urm-overlay" onClick={!uploading ? onClose : undefined}>
      <div className="urm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="urm-header">
          <div className="urm-header-title">
            <Film size={20} />
            <span>Đăng Reel mới</span>
          </div>
          {!uploading && (
            <button className="urm-close" onClick={onClose} aria-label="Đóng">
              <X size={20} />
            </button>
          )}
        </div>

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
              aria-label="Chọn video"
            >
              <Upload size={32} className="urm-upload-icon" />
              <p className="urm-dropzone-text">Kéo thả video vào đây</p>
              <p className="urm-dropzone-hint">hoặc click để chọn file • MP4, MOV • Tối đa {MAX_SIZE_MB}MB</p>
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
                    aria-label="Xoá video"
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
              <label className="urm-label" htmlFor="urm-title">
                Tiêu đề <span className="urm-required">*</span>
              </label>
              <input
                id="urm-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={100}
                placeholder="Nhập tiêu đề cho Reel"
                className="urm-input"
              />
              <span className="urm-char-count">{form.title.length}/100</span>
            </div>

            <div className="urm-field">
              <label className="urm-label" htmlFor="urm-desc">Mô tả</label>
              <textarea
                id="urm-desc"
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={500}
                placeholder="Mô tả về Reel của bạn (tùy chọn)"
                className="urm-textarea"
                rows={2}
              />
              <span className="urm-char-count">{form.description.length}/500</span>
            </div>

            <div className="urm-field">
              <label className="urm-label" htmlFor="urm-privacy">Đối tượng</label>
              <select
                id="urm-privacy"
                name="privacy"
                value={form.privacy}
                onChange={handleChange}
                className="urm-select"
              >
                {PRIVACY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="urm-progress-wrap">
              <div className="urm-progress-bar">
                <div
                  className="urm-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="urm-progress-text">{progress}%</span>
            </div>
          )}

          <div className="urm-footer">
            <button
              type="button"
              className="urm-btn urm-btn--secondary"
              onClick={onClose}
              disabled={uploading}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="urm-btn urm-btn--primary"
              disabled={uploading || !videoFile}
            >
              {uploading ? `Đang đăng ${progress}%...` : 'Đăng Reel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadReelModal;
