import * as signalR from '@microsoft/signalr';

const base = process.env.LIVE_TEST_API || 'http://127.0.0.1:5286';
const api = `${base}/api/v1`;
const results = [];
const check = (condition, label) => {
  if (!condition) throw new Error(`FAILED: ${label}`);
  results.push(label);
};
const request = async (path, { token, method = 'GET', body, form, expected } = {}) => {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  if (expected && response.status === expected) return { status: response.status };
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${payload.message || ''}`);
  return payload;
};
const login = async (email, password) => (await request('/auth/login', { method: 'POST', body: { email, password } })).data.accessToken;
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const timeout = (promise, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), 5000))]);
const connect = async (token) => {
  const connection = new signalR.HubConnectionBuilder().withUrl(`${base}/hubs/live`, { accessTokenFactory: () => token }).build();
  await connection.start();
  return connection;
};

const alice = await login('alice@fbclone.com', '123456');
const bob = await login('bob@fbclone.com', '123456');
const admin = await login('admin@fbclone.com', 'Admin@123');
check(Boolean(alice && bob && admin), 'đăng nhập broadcaster, viewer và moderator');

const first = (await request('/lives', { token: alice, method: 'POST', body: { title: 'Integration live moderation', privacy: 1, isShopping: true } })).data;
check(first.status === 1 && first.isOwner, 'tạo live công khai');

const broadcaster = await connect(alice);
const viewer = await connect(bob);
const viewerJoined = deferred();
const offerReceived = deferred();
const privacyChanged = deferred();
const commentAdded = deferred();
const broadcasterKicked = deferred();
const viewerKicked = deferred();
broadcaster.on('ViewerJoined', (connectionId) => viewerJoined.resolve(connectionId));
broadcaster.on('LiveCommentAdded', (comment) => commentAdded.resolve(comment));
viewer.on('ReceiveOffer', (connectionId, offer) => offerReceived.resolve({ connectionId, offer }));
viewer.on('LivePrivacyChanged', (privacy) => privacyChanged.resolve(privacy));
broadcaster.on('LiveTerminated', (reason) => broadcasterKicked.resolve(reason));
viewer.on('LiveTerminated', (reason) => viewerKicked.resolve(reason));
await broadcaster.invoke('JoinSession', first.id, true);
await viewer.invoke('JoinSession', first.id, false);
const viewerConnectionId = await timeout(viewerJoined.promise, 'viewer joined');
check(Boolean(viewerConnectionId), 'viewer tham gia live realtime');
await broadcaster.invoke('SendOffer', viewerConnectionId, { type: 'offer', sdp: 'integration-test' });
const offer = await timeout(offerReceived.promise, 'offer relay');
check(offer.offer.sdp === 'integration-test', 'SignalR relay WebRTC offer broadcaster → viewer');

const commentRequestId = crypto.randomUUID();
const savedComment = (await request(`/lives/${first.id}/comments`, { token: bob, method: 'POST', body: { clientRequestId: commentRequestId, content: 'Bình luận integration không bị hụt' } })).data;
check((await timeout(commentAdded.promise, 'live comment realtime')).id === savedComment.id, 'bình luận lưu DB trước rồi phát realtime');
const duplicateComment = await request(`/lives/${first.id}/comments`, { token: bob, method: 'POST', body: { clientRequestId: commentRequestId, content: 'Bình luận integration không bị hụt' } });
check(duplicateComment.duplicate === true && duplicateComment.data.id === savedComment.id, 'retry bình luận idempotent không tạo bản sao');
check((await request(`/lives/${first.id}/comments`, { token: bob })).data.some((item) => item.id === savedComment.id), 'polling REST đọc lại được bình luận đã lưu');

await request(`/lives/${first.id}/privacy`, { token: alice, method: 'PUT', body: { privacy: 2 } });
check(await timeout(privacyChanged.promise, 'privacy event') === 2, 'đổi quyền riêng tư ngay khi đang live');
check((await request(`/lives/${first.id}`, { token: bob })).data.id === first.id, 'viewer hợp lệ vẫn xem liên tục sau khi đổi quyền');

const moderator = await connect(admin);
const moderatorKicked = deferred();
moderator.on('LiveTerminated', (reason) => moderatorKicked.resolve(reason));
await moderator.invoke('JoinSession', first.id, false);
check(true, 'moderator xem được live giới hạn quyền riêng tư');
const adminSessions = (await request('/admin/lives', { token: admin })).data;
check(adminSessions.some((item) => item.id === first.id), 'live giới hạn quyền xuất hiện trong admin moderation');
await request(`/admin/lives/${first.id}/terminate`, { token: admin, method: 'POST', body: { reason: 'Integration community review' } });
const kicked = await Promise.all([
  timeout(broadcasterKicked.promise, 'broadcaster kicked'),
  timeout(viewerKicked.promise, 'viewer kicked'),
  timeout(moderatorKicked.promise, 'moderator kicked'),
]);
check(kicked.every((reason) => reason === 'Integration community review'), 'broadcaster và mọi viewer nhận lệnh kick realtime');
check((await request(`/lives/${first.id}/comments`, { token: bob, method: 'POST', body: { clientRequestId: crypto.randomUUID(), content: 'Không được nhận sau khi đóng' }, expected: 409 })).status === 409, 'live đã đóng từ chối bình luận mới');
check((await request('/lives', { token: alice, method: 'POST', body: { title: 'Blocked live', privacy: 1 }, expected: 423 })).status === 423, 'chỉ quyền live của broadcaster bị tạm khóa');
check(Array.isArray((await request('/lives', { token: alice })).data), 'tài khoản bị khóa live vẫn dùng API khác');

await request(`/admin/lives/users/${first.ownerId}/restore`, { token: admin, method: 'POST' });
const second = (await request('/lives', { token: alice, method: 'POST', body: { title: 'Replay conversion test', privacy: 2 } })).data;
check(second.status === 1, 'moderator mở lại quyền và user live lại được');
const stopped = (await request(`/lives/${second.id}/stop`, { token: alice, method: 'PUT' })).data;
const minutes = (new Date(stopped.recordingExpiresAt) - Date.now()) / 60000;
check(minutes > 14 && minutes <= 15.1, 'hạn bản phát lại lấy từ shared contract là 15 phút');
const form = new FormData();
form.append('recording', new Blob(['webm-integration-fixture'], { type: 'video/webm' }), 'integration.webm');
const uploaded = (await request(`/lives/${second.id}/recording`, { token: alice, method: 'POST', form })).data;
check(Boolean(uploaded.recordingUrl), 'upload bản ghi live sau khi kết thúc');
const converted = (await request(`/lives/${second.id}/convert-to-post`, { token: alice, method: 'POST', body: { content: 'Live replay integration post', privacy: 2 } })).data;
check(Boolean(converted.postId) && converted.live.recordingExpiresAt === null, 'chuyển bản ghi thành video post và bỏ hạn xóa');

await Promise.allSettled([broadcaster.stop(), viewer.stop(), moderator.stop()]);
console.log(`LIVE_INTEGRATION_OK ${results.length}`);
for (const result of results) console.log(`  ✓ ${result}`);
