import { useCallback, useEffect, useState } from "react";
import postService from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import { Video, Image as ImageIcon, Smile } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import CreatePostModal from "../../components/post/CreatePostModal"; 
import PostItem from "../../components/post/PostItem"; 
import ReelsHorizontalFeed from "../../components/reels/ReelsHorizontalFeed";
import { useLocalization } from "../../contexts/useLocalization";
import "./HomePage.css";
import toast from '../../shared/appToast';

const HomePage = () => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = useCallback(() => {
    postService.getFeed()
      .then((res) => setPosts(res.data.data))
      .catch((error) => toast.apiError(error, t('post.loadFailed'), { id: 'home-feed-load-error', context: 'posts.feed.load' }));
  }, [t]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="feed-wrapper">
      
      {/* KHUNG TẠO BÀI VIẾT (Giao diện 1 DÒNG duy nhất) */}
      <div className="fb-card create-post-container">
        
        {/* 1. Avatar */}
        <Avatar src={user?.avatarUrl} className="w-10 h-10" />
        
        {/* 2. Ô nhập chữ giả */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="fb-content-submit"
        >
          {t('post.whatsOnMindNamed', undefined, { name: user?.firstName || '' })}
        </div>
        
        {/* 3. Khu vực Icon chức năng nhanh */}
        <div className="create-post-actions">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="quick-action-btn" 
            title={t('post.liveVideo')}
            style={{ "--main-color": "#f3425f" }}
          >
            <Video size={24} className="text-[#f3425f]" />
          </button>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="quick-action-btn" 
            title={t('post.photoVideo')}
            style={{ "--main-color": "#45bd62" }}
          >
            <ImageIcon size={24} className="text-[#45bd62]" />
          </button>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="quick-action-btn hidden sm:flex" 
            title={t('post.feelingActivity')}
            style={{ "--main-color": "#f7b928" }}
          >
            <Smile size={24} className="text-[#f7b928]" />
          </button>
        </div>

      </div>

      {/* COMPONENT MODAL NHẬP LIỆU CHÍNH */}
      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchPosts} 
      />

      {/* REELS CUỘN NGANG */}
      <ReelsHorizontalFeed />

      {/* DANH SÁCH BÀI VIẾT */}
      {posts.map((post) => (
         <PostItem key={post.id} post={post} onPostUpdated={fetchPosts} />
      ))}
      
    </div>
  );
};

export default HomePage;
