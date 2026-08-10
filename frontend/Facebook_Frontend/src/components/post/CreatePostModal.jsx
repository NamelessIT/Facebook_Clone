import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Smile, UserPlus, MapPin, MoreHorizontal, ArrowLeft, Search, Check } from "lucide-react";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import postService from "../../services/postService";
import friendshipService from "../../services/friendshipService";
import html2canvas from "html2canvas"; // 👈 IMPORT THƯ VIỆN CHỤP ẢNH
import "./CreatePostModal.css";
import toast from '../../shared/appToast';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Danh sách các emoji cơ bản
const EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '😭', '😡', '👍', '❤️', '🔥'];

// Danh sách các màu nền (Gồm Trắng (ko nền) và các màu Gradient)
const BG_COLORS = [
  { id: 'none', style: { background: 'white' } },
  { id: 'bg1', style: { background: 'linear-gradient(45deg, #ff007f, #ff7f00)' } },
  { id: 'bg2', style: { background: 'linear-gradient(45deg, #00c6ff, #0072ff)' } },
  { id: 'bg3', style: { background: 'linear-gradient(45deg, #11998e, #38ef7d)' } },
  { id: 'bg4', style: { background: 'linear-gradient(45deg, #8E2DE2, #4A00E0)' } },
];

const CreatePostModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // State cơ bản
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [privacy, setPrivacy] = useState("1");
  const [loading, setLoading] = useState(false);
  
  // Refs
  const fileInputRef = useRef(null);
  const bgCaptureRef = useRef(null); // 👈 REF ĐỂ XÁC ĐỊNH KHU VỰC CHỤP ẢNH
  
  // State UI
  const [showEmoji, setShowEmoji] = useState(false);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);

  // State Tag Bạn Bè
  const [showTagModal, setShowTagModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [taggedFriends, setTaggedFriends] = useState([]); 

  // Reset mọi thứ khi mở/đóng Modal
  useEffect(() => {
    if (!isOpen) {
      setContent(""); setFiles([]); setPrivacy("1"); setSelectedBg(BG_COLORS[0]);
      setShowBgSelector(false); setShowTagModal(false); setTaggedFriends([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- LOGIC XỬ LÝ FILE ---
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      file, preview: URL.createObjectURL(file), isVideo: file.type.startsWith("video/")
    }));
    setFiles(prev => [...prev, ...newFiles]);
    // Nếu up file thì phải tắt Background Color đi
    setSelectedBg(BG_COLORS[0]); 
  };

  const removeSingleFile = (indexToRemove, e) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- LOGIC GẮN THẺ BẠN BÈ ---
  const handleOpenTagModal = async () => {
    setShowTagModal(true);
    try {
      const res = await friendshipService.getFriends();
      if (res.data?.data) setFriendsList(res.data.data);
    } catch (error) {
      toast.apiError(error, translateCatalogKey('friends.loadFailed'), { context: 'posts.create.friends' });
    }
  };

  const toggleTagFriend = (friend) => {
    setTaggedFriends(prev => {
      const isTagged = prev.find(f => f.id === friend.id);
      if (isTagged) return prev.filter(f => f.id !== friend.id);
      return [...prev, friend];
    });
  };

  const handleFinishTagging = () => {
    setShowTagModal(false);
    if (taggedFriends.length > 0) {
      const tagString = taggedFriends.map(f => `@${f.fullName}`).join(" ");
      setContent(prev => `${prev} ${tagString} `);
    }
  };

  const handleAddEmoji = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
  };

  // --- LOGIC ĐĂNG BÀI (CÓ HTML2CANVAS) ---
  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0 && selectedBg.id === 'none') return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("Privacy", privacy); 
    formData.append("PostType", "1"); 

    const hasBg = selectedBg.id !== 'none';

    try {
      if (hasBg && bgCaptureRef.current) {
        // 1. Chụp màn hình khu vực có Ref
        const canvas = await html2canvas(bgCaptureRef.current, { scale: 2 });
        // 2. Chuyển Canvas thành file Ảnh
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        // 3. Đưa vào FormData như một ảnh bình thường
        formData.append("Images", blob, "background-post.png");
        // Bỏ qua không gửi content text nữa vì nó đã nằm trong ảnh
      } else {
        // Chế độ bình thường (Không dùng màu nền)
        if (content.trim()) formData.append("Content", content);
        files.forEach((f) => {
          if (f.isVideo) formData.append("Videos", f.file);
          else formData.append("Images", f.file);
        });
      }

      await postService.createPost(formData);
      onSuccess(); 
      onClose();   
    } catch (error) {
      toast.apiError(error, translateCatalogKey('ui.components.post.createpostmodal.ang-bai-that-bai.0be6e313'), { context: 'posts.create' });
    } finally {
      setLoading(false);
    }
  };

  const hasBg = selectedBg.id !== 'none';
  // Chống đăng rỗng: Nếu có nền -> bắt buộc phải có chữ. Nếu không nền -> có chữ hoặc có file
  const isPostEmpty = hasBg ? !content.trim() : (!content.trim() && files.length === 0);
  const mediaCount = files.length;

  return (
    <div className="create-post-overlay" onMouseDown={onClose}>
      
      <div className="create-post-modal relative overflow-hidden" onMouseDown={e => e.stopPropagation()}>
        
        {/* MODAL GẮN THẺ BẠN BÈ */}
        {showTagModal && (
          <div className="tag-friends-modal">
            <div className="tag-friends-header">
              <button onClick={() => setShowTagModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 transition">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <h3 className="font-bold text-[18px]">{translateCatalogKey('ui.components.post.createpostmodal.gan-the-nguoi-khac.477d6d82')}</h3>
              <button onClick={handleFinishTagging} className="text-[#0866ff] font-semibold hover:bg-blue-50 px-2 py-1 rounded">{translateCatalogKey('ui.components.post.cardsavedpost.xong.4efb5e51')}</button>
            </div>
            
            <div className="tag-search-box">
              <Search size={18} className="text-gray-500 mr-2" />
              <input 
                type="text" placeholder={translateCatalogKey('common.search')} className="bg-transparent outline-none flex-1 text-[15px]"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="px-4 text-[13px] font-semibold text-gray-500 mb-2">{translateCatalogKey('ui.components.post.createpostmodal.goi-y.98a1ba13')}</div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {friendsList.filter(f => f.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map(friend => {
                const isSelected = taggedFriends.some(t => t.id === friend.id);
                return (
                  <div key={friend.id} onClick={() => toggleTagFriend(friend)} className={`friend-item ${isSelected ? 'selected' : ''}`}>
                    <Avatar src={friend.avatarUrl} className="w-10 h-10" />
                    <div className="flex-1">
                      <div className="font-semibold text-[15px]">{friend.fullName}</div>
                    </div>
                    {isSelected && <Check size={20} className="text-[#0866ff]" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* HEADER CHÍNH */}
        <div className="relative flex items-center justify-center p-4">
          <h2 className="text-[20px] font-bold text-[#050505] m-0">{translateCatalogKey('post.create')}</h2>
          <button onClick={onClose} className="close-btn absolute right-4"><X size={20} /></button>
        </div>
        <hr className="m-0 border-t border-[#ced0d4]" />

        {/* THÔNG TIN USER */}
        <div className="p-4 flex items-center gap-3">
          <Avatar src={user?.avatarUrl} className="w-10 h-10" />
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] text-[#050505]">{user?.fullName}</span>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="create-post-privacy-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{translateCatalogKey('ui.components.post.createpostmodal.cong-khai.e400efcb')}</SelectItem>
                <SelectItem value="2">{translateCatalogKey('ui.components.post.createpostmodal.ban-be.af8f0037')}</SelectItem>
                <SelectItem value="3">{translateCatalogKey('ui.components.post.createpostmodal.chi-minh-toi.f3ec78e2')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KHU VỰC NHẬP TEXT */}
        <div className="px-4 overflow-y-auto flex-1 custom-scrollbar relative min-h-[150px]">
          
          {/* 👇 GẮN REF VÀO ĐÂY ĐỂ CHỤP ẢNH MÀU NỀN 👇 */}
          <div 
            ref={bgCaptureRef} 
            className={hasBg ? "bg-capture-wrapper" : ""}
            style={hasBg ? selectedBg.style : {}}
          >
            <textarea
              className={`w-full text-[24px] outline-none resize-none placeholder-gray-500 ${hasBg ? 'textarea-with-bg' : ''}`}
              placeholder={translateCatalogKey('ui.components.post.createpostmodal.value0-oi-ban-ang-nghi-gi-the.d1f139f9', { value0: user?.firstName })}
              rows={mediaCount > 0 || hasBg ? 2 : 4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* CHỌN MÀU NỀN */}
          {mediaCount === 0 && (
             <div className="flex justify-between items-center mt-2 mb-2 relative">
               {!showBgSelector ? (
                 <div onClick={() => setShowBgSelector(true)} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm cursor-pointer shadow-sm" style={{background: 'linear-gradient(45deg, #ff007f, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)'}}>{translateCatalogKey('ui.components.post.createpostmodal.aa.913396ad')}</div>
               ) : (
                 <div className="bg-selector-container">
                   <button onClick={() => setShowBgSelector(false)} className="bg-gray-200 p-1.5 rounded-lg mr-2"><ArrowLeft size={16}/></button>
                   {BG_COLORS.map(bg => (
                     <div 
                       key={bg.id} 
                       onClick={() => setSelectedBg(bg)} 
                       className={`bg-color-btn ${selectedBg.id === bg.id ? 'active' : ''}`} 
                       style={bg.style}
                     ></div>
                   ))}
                 </div>
               )}
               
               <Smile onClick={() => setShowEmoji(!showEmoji)} size={24} className="text-gray-400 hover:text-gray-600 cursor-pointer transition ml-auto" />
               {showEmoji && (
                 <div className="emoji-picker-container">
                   {EMOJIS.map(em => <button key={em} onClick={() => handleAddEmoji(em)} className="emoji-btn">{em}</button>)}
                 </div>
               )}
             </div>
          )}

          {/* LƯỚI PREVIEW ẢNH */}
          {mediaCount > 0 && !hasBg && (
            <div className="preview-gallery">
              <button onClick={() => setFiles([])} className="absolute top-2 left-2 bg-white text-sm font-semibold px-2 py-1 rounded-md z-10 border hover:bg-gray-100">{translateCatalogKey('ui.components.post.createpostmodal.xoa-tat-ca.9c7129da')}</button>
              
              {mediaCount === 1 && (
                <div className="preview-grid-1">
                  <div className="preview-item">
                    <button onClick={(e) => removeSingleFile(0, e)} className="delete-single-img-btn"><X size={16}/></button>
                    {files[0].isVideo ? <video src={files[0].preview} controls /> : <img src={files[0].preview} />}
                  </div>
                </div>
              )}
              {mediaCount === 2 && (
                <div className="preview-grid-2">
                  <div className="preview-item"><button onClick={(e) => removeSingleFile(0, e)} className="delete-single-img-btn"><X size={16}/></button>{files[0].isVideo ? <video src={files[0].preview} /> : <img src={files[0].preview} />}</div>
                  <div className="preview-item"><button onClick={(e) => removeSingleFile(1, e)} className="delete-single-img-btn"><X size={16}/></button>{files[1].isVideo ? <video src={files[1].preview} /> : <img src={files[1].preview} />}</div>
                </div>
              )}
              {mediaCount >= 3 && (
                <div className="preview-grid-3">
                  <div className="preview-item preview-item-main"><button onClick={(e) => removeSingleFile(0, e)} className="delete-single-img-btn"><X size={16}/></button>{files[0].isVideo ? <video src={files[0].preview} /> : <img src={files[0].preview} />}</div>
                  <div className="preview-item preview-item-sub"><button onClick={(e) => removeSingleFile(1, e)} className="delete-single-img-btn"><X size={16}/></button>{files[1].isVideo ? <video src={files[1].preview} /> : <img src={files[1].preview} />}</div>
                  <div className="preview-item preview-item-sub">
                    <button onClick={(e) => removeSingleFile(2, e)} className="delete-single-img-btn"><X size={16}/></button>
                    {files[2].isVideo ? <video src={files[2].preview} /> : <img src={files[2].preview} />}
                    {mediaCount > 3 && <div className="preview-overlay">+{mediaCount - 3}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* THÊM VÀO BÀI VIẾT */}
        <div className="p-4 pt-2">
          <div className="add-to-post-box">
            <span className="add-to-post-text">{translateCatalogKey('ui.components.post.createpostmodal.them-vao-bai-viet-cua-ban.22b28384')}</span>
            <div className="flex gap-1 items-center relative">
              <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              
              <button 
                onClick={() => !hasBg && fileInputRef.current?.click()} 
                className={`p-2 rounded-full transition ${hasBg ? 'icon-btn-disabled' : 'hover:bg-[#f0f2f5]'}`}
                title={hasBg ? translateCatalogKey('ui.components.post.createpostmodal.khong-the-them-anh-video-khi-ang-dun.49de2619') : translateCatalogKey('post.photoVideo')}
              >
                <ImageIcon size={24} className="text-[#45bd62]" />
              </button>
              
              <button onClick={handleOpenTagModal} className="p-2 hover:bg-[#f0f2f5] rounded-full transition hidden sm:flex" title={translateCatalogKey('ui.components.post.createpostmodal.gan-the-nguoi-khac.477d6d82')}>
                <UserPlus size={24} className="text-[#1877f2]" />
              </button>
              
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 hover:bg-[#f0f2f5] rounded-full transition" title={translateCatalogKey('ui.components.post.createpostmodal.cam-xuc.875697ca')}><Smile size={24} className="text-[#f7b928]" /></button>
              <button className="p-2 hover:bg-[#f0f2f5] rounded-full transition hidden sm:flex" title={translateCatalogKey('ui.components.post.createpostmodal.check-in.7860ed71')}><MapPin size={24} className="text-[#f5533d]" /></button>
              <button className="p-2 hover:bg-[#f0f2f5] rounded-full transition" title={translateCatalogKey('post.seeMore')}><MoreHorizontal size={24} className="text-[#606266]" /></button>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={isPostEmpty || loading} className="submit-post-btn">{loading ? translateCatalogKey('ui.components.post.createpostmodal.ang-ang.79175761') : translateCatalogKey('post.publish')}</button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
