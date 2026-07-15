import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import PostItem from "../../components/post/PostItem";
import postService from "../../services/postService";
import "./PostDetailPage.css";

const PostDetailPage = () => {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPost = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await postService.getById(postId);
        if (!cancelled) {
          setPost(res.data?.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.message || "Không thể tải bài viết";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPost();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div className="post-detail-page">
      <div className="post-detail-shell">
        <div className="post-detail-header">
          <Link to="/" className="post-detail-back" title="Quay lại">
            <ArrowLeft size={20} />
          </Link>
          <h1>Bài viết</h1>
        </div>

        {loading && <div className="post-detail-status">Đang tải...</div>}

        {!loading && error && (
          <div className="post-detail-status post-detail-status--error">
            {error}
          </div>
        )}

        {!loading && post && (
          <PostItem
            post={post}
            onPostUpdated={() => window.location.reload()}
          />
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;
