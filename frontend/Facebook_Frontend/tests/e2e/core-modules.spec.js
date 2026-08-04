import { test, expect } from '@playwright/test';
import { attachDiagnostics, expectAppReady, login, USERS } from './helpers';

test.describe('Facebook Clone E2E smoke', () => {
  test('authenticates a seeded user and opens the home feed', async ({ page }, testInfo) => {
    const finishDiagnostics = attachDiagnostics(page, testInfo);

    await login(page, USERS.alice);
    await expectAppReady(page);
    await expect(page.getByText(/Alice Nguyen/i).first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/Reels|Hello Facebook Clone|test/i);

    await finishDiagnostics();
  });

  const userModules = [
    { name: 'home feed', path: '/', expected: /Reels|Contacts|Người liên hệ/i },
    { name: 'friends', path: '/friends', expected: /Friends|Bạn bè|Discover|Khám phá/i },
    { name: 'messages', path: '/messages', expected: /Chat|Tin nhắn|Contacts|Bob Tran/i },
    { name: 'reels', path: '/reels', expected: /Reels|Create|Tạo/i },
    { name: 'saved items', path: '/saved', expected: /Saved|Đã lưu|Saved items/i },
    { name: 'settings', path: '/settings', expected: /Settings|Cài đặt|Options|Tùy chọn/i },
  ];

  for (const module of userModules) {
    test(`loads ${module.name} module without runtime page errors`, async ({ page }, testInfo) => {
      const finishDiagnostics = attachDiagnostics(page, testInfo);

      await login(page, USERS.alice);
      await page.goto(module.path);
      await expectAppReady(page);
      await expect(page.locator('body')).toContainText(module.expected);

      await finishDiagnostics();
    });
  }

  test('opens admin area for seeded admin account', async ({ page }, testInfo) => {
    const finishDiagnostics = attachDiagnostics(page, testInfo);

    await login(page, USERS.admin, { expectedUrl: /\/admin(\/dashboard)?$/ });
    await page.goto('/admin');
    await expectAppReady(page);
    await expect(page.locator('body')).toContainText(/Admin Panel|Dashboard|User Management|Quản lý người dùng/i);

    await finishDiagnostics();
  });

  test('admin create-account dialog only offers lower roles', async ({ page }, testInfo) => {
    const finishDiagnostics = attachDiagnostics(page, testInfo);

    await login(page, USERS.admin, { expectedUrl: /\/admin(\/dashboard)?$/ });
    await page.goto('/admin/users');
    await expectAppReady(page);
    await page.getByRole('button', { name: /Create account|T\u1ea1o t\u00e0i kho\u1ea3n/i }).click();

    const dialog = page.locator('.admin-account-modal');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Admin/);
    await expect(dialog).toContainText(/Moderator/);
    await expect(dialog).not.toContainText(/Super Admin/);

    await finishDiagnostics();
  });

  test('keeps non-admin users out of admin area', async ({ page }, testInfo) => {
    const finishDiagnostics = attachDiagnostics(page, testInfo);

    await login(page, USERS.alice);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);

    await finishDiagnostics();
  });
});
