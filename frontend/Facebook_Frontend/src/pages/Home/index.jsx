import { useEffect, useState } from "react";
import postService from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import { getImageUrl } from "../../utils/formatUrl";
import { Video, Image as ImageIcon, Smile, ThumbsUp, MessageSquare, Share2, MoreHorizontal } from "lucide-react";

const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... code fetchPosts cũ giữ nguyên ...
    const fetchPosts = async () => {
      try {
        const response = await postService.getFeed();
        setPosts(response.data.data); 
      } catch (error) {
        console.error("Lỗi khi tải bảng tin:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="max-w-[680px] w-full mx-auto pb-10 pt-4">
      
      {/* KHUNG TẠO BÀI VIẾT */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
        <div className="flex gap-2 items-center border-b pb-3 mb-3">
          <img 
            src={getImageUrl(user?.avatarUrl, user?.firstName)} 
            className="w-10 h-10 rounded-full object-cover border border-gray-200" 
            alt="User"
          />
          <div className="bg-[#f0f2f5] hover:bg-[#e4e6eb] cursor-pointer rounded-full px-4 py-2.5 w-full text-gray-500 transition font-medium">
            {user?.firstName} ơi, bạn đang nghĩ gì thế?
          </div>
        </div>
        <div className="flex justify-between px-2">
          <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500">
            <Video size={24} className="text-red-500" /> Video trực tiếp
          </button>
          <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500">
            <ImageIcon size={24} className="text-green-500" /> Ảnh/video
          </button>
          <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500">
            <Smile size={24} className="text-yellow-500" /> Cảm xúc
          </button>
        </div>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      {loading ? (
        <div className="text-center font-semibold text-gray-500 mt-5">Đang tải bảng tin...</div>
      ) : posts.length === 0 ? (
        <div className="text-center font-semibold text-gray-500 mt-5">Chưa có bài viết nào.</div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-white rounded-xl shadow-sm mb-4 border border-gray-200">
            {/* Header bài viết */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <img 
                  src={getImageUrl(post.author?.avatarUrl, post.author?.firstName)} 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200" 
                  alt="Author"
                />
                <div>
                  <h4 className="font-semibold text-[15px]">{post.author?.fullName}</h4>
                  <span className="text-xs text-gray-500 hover:underline cursor-pointer">
                    {new Date(post.createdAt).toLocaleString('vi-VN')} • 🌎
                  </span>
                </div>
              </div>
              <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* Nội dung text */}
            <div className="px-4 pb-3 text-[15px]">
              {post.content}
            </div>

            {/* Nếu post có ảnh thì hiện ảnh ở đây */}
            {post.imageUrl && (
              <img src={getImageUrl(post.imageUrl)} alt="Post content" className="w-full object-cover max-h-[600px] border-t border-b border-gray-100" />
            )}

            {/* Thống kê Like / Comment */}
            <div className="px-4 py-2 flex justify-between text-gray-500 text-[15px] border-b mx-4">
              <div className="flex items-center gap-1">
                <span className="bg-blue-500 text-white rounded-full p-1"><ThumbsUp size={12} fill="white" /></span>
                {post.reactionsCount || 0}
              </div>
              <div className="hover:underline cursor-pointer">{post.commentsCount || 0} bình luận</div>
            </div>

            {/* Các nút tương tác */}
            <div className="flex justify-between px-4 py-1">
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500 transition">
                <ThumbsUp size={20} /> Thích
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500 transition">
                <MessageSquare size={20} /> Bình luận
              </button>
              <button className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] p-2 rounded-lg font-semibold text-gray-500 transition">
                <Share2 size={20} /> Chia sẻ
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default HomePage;