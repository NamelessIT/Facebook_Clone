const baseUrl = process.env.FBCLONE_API_URL || 'http://127.0.0.1:5286/api/v1';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, { token, method = 'GET', body, expected = [200] } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  assert(expected.includes(response.status), `${method} ${path}: expected ${expected.join('/')}, got ${response.status} ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
};

const login = async (email, password) => (await request('/auth/login', {
  method: 'POST', body: { email, password },
})).payload.data.accessToken;

const sellerToken = await login('tester45@fbclone.com', '123456');
const reporterToken = await login('bob@fbclone.com', '123456');
const adminToken = await login('admin@fbclone.com', 'Admin@123');

const terms = (await request('/marketplace/terms', { token: sellerToken })).payload.data;
assert(terms.displayFee === 10000, 'Listing display fee must be 10,000 VND.');

const form = new FormData();
form.set('title', `Smoke marketplace ${Date.now()}`);
form.set('description', 'Sản phẩm kiểm thử tự động cho luồng Marketplace và kiểm duyệt.');
form.set('price', '125000');
form.set('category', 'Điện tử');
form.set('condition', 'Đã qua sử dụng - tốt');
form.set('location', 'Quận 1, TP.HCM');
form.set('acceptTerms', 'true');
form.set('termsVersion', terms.version);
form.set('image', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'smoke.png');

const created = await request('/marketplace', { token: sellerToken, method: 'POST', body: form, expected: [201] });
const listing = created.payload.data;
assert(listing.status === 1, 'New listing must wait for moderation.');

const publicBeforeReview = (await request('/marketplace', { token: reporterToken })).payload.data;
assert(!publicBeforeReview.some((item) => item.id === listing.id), 'Pending listing leaked into public Marketplace.');

await request(`/admin/marketplace/listings/${listing.id}/review`, {
  token: adminToken, method: 'PUT', body: { status: 2, note: 'Approved by smoke test.' },
});
const publicAfterReview = (await request('/marketplace', { token: reporterToken })).payload.data;
assert(publicAfterReview.some((item) => item.id === listing.id), 'Approved listing is missing from public Marketplace.');

await request('/reports', {
  token: reporterToken, method: 'POST', body: {
    targetType: 4, targetId: listing.id, reason: 'Smoke test report', details: 'Checks the shared moderation queue.',
  }, expected: [200],
});
const reports = (await request('/admin/reports', { token: adminToken })).payload.data;
const report = reports.find((item) => item.targetId === listing.id && item.status < 3);
assert(report, 'Marketplace report did not reach the admin moderation queue.');
assert(report.adminPath === `/admin/marketplace?targetId=${listing.id}`, 'Report deep link is incorrect.');

await request(`/admin/reports/${report.id}/review`, { token: adminToken, method: 'PUT' });
await request(`/admin/reports/${report.id}/resolve`, {
  token: adminToken, method: 'POST', body: { action: 5, note: 'Smoke test seller suspension.', dismiss: false },
});

const blockedForm = new FormData();
for (const [key, value] of form.entries()) blockedForm.set(key, value);
blockedForm.set('title', `Blocked smoke ${Date.now()}`);
await request('/marketplace', { token: sellerToken, method: 'POST', body: blockedForm, expected: [423] });

const adminItems = (await request('/admin/marketplace/listings', { token: adminToken })).payload.data;
const moderatedListing = adminItems.find((item) => item.id === listing.id);
assert(moderatedListing?.status === 5, 'Seller suspension must remove approved listings.');

await request(`/admin/marketplace/merchants/${listing.sellerId}/suspension`, {
  token: adminToken, method: 'PUT', body: { suspended: false, reason: 'Smoke test cleanup.' },
});

console.log(JSON.stringify({
  success: true,
  checks: ['terms_fee', 'pending_visibility', 'approval', 'report_queue', 'deep_link', 'seller_suspension', 'listing_removal', 'seller_restore'],
  listingId: listing.id,
  reportId: report.id,
}, null, 2));
