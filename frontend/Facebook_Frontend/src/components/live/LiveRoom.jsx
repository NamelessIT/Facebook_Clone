import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Eye, Loader2, MessageCircle, Radio, Save, Send, ShieldAlert, UploadCloud, VideoOff } from 'lucide-react';
import toast from '../../shared/appToast';
import liveService from '../../services/liveService';
import { getImageUrl } from '../../utils/formatUrl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LIVE } from '../../shared/generated/constants';
import './LiveRoom.css';

const PRIVACY_OPTIONS = [
  { value: '1', label: 'Công khai' },
  { value: '2', label: 'Bạn bè' },
  { value: '3', label: 'Chỉ mình tôi' },
];

const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const LiveRoom = ({ initialSession, open, onOpenChange, onUpdated, moderationMode = false }) => {
  const [session, setSession] = useState(initialSession);
  const [viewerCount, setViewerCount] = useState(initialSession?.viewerCount || 0);
  const [phase, setPhase] = useState(initialSession?.status === 1 ? 'connecting' : 'replay');
  const [postContent, setPostContent] = useState(initialSession?.title || '');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const intentionalCloseRef = useRef(false);
  const onUpdatedRef = useRef(onUpdated);
  const onOpenChangeRef = useRef(onOpenChange);
  const pendingRecordingRef = useRef(null);
  const commentsEndRef = useRef(null);
  const isOwner = Boolean(session?.isOwner) && !moderationMode;

  useEffect(() => { onUpdatedRef.current = onUpdated; }, [onUpdated]);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const mergeComments = useCallback((incoming) => {
    const rows = Array.isArray(incoming) ? incoming : [incoming];
    setComments((current) => {
      const merged = new Map(current.map((comment) => [comment.id, comment]));
      rows.filter(Boolean).forEach((comment) => merged.set(comment.id, comment));
      return [...merged.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  }, []);

  const loadComments = useCallback(async () => {
    if (!open || !session?.id) return;
    try {
      const response = await liveService.getComments(session.id, LIVE.commentsPageSize);
      mergeComments(response.data.data || []);
    } catch (error) {
      if (error?.response?.status !== 403 && error?.response?.status !== 410)
        toast.apiError(error, 'Không thể đồng bộ bình luận live.', { context: 'live.comments.load', dedupe: true });
    }
  }, [mergeComments, open, session?.id]);

  useEffect(() => {
    setComments([]);
    loadComments();
    if (session?.status !== 1) return undefined;
    const timer = window.setInterval(loadComments, LIVE.commentsPollIntervalMs);
    return () => window.clearInterval(timer);
  }, [loadComments, session?.id, session?.status]);

  useEffect(() => { commentsEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [comments]);

  const closeMedia = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const closeConnection = useCallback(async () => {
    const connection = connectionRef.current;
    connectionRef.current = null;
    if (!connection) return;
    try { await connection.invoke('LeaveSession'); } catch { /* connection may already be gone */ }
    try { await connection.stop(); } catch { /* no-op */ }
  }, []);

  const createPeer = useCallback((targetConnectionId) => {
    const existing = peersRef.current.get(targetConnectionId);
    if (existing) return existing;
    const peer = new RTCPeerConnection(rtcConfig);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) connectionRef.current?.invoke('SendIceCandidate', targetConnectionId, candidate).catch(() => {});
    };
    peer.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) remoteVideoRef.current.srcObject = streams[0];
      setPhase('watching');
    };
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        peer.close();
        peersRef.current.delete(targetConnectionId);
      }
    };
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    peersRef.current.set(targetConnectionId, peer);
    return peer;
  }, []);

  useEffect(() => {
    if (!open || !session?.id || session.status !== 1) return undefined;
    let cancelled = false;
    intentionalCloseRef.current = false;

    const connect = async () => {
      try {
        if (isOwner) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          if (typeof MediaRecorder !== 'undefined') {
            recordedChunksRef.current = [];
            const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
              ? { mimeType: 'video/webm;codecs=vp8,opus' } : undefined);
            recorder.ondataavailable = (event) => { if (event.data.size) recordedChunksRef.current.push(event.data); };
            recorder.start(1000);
            recorderRef.current = recorder;
          }
        }

        const connection = liveService.createConnection();
        connectionRef.current = connection;
        connection.on('ViewerCountChanged', setViewerCount);
        connection.on('LiveCommentAdded', mergeComments);
        connection.on('ViewerJoined', async (connectionId) => {
          if (!isOwner) return;
          const peer = createPeer(connectionId);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await connection.invoke('SendOffer', connectionId, offer);
        });
        connection.on('ReceiveOffer', async (connectionId, offer) => {
          const peer = createPeer(connectionId);
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await connection.invoke('SendAnswer', connectionId, answer);
        });
        connection.on('ReceiveAnswer', async (connectionId, answer) => {
          await peersRef.current.get(connectionId)?.setRemoteDescription(new RTCSessionDescription(answer));
        });
        connection.on('ReceiveIceCandidate', async (connectionId, candidate) => {
          const peer = createPeer(connectionId);
          try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* candidate can race SDP */ }
        });
        connection.on('LivePrivacyChanged', (privacy) => {
          setSession((current) => ({ ...current, privacy }));
        });
        connection.on('LiveAccessRevoked', () => {
          closeMedia();
          toast.error('Chủ phòng đã đổi quyền riêng tư. Bạn đã rời khỏi live.');
          onOpenChangeRef.current(false);
        });
        connection.on('LiveEnded', (recordingExpiresAt) => {
          setSession((current) => ({ ...current, status: 2, recordingExpiresAt }));
          setPhase('ended');
          if (!isOwner) toast('Live đã kết thúc.');
          closeMedia();
        });
        connection.on('LiveTerminated', (reason) => {
          setSession((current) => ({ ...current, status: 3, endReason: reason }));
          setPhase('terminated');
          closeMedia();
          toast.error(`Live bị dừng bởi kiểm duyệt viên: ${reason}`);
          window.setTimeout(() => onOpenChangeRef.current(false), 1200);
        });
        connection.onreconnected(async () => {
          try {
            await connection.invoke('JoinSession', session.id, isOwner);
            await loadComments();
          } catch { onOpenChangeRef.current(false); }
        });
        await connection.start();
        await connection.invoke('JoinSession', session.id, isOwner);
        setPhase(isOwner ? 'broadcasting' : 'waiting');
      } catch (error) {
        if (!cancelled) {
          if (isOwner) {
            try {
              const stopped = (await liveService.stop(session.id)).data.data;
              onUpdatedRef.current?.(stopped);
            } catch { /* best effort rollback avoids an orphan live */ }
          }
          toast.apiError(error, isOwner ? 'Không thể mở camera/micro hoặc bắt đầu live.' : 'Không thể tham gia live.', { context: 'live.room.connect' });
          onOpenChangeRef.current(false);
        }
      }
    };
    connect();
    return () => {
      cancelled = true;
      if (!intentionalCloseRef.current) {
        closeMedia();
        closeConnection();
      }
    };
  }, [closeConnection, closeMedia, createPeer, isOwner, loadComments, mergeComments, open, session?.id, session?.status]);

  const finishRecorder = async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return null;
    const createBlob = () => recordedChunksRef.current.length
      ? new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      : null;
    if (recorder.state === 'inactive') {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      return createBlob();
    }
    return await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.setTimeout(() => resolve(createBlob()), 0);
      };
      recorder.addEventListener('stop', finish, { once: true });
      try { recorder.requestData(); } catch { /* recorder can become inactive between checks */ }
      recorder.stop();
      window.setTimeout(finish, 2000);
    });
  };

  const stopBroadcast = async () => {
    try {
      const blob = await finishRecorder();
      const response = await liveService.stop(session.id);
      let updated = response.data.data;
      if (blob?.size) {
        pendingRecordingRef.current = blob;
        setUploadProgress(0);
        updated = (await liveService.uploadRecording(session.id, blob, (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        })).data.data;
        pendingRecordingRef.current = null;
      }
      intentionalCloseRef.current = true;
      closeMedia();
      await closeConnection();
      setUploadProgress(null);
      setSession(updated);
      setPhase('replay');
      onUpdated?.(updated);
      toast.success(`Đã kết thúc live. Bản phát lại sẽ tự xóa sau ${LIVE.replayLifetimeMinutes} phút.`);
    } catch (error) {
      setUploadProgress(null);
      toast.apiError(error, 'Live đã đóng nhưng chưa thể lưu bản ghi. Hãy thử tải lại bản ghi.', { context: 'live.stop' });
    }
  };

  const retryRecordingUpload = async () => {
    const blob = pendingRecordingRef.current;
    if (!blob?.size) return;
    try {
      setUploadProgress(0);
      const updated = (await liveService.uploadRecording(session.id, blob, (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      })).data.data;
      pendingRecordingRef.current = null;
      setSession(updated);
      onUpdated?.(updated);
      toast.success('Đã tải bản ghi live lên thành công.');
    } catch (error) { toast.apiError(error, 'Chưa thể tải bản ghi live.', { context: 'live.recording.retry' }); }
    finally { setUploadProgress(null); }
  };

  const sendComment = async (event) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || commentSending || session?.status !== 1) return;
    setCommentSending(true);
    try {
      const response = await liveService.addComment(session.id, { clientRequestId: crypto.randomUUID(), content });
      mergeComments(response.data.data);
      setCommentText('');
    } catch (error) {
      if (error?.response?.status === 409) {
        setSession((current) => ({ ...current, status: 2 }));
        toast.error('Live đã đóng nên không nhận thêm bình luận.');
      } else toast.apiError(error, 'Chưa thể gửi bình luận. Hệ thống sẽ tiếp tục đồng bộ danh sách.', { context: 'live.comments.send' });
      await loadComments();
    } finally { setCommentSending(false); }
  };

  const changePrivacy = async (value) => {
    try {
      const updated = (await liveService.changePrivacy(session.id, Number(value))).data.data;
      setSession(updated);
      onUpdated?.(updated);
      toast.success('Đã thay đổi quyền riêng tư ngay trong lúc live.');
    } catch (error) { toast.apiError(error, 'Không thể đổi quyền riêng tư.', { context: 'live.privacy' }); }
  };

  const convertToPost = async () => {
    try {
      const response = await liveService.convertToPost(session.id, { content: postContent, privacy: session.privacy });
      setSession(response.data.data.live);
      onUpdated?.(response.data.data.live);
      toast.success('Đã chuyển bản ghi live thành bài viết video.');
    } catch (error) { toast.apiError(error, 'Không thể chuyển live thành bài viết.', { context: 'live.convert' }); }
  };

  const replayUrl = session?.recordingUrl ? getImageUrl(session.recordingUrl) : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="live-room-dialog" onInteractOutside={(event) => isOwner && session?.status === 1 && event.preventDefault()}>
        <main className="live-room-main">
          <div className="live-room-stage">
            {session?.status === 1 ? (
              <video ref={isOwner ? localVideoRef : remoteVideoRef} autoPlay playsInline muted={isOwner} />
            ) : replayUrl ? (
              <video src={replayUrl} controls playsInline />
            ) : (
              <div className="live-room-placeholder"><VideoOff /><span>Không có bản phát lại</span></div>
            )}
            {session?.status === 1 && <Badge variant="destructive" className="live-room-status"><Radio /> LIVE</Badge>}
            <span className="live-room-viewers"><Eye size={15} /> {viewerCount}</span>
            {uploadProgress !== null && <div className="live-upload-progress"><UploadCloud /><strong>Đang tải bản ghi {uploadProgress}%</strong><span style={{ width: `${uploadProgress}%` }} /></div>}
          </div>
          <div className="live-room-details">
            <DialogHeader>
              <DialogTitle>{session?.title}</DialogTitle>
              <DialogDescription>{session?.ownerName} · {phase === 'connecting' ? 'Đang kết nối camera và máy chủ…' : phase === 'waiting' ? 'Đang chờ luồng hình…' : phase === 'broadcasting' ? 'Đang phát trực tiếp' : phase === 'watching' ? 'Đang xem trực tiếp' : session?.status === 3 ? session.endReason : 'Bản phát lại'}</DialogDescription>
            </DialogHeader>
            {isOwner && session?.status === 1 && (
              <div className="live-room-controls">
                <Select value={String(session.privacy)} onValueChange={changePrivacy}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIVACY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="destructive" onClick={stopBroadcast}><VideoOff /> Kết thúc live</Button>
              </div>
            )}
            {isOwner && session?.status === 2 && session.recordingUrl && !session.convertedPostId && (
              <div className="live-replay-actions">
                <p><Clock3 size={16} /> Bản phát lại tự xóa lúc {new Date(session.recordingExpiresAt).toLocaleTimeString('vi-VN')}.</p>
                <Input value={postContent} onChange={(event) => setPostContent(event.target.value)} placeholder="Nội dung bài viết" />
                <Button onClick={convertToPost}><Save /> Đăng bản live thành video post</Button>
              </div>
            )}
            {isOwner && session?.status === 2 && !session.recordingUrl && pendingRecordingRef.current && (
              <Button variant="outline" onClick={retryRecordingUpload} disabled={uploadProgress !== null}><UploadCloud /> Tải lại bản ghi</Button>
            )}
            {moderationMode && <div className="live-moderation-note"><ShieldAlert size={16} /> Kiểm duyệt viên đang xem với quyền bỏ qua chế độ riêng tư.</div>}
            <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={isOwner && session?.status === 1}>Đóng</Button></DialogFooter>
          </div>
        </main>
        <aside className="live-comments-panel">
          <header><div><MessageCircle /><strong>Bình luận trực tiếp</strong></div><span>{comments.length}</span></header>
          <div className="live-comments-list">
            {comments.map((comment) => (
              <article className="live-comment" key={comment.id}>
                <div className="live-comment-avatar">{comment.author?.avatarUrl ? <img src={getImageUrl(comment.author.avatarUrl)} alt="" /> : comment.author?.fullName?.charAt(0)}</div>
                <div><div><strong>{comment.author?.fullName}</strong><time>{new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{comment.content}</p></div>
              </article>
            ))}
            {!comments.length && <div className="live-comments-empty"><MessageCircle /><p>Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.</p></div>}
            <div ref={commentsEndRef} />
          </div>
          {session?.status === 1 ? (
            <form className="live-comment-form" onSubmit={sendComment}>
              <Input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={LIVE.commentMaxLength} placeholder="Viết bình luận…" aria-label="Bình luận live" />
              <Button size="icon" type="submit" disabled={!commentText.trim() || commentSending} aria-label="Gửi bình luận">{commentSending ? <Loader2 className="live-spin" /> : <Send />}</Button>
            </form>
          ) : <div className="live-comments-closed"><VideoOff /> Live đã đóng, bình luận mới đã được ngắt.</div>}
        </aside>
      </DialogContent>
    </Dialog>
  );
};

export default LiveRoom;
