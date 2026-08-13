import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Eye, FileVideo2, Flag, Loader2, MessageCircle, Radio, Save, Send, ShieldAlert, Trash2, UploadCloud, VideoOff } from 'lucide-react';
import toast from '../../shared/appToast';
import liveService from '../../services/liveService';
import { getImageUrl } from '../../utils/formatUrl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LIVE } from '../../shared/generated/constants';
import { ModerationTargetType } from '../../shared/generated/enums';
import ReportDialog from '../moderation/ReportDialog';
import './LiveRoom.css';
import { translateCatalogKey } from '../../shared/localizationRuntime';

const PRIVACY_OPTIONS = [
  { value: '1', labelKey: 'privacy.public' },
  { value: '2', labelKey: 'privacy.friends' },
  { value: '3', labelKey: 'privacy.onlyMe' },
];

const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const LiveRoom = ({ initialSession, open, onOpenChange, onUpdated, onDeleted, moderationMode = false }) => {
  const [session, setSession] = useState(initialSession);
  const [viewerCount, setViewerCount] = useState(initialSession?.viewerCount || 0);
  const [phase, setPhase] = useState(initialSession?.status === 1 ? 'connecting' : 'replay');
  const [postContent, setPostContent] = useState(initialSession?.title || '');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [conversionPrivacy, setConversionPrivacy] = useState(String(initialSession?.privacy || 1));
  const [conversionBusy, setConversionBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedComment, setReportedComment] = useState(null);
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

  useEffect(() => {
    if (!open || !isOwner || session?.status !== 2 || session?.convertedPostId || !session?.recordingExpiresAt) return undefined;
    const delay = new Date(session.recordingExpiresAt).getTime() - Date.now();
    if (delay <= 0) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        await liveService.discard(session.id);
        onDeleted?.(session.id);
        onOpenChangeRef.current(false);
      } catch { /* background cleanup remains authoritative */ }
    }, delay + 750);
    return () => window.clearTimeout(timer);
  }, [isOwner, onDeleted, open, session?.convertedPostId, session?.id, session?.recordingExpiresAt, session?.status]);

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
        toast.apiError(error, "Không thể đồng bộ bình luận live.", { context: "live.comments.load", dedupe: true });
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

  const finishRecorder = useCallback(async () => {
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
          toast.error(translateCatalogKey('ui.components.live.liveroom.chu-phong-a-oi-quyen-rieng-tu-ban-a-.bd8e7c18'));
          onOpenChangeRef.current(false);
        });
        connection.on('LiveEnded', (recordingExpiresAt) => {
          setSession((current) => ({ ...current, status: 2, recordingExpiresAt }));
          setPhase('ended');
          if (!isOwner) toast('Live đã kết thúc.');
          closeMedia();
        });
        connection.on('LiveTerminated', async (reason) => {
          const evidenceBlob = isOwner ? await finishRecorder() : null;
          setSession((current) => ({ ...current, status: 3, endReason: reason }));
          setPhase('terminated');
          closeMedia();
          toast.error(translateCatalogKey('ui.components.live.liveroom.live-bi-dung-boi-kiem-duyet-vien-val.a5f1b1dd', { value0: reason }));
          if (isOwner && evidenceBlob?.size) {
            try {
              setUploadProgress({ percent: 0, loaded: 0, total: evidenceBlob.size, chunkIndex: 0, totalChunks: 1 });
              await liveService.uploadRecording(session.id, evidenceBlob, (event) => {
                if (event.total) setUploadProgress({ ...event, percent: Math.round((event.loaded / event.total) * 100) });
              });
            } catch {
              toast.error(translateCatalogKey('ui.components.live.liveroom.khong-the-tai-u-ban-ghi-phuc-vu-kiem.af7aae49'));
            } finally {
              setUploadProgress(null);
            }
          }
          window.setTimeout(() => onOpenChangeRef.current(false), 500);
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
          toast.apiError(error, isOwner ? "Không thể mở camera/micro hoặc bắt đầu live." : "Không thể tham gia live.", { context: "live.room.connect" });
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
  }, [closeConnection, closeMedia, createPeer, finishRecorder, isOwner, loadComments, mergeComments, open, session?.id, session?.status]);

  const stopBroadcast = async () => {
    try {
      const blob = await finishRecorder();
      const response = await liveService.stop(session.id);
      let updated = response.data.data;
      if (blob?.size) {
        pendingRecordingRef.current = blob;
        setUploadProgress({ percent: 0, loaded: 0, total: blob.size, chunkIndex: 0, totalChunks: 1 });
        updated = (await liveService.uploadRecording(session.id, blob, (event) => {
          if (event.total) setUploadProgress({ ...event, percent: Math.round((event.loaded / event.total) * 100) });
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
      toast.success(translateCatalogKey('ui.components.live.liveroom.a-ket-thuc-live-quyen-ang-replay-het.c35c2b87', { value0: LIVE.replayLifetimeMinutes, value1: LIVE.evidenceRetentionDays }));
    } catch (error) {
      setUploadProgress(null);
      toast.apiError(error, "Live đã đóng nhưng chưa thể lưu bản ghi. Hãy thử tải lại bản ghi.", { context: "live.stop" });
    }
  };

  const retryRecordingUpload = async () => {
    const blob = pendingRecordingRef.current;
    if (!blob?.size) return;
    try {
      setUploadProgress({ percent: 0, loaded: 0, total: blob.size, chunkIndex: 0, totalChunks: 1 });
      const updated = (await liveService.uploadRecording(session.id, blob, (event) => {
        if (event.total) setUploadProgress({ ...event, percent: Math.round((event.loaded / event.total) * 100) });
      })).data.data;
      pendingRecordingRef.current = null;
      setSession(updated);
      onUpdated?.(updated);
      toast.success(translateCatalogKey('ui.components.live.liveroom.a-tai-ban-ghi-live-len-thanh-cong.2d0020d9'));
    } catch (error) { toast.apiError(error, "Chưa thể tải bản ghi live.", { context: "live.recording.retry" }); }
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
        toast.error(translateCatalogKey('ui.components.live.liveroom.live-a-ong-nen-khong-nhan-them-binh-.908f3ee7'));
      } else toast.apiError(error, "Chưa thể gửi bình luận. Hệ thống sẽ tiếp tục đồng bộ danh sách.", { context: "live.comments.send" });
      await loadComments();
    } finally { setCommentSending(false); }
  };

  const changePrivacy = async (value) => {
    try {
      const updated = (await liveService.changePrivacy(session.id, Number(value))).data.data;
      setSession(updated);
      onUpdated?.(updated);
      toast.success(translateCatalogKey('ui.components.live.liveroom.a-thay-oi-quyen-rieng-tu-ngay-trong-.921afdde'));
    } catch (error) { toast.apiError(error, "Không thể đổi quyền riêng tư.", { context: "live.privacy" }); }
  };

  const openConversion = async () => {
    setConversionBusy(true);
    try {
      const updated = (await liveService.prepareConversion(session.id)).data.data;
      setSession(updated);
      setConversionPrivacy(String(updated.privacy));
      setConversionOpen(true);
      onUpdated?.(updated);
    } catch (error) { toast.apiError(error, "Bản live đã hết hạn hoặc không còn sẵn sàng để đăng.", { context: "live.convert.prepare" }); }
    finally { setConversionBusy(false); }
  };

  const discardReplay = async () => {
    setConversionBusy(true);
    try {
      await liveService.discard(session.id);
      setConversionOpen(false);
      onDeleted?.(session.id);
      onOpenChangeRef.current(false);
      toast.success(translateCatalogKey('ui.components.live.liveroom.a-huy-ang-ban-ghi-a-an-khoi-tai-khoa.f96c9517', { value0: LIVE.evidenceRetentionDays }));
    } catch (error) { toast.apiError(error, "Không thể xóa bản ghi live tạm.", { context: "live.discard" }); }
    finally { setConversionBusy(false); }
  };

  const convertToPost = async () => {
    setConversionBusy(true);
    try {
      const response = await liveService.convertToPost(session.id, { content: postContent, privacy: Number(conversionPrivacy) });
      setSession(response.data.data.live);
      onUpdated?.(response.data.data.live);
      setConversionOpen(false);
      toast.success(translateCatalogKey('ui.components.live.liveroom.a-chuyen-ban-ghi-live-thanh-bai-viet.b5a234de'));
    } catch (error) { toast.apiError(error, "Không thể chuyển live thành bài viết.", { context: "live.convert" }); }
    finally { setConversionBusy(false); }
  };

  const replayUrl = session?.recordingUrl ? getImageUrl(session.recordingUrl) : null;
  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="live-room-dialog" onInteractOutside={(event) => isOwner && session?.status === 1 && event.preventDefault()}>
        <main className="live-room-main">
          <div className="live-room-stage">
            {session?.status === 1 ? (
              <video ref={isOwner ? localVideoRef : remoteVideoRef} autoPlay playsInline muted={isOwner} />
            ) : replayUrl ? (
              <video src={replayUrl} controls playsInline />
            ) : (
              <div className="live-room-placeholder"><VideoOff /><span>{translateCatalogKey('ui.components.live.liveroom.khong-co-ban-phat-lai.fa9788d4')}</span></div>
            )}
            {session?.status === 1 && <Badge variant="destructive" className="live-room-status"><Radio /> {"LIVE"}</Badge>}
            <span className="live-room-viewers"><Eye size={15} /> {viewerCount}</span>
            {uploadProgress !== null && <div className="live-upload-progress"><UploadCloud /><strong>{translateCatalogKey('ui.components.live.liveroom.ang-tai-ban-ghi.fcbe1918')} {uploadProgress.percent}%</strong><small>{Math.round(uploadProgress.loaded / 1024 / 1024)} / {Math.max(1, Math.ceil(uploadProgress.total / 1024 / 1024))} {"MB · chunk"} {Math.min(uploadProgress.chunkIndex + 1, uploadProgress.totalChunks)}/{uploadProgress.totalChunks}</small><span style={{ width: `${uploadProgress.percent}%` }} /></div>}
          </div>
          <div className="live-room-details">
            <DialogHeader>
              <DialogTitle>{session?.title}</DialogTitle>
              <DialogDescription>{session?.ownerName} · {phase === "connecting" ? "Đang kết nối camera và máy chủ…" : phase === "waiting" ? "Đang chờ luồng hình…" : phase === "broadcasting" ? "Đang phát trực tiếp" : phase === "watching" ? "Đang xem trực tiếp" : session?.status === 3 ? session.endReason : "Bản phát lại"}</DialogDescription>
            </DialogHeader>
            {isOwner && session?.status === 1 && (
              <div className="live-room-controls">
                <Select value={String(session.privacy)} onValueChange={changePrivacy}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIVACY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{translateCatalogKey(option.labelKey)}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="destructive" onClick={stopBroadcast}><VideoOff /> {translateCatalogKey('ui.components.live.liveroom.ket-thuc-live.9f2c3f0f')}</Button>
              </div>
            )}
            {isOwner && session?.status === 2 && session.recordingUrl && !session.convertedPostId && (
              <div className="live-replay-actions">
                <p><Clock3 size={16} /> {translateCatalogKey('ui.components.live.liveroom.ban-phat-lai-tu-xoa-luc.a8124f9b')} {new Date(session.recordingExpiresAt).toLocaleTimeString('vi-VN')}.</p>
                <Button onClick={openConversion} disabled={conversionBusy}><Save /> {translateCatalogKey('ui.components.live.liveroom.ang-ban-live-thanh-video-post.f0e2fcdf')}</Button>
              </div>
            )}
            {isOwner && session?.status === 2 && !session.recordingUrl && pendingRecordingRef.current && (
              <Button variant="outline" onClick={retryRecordingUpload} disabled={uploadProgress !== null}><UploadCloud /> {translateCatalogKey('ui.components.live.liveroom.tai-lai-ban-ghi.9c262c1c')}</Button>
            )}
            {moderationMode && <div className="live-moderation-note"><ShieldAlert size={16} /> {translateCatalogKey('ui.components.live.liveroom.kiem-duyet-vien-ang-xem-voi-quyen-bo.50cffabd')}</div>}
            <DialogFooter>
              {!isOwner && !moderationMode && <Button variant="ghost" onClick={() => setReportOpen(true)}><Flag /> {translateCatalogKey('ui.components.live.liveroom.bao-cao-live.6a418503')}</Button>}
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isOwner && session?.status === 1}>{translateCatalogKey('common.close')}</Button>
            </DialogFooter>
          </div>
        </main>
        <aside className="live-comments-panel">
          <header><div><MessageCircle /><strong>{translateCatalogKey('ui.components.live.liveroom.binh-luan-truc-tiep.315bb5df')}</strong></div><span>{comments.length}</span></header>
          <div className="live-comments-list">
            {comments.map((comment) => (
              <article className="live-comment" key={comment.id}>
                <div className="live-comment-avatar">{comment.author?.avatarUrl ? <img src={getImageUrl(comment.author.avatarUrl)} alt="" /> : comment.author?.fullName?.charAt(0)}</div>
                <div><div><strong>{comment.author?.fullName}</strong><time>{new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>{!moderationMode && <button type="button" className="live-comment-report" onClick={() => setReportedComment(comment)} title="Báo cáo bình luận"><Flag size={13} /></button>}</div><p>{comment.content}</p></div>
              </article>
            ))}
            {!comments.length && <div className="live-comments-empty"><MessageCircle /><p>{translateCatalogKey('ui.components.live.liveroom.chua-co-binh-luan-hay-bat-au-cuoc-tr.198924cb')}</p></div>}
            <div ref={commentsEndRef} />
          </div>
          {session?.status === 1 ? (
            <form className="live-comment-form" onSubmit={sendComment}>
              <Input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={LIVE.commentMaxLength} placeholder={translateCatalogKey('ui.components.live.liveroom.viet-binh-luan.bdb5efe2')} aria-label={translateCatalogKey('ui.components.live.liveroom.binh-luan-live.deec6931')} />
              <Button size="icon" type="submit" disabled={!commentText.trim() || commentSending} aria-label={translateCatalogKey('ui.components.live.liveroom.gui-binh-luan.305f446f')}>{commentSending ? <Loader2 className="live-spin" /> : <Send />}</Button>
            </form>
          ) : <div className="live-comments-closed"><VideoOff /> {translateCatalogKey('ui.components.live.liveroom.live-a-ong-binh-luan-moi-a-uoc-ngat.1fd05df1')}</div>}
        </aside>
      </DialogContent>
    </Dialog>
    <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType={ModerationTargetType.Live} targetId={session?.id} targetLabel="buổi live này" />
    <ReportDialog open={Boolean(reportedComment)} onOpenChange={(value) => !value && setReportedComment(null)} targetType={ModerationTargetType.LiveComment} targetId={reportedComment?.id} targetLabel="bình luận live này" />
    <Dialog open={conversionOpen} onOpenChange={(value) => value ? setConversionOpen(true) : discardReplay()}>
      <DialogContent className="live-conversion-dialog" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>{translateCatalogKey('ui.components.live.liveroom.ang-ban-live-thanh-video.6052d74c')}</DialogTitle><DialogDescription>{translateCatalogKey('ui.components.live.liveroom.ban-tam-uoc-gia-han-them.89ad5e9c')} {LIVE.replayLifetimeMinutes} {translateCatalogKey('ui.components.live.liveroom.phut-trong-luc-ban-hoan-thien-bai-vi.27e998e4')}</DialogDescription></DialogHeader>
        <div className="live-conversion-preview"><FileVideo2 /><div><strong>{session?.title}</strong><span>{translateCatalogKey('ui.components.live.liveroom.video-live-a-upload-an-toan-theo-tun.7a3eef0f')}</span></div></div>
        <label className="live-conversion-field"><span>{translateCatalogKey('ui.components.live.liveroom.noi-dung-bai-viet.ed49ab20')}</span><Input value={postContent} onChange={(event) => setPostContent(event.target.value)} maxLength={500} placeholder={translateCatalogKey('ui.components.live.liveroom.ban-muon-noi-gi-ve-video-nay.67722e78')} /></label>
        <label className="live-conversion-field"><span>{translateCatalogKey('ui.components.live.liveroom.oi-tuong-xem-bai-viet.63a9c29f')}</span><Select value={conversionPrivacy} onValueChange={setConversionPrivacy}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PRIVACY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{translateCatalogKey(option.labelKey)}</SelectItem>)}</SelectContent></Select></label>
        {uploadProgress !== null && <Progress value={uploadProgress.percent} />}
        <DialogFooter className="live-conversion-actions"><Button variant="destructive" onClick={discardReplay} disabled={conversionBusy}><Trash2 /> {translateCatalogKey('ui.components.live.liveroom.huy-va-xoa-video.c4b87453')}</Button><Button onClick={convertToPost} disabled={conversionBusy}>{conversionBusy ? <Loader2 className="live-spin" /> : <Save />} {translateCatalogKey('ui.components.live.liveroom.ang-bai-viet.3559d657')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default LiveRoom;
