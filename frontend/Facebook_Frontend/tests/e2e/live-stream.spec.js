import { test, expect } from '@playwright/test';
import { login, USERS } from './helpers';

test('broadcasts fake camera media to a second user and saves a replay', async ({ browser, baseURL }) => {
  const broadcasterContext = await browser.newContext({ baseURL });
  const viewerContext = await browser.newContext({ baseURL });
  await broadcasterContext.grantPermissions(['camera', 'microphone'], { origin: baseURL });
  const broadcaster = await broadcasterContext.newPage();
  const viewer = await viewerContext.newPage();
  const title = `E2E live ${Date.now()}`;

  try {
    await login(broadcaster, USERS.alice);
    await broadcaster.goto('/live');
    await broadcaster.getByRole('button', { name: 'Phát trực tiếp' }).click();
    await broadcaster.getByPlaceholder('Tiêu đề livestream').fill(title);
    await broadcaster.getByRole('button', { name: 'Bắt đầu phát' }).click();
    await expect(broadcaster.getByText('Đang phát trực tiếp')).toBeVisible();
    const dialogBox = await broadcaster.locator('.live-room-dialog').boundingBox();
    const navBox = await broadcaster.locator('.navbar').boundingBox();
    expect(dialogBox.y).toBeGreaterThanOrEqual(navBox.y + navBox.height);
    expect(dialogBox.height).toBeLessThan(800);
    await expect.poll(async () => broadcaster.locator('.live-room-stage video').evaluate((video) => ({
      readyState: video.readyState,
      tracks: video.srcObject?.getTracks().filter((track) => track.readyState === 'live').length || 0,
    }))).toEqual({ readyState: 4, tracks: 2 });

    await login(viewer, USERS.bob);
    await viewer.goto('/profile/9d93bd20-46c6-418d-a858-76edaab020b0');
    await expect(viewer.locator('.active-live-banner').getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 });
    await viewer.goto('/');
    await expect(viewer.locator('.active-live-banner').getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 });
    await viewer.locator('.active-live-item').filter({ hasText: title }).click();
    await expect(viewer.getByText('Đang xem trực tiếp')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => viewer.locator('.live-room-stage video').evaluate((video) => ({
      readyState: video.readyState,
      tracks: video.srcObject?.getTracks().filter((track) => track.readyState === 'live').length || 0,
    })), { timeout: 15_000 }).toEqual({ readyState: 4, tracks: 2 });

    await viewer.getByLabel('Bình luận live').fill('Bình luận realtime từ Bob');
    await viewer.getByRole('button', { name: 'Gửi bình luận' }).click();
    await expect(broadcaster.getByText('Bình luận realtime từ Bob')).toBeVisible({ timeout: 10_000 });

    await broadcaster.getByRole('combobox').click();
    await broadcaster.getByRole('option', { name: 'Bạn bè' }).click();
    await expect.poll(async () => viewer.locator('.live-room-stage video').evaluate((video) =>
      video.srcObject?.getTracks().filter((track) => track.readyState === 'live').length || 0
    ), { timeout: 15_000 }).toBe(2);

    await broadcaster.getByRole('combobox').click();
    await broadcaster.getByRole('option', { name: 'Chỉ mình tôi' }).click();
    await expect(viewer.getByRole('dialog', { name: title })).toBeHidden({ timeout: 10_000 });

    await broadcaster.getByRole('button', { name: 'Kết thúc live' }).click();
    await expect(broadcaster.getByText(/Bản phát lại tự xóa lúc/)).toBeVisible({ timeout: 15_000 });
    await broadcaster.getByRole('button', { name: 'Đăng bản live thành video post' }).click();
    await expect(broadcaster.getByRole('dialog', { name: 'Đăng bản live thành video' })).toBeVisible();
    await broadcaster.getByRole('button', { name: 'Hủy và xóa video' }).click();
    await expect(broadcaster.getByRole('dialog', { name: title })).toBeHidden({ timeout: 10_000 });
  } finally {
    await Promise.allSettled([broadcasterContext.close(), viewerContext.close()]);
  }
});
