import { useEffect, useState } from "react";
import postService from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import { Video, Image as ImageIcon, Smile } from "lucide-react";
import Avatar from "../../components/common/Avatar";
import CreatePostModal from "../../components/post/CreatePostModal"; 
import PostItem from "../../components/post/PostItem"; // 👈 IMPORT COMPONENT MỚI
import "./Post.css";
import "./HomePage.css"; // 👈 IMPORT CSS CHO TRANG HOME

const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = () => {
    postService.getFeed().then(res => setPosts(res.data.data)).catch(err => console.error(err));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="feed-wrapper">
      
      {/* KHUNG TẠO BÀI VIẾT */}
      <div className="fb-card p-3 mb-4">
        <div className="flex gap-2 items-center">
          <Avatar src={user?.avatarUrl} className="w-10 h-10" />
          <div 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#f0f2f5] hover:bg-[#e4e6eb] cursor-pointer rounded-full px-4 py-2.5 flex-1 text-[#65676b] text-[17px] transition fb-content-submit"
          >
            {user?.firstName} ơi, bạn đang nghĩ gì thế?
          </div>
        </div>
        
        <hr className="my-3 border-[#ced0d4]" />
        
        <div className="flex justify-between px-2">
          <button onClick={() => setIsModalOpen(true)} className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] py-2 rounded-lg cursor-pointer transition">
            <Video size={24} className="text-[#f3425f]"/> <span className="text-[#65676b] font-semibold text-[15px]">Video trực tiếp</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex-1 flex justify-center items-center gap-2 hover:bg-[#f0f2f5] py-2 rounded-lg cursor-pointer transition">
            <ImageIcon size={24} className="text-[#45bd62]"/> <span className="text-[#65676b] font-semibold text-[15px]">Ảnh/video</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex-1 hidden sm:flex justify-center items-center gap-2 hover:bg-[#f0f2f5] py-2 rounded-lg cursor-pointer transition">
            <Smile size={24} className="text-[#f7b928]"/> <span className="text-[#65676b] font-semibold text-[15px]">Cảm xúc/hoạt động</span>
          </button>
        </div>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchPosts} 
      />

      {/* DANH SÁCH BÀI VIẾT - NGẮN GỌN VÀ SẠCH SẼ */}
      {posts.map((post) => (
         <PostItem key={post.id} post={post} />
      ))}
      
    </div>
  );
};

export default HomePage;