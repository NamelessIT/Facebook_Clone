import { useState, useRef } from "react";
import { X, Image as ImageIcon, Video, Smile, UserPlus, MapPin, MoreHorizontal } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import postService from "../../services/postService";
import "./CreatePostModal.css"; // 👈 IMPORT CSS

const CreatePostModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/")
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    if (content.trim()) formData.append("Content", content);
    formData.append("Privacy", "0"); 
    formData.append("PostType", "0"); 

    files.forEach((f) => {
      if (f.isVideo) formData.append("Videos", f.file);
      else formData.append("Images", f.file);
    });

    try {
      await postService.createPost(formData);
      setContent("");
      setFiles([]);
      onSuccess(); 
      onClose();   
    } catch (error) {
      console.error("Lỗi đăng bài:", error);
      alert("Đăng bài thất bại!");
    } finally {
      setLoading(false);
    }
  };

  // Điều kiện kích hoạt nút: CÓ CHỮ HOẶC CÓ FILE
  const isPostEmpty = !content.trim() && files.length === 0;

  return (
    <div className="create-post-overlay">
      <div className="create-post-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative flex items-center justify-center p-4 border-b border-gray-200">
          <h2 className="text-[20px] font-bold text-[#050505] m-0">Tạo bài viết</h2>
          <button onClick={onClose} className="close-btn absolute right-4">
            <X size={20} />
          </button>
        </div>

        {/* Info User */}
        <div className="p-4 flex items-center gap-2">
          <Avatar src={user?.avatarUrl} className="w-10 h-10" />
          <div>
            <div className="font-semibold text-[15px]">{user?.fullName}</div>
            <div className="bg-[#e4e6eb] text-[#050505] text-[13px] font-semibold px-2 py-1 rounded-md mt-0.5 inline-flex items-center gap-1 cursor-pointer">
              🔒 Chỉ mình tôi <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>

        {/* Nhập Text */}
        <div className="px-4 overflow-y-auto flex-1 custom-scrollbar min-h-[150px]">
          <textarea
            className="w-full text-[24px] outline-none resize-none placeholder-gray-500"
            placeholder={`${user?.firstName} ơi, bạn đang nghĩ gì thế?`}
            rows={files.length > 0 ? 2 : 4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Dòng biểu tượng Aa giống Facebook */}
          {files.length === 0 && (
             <div className="flex justify-between items-center mt-2 mb-2">
               <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm cursor-pointer shadow-sm" style={{background: 'linear-gradient(45deg, #ff007f, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)'}}>Aa</div>
               <Smile size={24} className="text-gray-300 cursor-pointer" />
             </div>
          )}

          {/* Preview Ảnh/Video */}
          {files.length > 0 && (
            <div className="border border-gray-300 rounded-lg p-2 mt-2 grid grid-cols-2 gap-2 relative">
              <button onClick={() => setFiles([])} className="absolute top-4 right-4 bg-white border shadow rounded-full p-1.5 z-10 hover:bg-gray-100 cursor-pointer">
                 <X size={18} />
              </button>
              {files.map((f, index) => (
                <div key={index} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden border">
                  {f.isVideo ? (
                    <video src={f.preview} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={f.preview} className="w-full h-full object-cover" alt="preview" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Khu vực Add to post & Đăng */}
        <div className="p-4 pt-2">
          <div className="add-to-post-box">
            <span className="add-to-post-text">Thêm vào bài viết của bạn</span>
            <div className="flex gap-1">
              <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              
              <button onClick={() => fileInputRef.current?.click()} className="icon-btn-circle" title="Ảnh/video">
                <ImageIcon size={24} className="text-[#45bd62]" />
              </button>
              <button className="icon-btn-circle hidden sm:flex" title="Gắn thẻ">
                <UserPlus size={24} className="text-[#1877f2]" />
              </button>
              <button className="icon-btn-circle" title="Cảm xúc">
                <Smile size={24} className="text-[#f7b928]" />
              </button>
              <button className="icon-btn-circle hidden sm:flex" title="Check in">
                <MapPin size={24} className="text-[#f5533d]" />
              </button>
              <button className="icon-btn-circle" title="Xem thêm">
                <MoreHorizontal size={24} className="text-[#606266]" />
              </button>
            </div>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={isPostEmpty || loading}
            className="submit-post-btn"
          >
            {loading ? "Đang đăng..." : "Đăng"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreatePostModal;