import { useState, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import Avatar from "../common/Avatar";
import postService from "../../services/postService";
import { useAuth } from "../../contexts/AuthContext";
import toast from '../../shared/appToast';
import { useLocalization } from "../../contexts/useLocalization";
import "./CommentSection.css";

const formatTimeAgo = (dateStr, locale) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: locale === 'vi' ? vi : enUS });
  } catch {
    return "";
  }
};

const CommentItem = ({ comment, onReply }) => {
  const { locale, t } = useLocalization();
  return (
    <div className="comment-item">
      <Avatar src={comment.author?.avatarUrl} className="w-8 h-8" />
      <div>
        <div className="comment-bubble">
          <p className="comment-author">{comment.author?.fullName}</p>
          <p className="comment-text">{comment.content}</p>
        </div>
        <div className="comment-meta">
          <button className="comment-meta-btn" onClick={() => onReply(comment)}>
            {t('comment.reply')}
          </button>
          <span className="comment-meta-time">{formatTimeAgo(comment.createdAt, locale)}</span>
        </div>
      </div>
    </div>
  );
};

const ReplyItem = ({ reply }) => {
  const { locale } = useLocalization();
  return (
    <div className="comment-item comment-item--reply">
      <Avatar src={reply.author?.avatarUrl} className="w-7 h-7" />
      <div>
        <div className="comment-bubble">
          <p className="comment-author">{reply.author?.fullName}</p>
          <p className="comment-text">{reply.content}</p>
        </div>
        <div className="comment-meta">
          <span className="comment-meta-time">{formatTimeAgo(reply.createdAt, locale)}</span>
        </div>
      </div>
    </div>
  );
};

const CommentSection = ({ postId, onCommentAdded }) => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  const [expandedReplies, setExpandedReplies] = useState(new Set());

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await postService.getComments(postId, pageNum, 10);
      const data = res.data?.data || [];
      if (append) {
        setComments((prev) => [...prev, ...data]);
      } else {
        setComments(data);
      }
      setHasMore(data.length >= 10);
      setPage(pageNum);
    } catch (error) {
      if (!append) setComments([]);
      toast.apiError(error, t('comment.loadFailed'), { context: 'comments.load' });
    } finally {
      setLoading(false);
    }
  }, [postId, t]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await postService.createComment(postId, { content: newComment.trim() });
      setNewComment("");
      fetchComments(1);
      onCommentAdded?.();
    } catch (error) {
      toast.apiError(error, t('comment.createFailed'), { context: 'comments.create' });
    } finally {
      setPosting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;
    setReplyPosting(true);
    try {
      await postService.createComment(postId, {
        content: replyContent.trim(),
        parentCommentId: replyingTo.id,
      });
      setReplyContent("");
      setReplyingTo(null);
      fetchComments(1);
      onCommentAdded?.();
    } catch (error) {
      toast.apiError(error, t('comment.replyFailed'), { context: 'comments.reply' });
    } finally {
      setReplyPosting(false);
    }
  };

  const handleKeyDown = (e, submitFn) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitFn();
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
    setReplyContent("");
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const parentComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (commentId) => comments.filter((c) => c.parentCommentId === commentId);

  return (
    <div className="comment-section">
      {/* Input tạo comment mới */}
      <div className="comment-input-wrapper">
        <Avatar src={user?.avatarUrl} className="w-8 h-8" />
        <textarea
          placeholder={t('post.writeComment')}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleSubmitComment)}
          rows={1}
        />
        <button
          className="comment-send-btn"
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || posting}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Danh sách comments */}
      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="comment-loading">{t('comment.loading')}</div>
        ) : parentComments.length === 0 ? (
          <div className="comment-empty">{t('comment.empty')}</div>
        ) : (
          parentComments.map((comment) => {
            const replies = getReplies(comment.id);
            const isExpanded = expandedReplies.has(comment.id);

            return (
              <div key={comment.id}>
                <CommentItem comment={comment} onReply={handleReply} />

                {/* Nút xem replies */}
                {replies.length > 0 && !isExpanded && (
                  <button className="view-replies-btn" onClick={() => toggleReplies(comment.id)}>
                    {t('comment.viewReplies', undefined, { count: replies.length })}
                  </button>
                )}

                {/* Danh sách reply */}
                {isExpanded &&
                  replies.map((reply) => <ReplyItem key={reply.id} reply={reply} />)}

                {isExpanded && replies.length > 0 && (
                  <button className="view-replies-btn" onClick={() => toggleReplies(comment.id)}>
                    {t('comment.hideReplies')}
                  </button>
                )}

                {/* Reply input */}
                {replyingTo?.id === comment.id && (
                  <div className="reply-input-wrapper">
                    <Avatar src={user?.avatarUrl} className="w-7 h-7" />
                    <textarea
                      placeholder={t('comment.replyTo', undefined, { name: comment.author?.fullName || '' })}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleSubmitReply)}
                      rows={1}
                      autoFocus
                    />
                    <button
                      className="reply-send-btn"
                      onClick={handleSubmitReply}
                      disabled={!replyContent.trim() || replyPosting}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="comment-load-more">
          <button
            className="comment-load-more-btn"
            onClick={() => fetchComments(page + 1, true)}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('comment.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
