import { useEffect, useState } from "react";
import postService from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import { Video, Image as ImageIcon, Smile, ThumbsUp, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import PostMedia from "../../components/common/PostMedia";
import "./Post.css"; // 👈 GỌI CSS VÀO ĐÂY

const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    postService.getFeed().then(res => setPosts(res.data.data)).catch(err => console.error(err));
  }, []);

  return (
    <div className="feed-wrapper">
      
      {/* KHUNG TẠO BÀI VIẾT */}
      <div className="fb-card p-4">
        <div className="flex gap-2 items-center border-b pb-3 mb-3">
          <Avatar src={user?.avatarUrl} className="w-10 h-10" />
          <div className="bg-[#f0f2f5] hover:bg-[#e4e6eb] cursor-pointer rounded-full px-4 py-2.5 w-full text-gray-500 font-medium">
            {user?.firstName} ơi, bạn đang nghĩ gì thế?
          </div>
        </div>
        <div className="flex justify-between px-2">
          <button className="action-btn"><Video className="text-red-500"/> Video trực tiếp</button>
          <button className="action-btn"><ImageIcon className="text-green-500"/> Ảnh/video</button>
          <button className="action-btn"><Smile className="text-yellow-500"/> Cảm xúc</button>
        </div>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      {posts.map((post) => (
        <div key={post.id} className="fb-card">
          {/* Header */}
          <div className="post-header">
            <div className="post-header-left items-center">
              <Avatar src={post.author?.avatarUrl} className="w-10 h-10" />
              <div>
                <p className="post-author-name">{post.author?.fullName}</p>
                <p className="post-time">{new Date(post.createdAt).toLocaleString('vi-VN')} • 🌎</p>
              </div>
            </div>
            <button style={{border: 'none', background: 'transparent', cursor: 'pointer', color: '#65676b'}}><MoreHorizontal /></button>
          </div>

          {/* Text */}
          <div className="post-content">{post.content}</div>

          {/* Media (Ảnh/Video) */}
          {post.imageUrl && <PostMedia url={post.imageUrl} isVideo={false} />}
          {post.videoUrl && <PostMedia url={post.videoUrl} isVideo={true} />}

          {/* Stats */}
          <div className="post-stats">
            <div className="flex items-center gap-1">
              <span className="bg-blue-500 text-white rounded-full p-1"><ThumbsUp size={12} fill="white" /></span>
              {post.reactionsCount || 0}
            </div>
            <div className="hover:underline cursor-pointer">{post.commentsCount || 0} bình luận</div>
          </div>

          {/* Actions */}
          <div className="post-actions">
            <button className="action-btn"><ThumbsUp size={20} /> Thích</button>
            <button className="action-btn"><MessageSquare size={20} /> Bình luận</button>
            <button className="action-btn"><Share2 size={20} /> Chia sẻ</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HomePage;