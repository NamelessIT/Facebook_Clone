import { expect } from '@playwright/test';

export const USERS = Object.freeze({
  alice: { email: 'alice@fbclone.com', password: '123456' },
  admin: { email: 'admin@fbclone.com', password: 'Admin@123' },
});

export const attachDiagnostics = (page, testInfo) => {
  const browserErrors = [];
  const consoleMessages = [];

  page.on('pageerror', (error) => {
    browserErrors.push(error.stack || error.message);
  });

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    }
  });

  return async () => {
    if (consoleMessages.length) {
      await testInfo.attach('browser-console.log', {
        body: consoleMessages.join('\n'),
        contentType: 'text/plain',
      });
      console.log(`Browser console diagnostics for ${testInfo.title}:\n${consoleMessages.join('\n')}`);
    }

    if (browserErrors.length) {
      await testInfo.attach('browser-page-errors.log', {
        body: browserErrors.join('\n\n'),
        contentType: 'text/plain',
      });
    }

    expect(browserErrors, `Unexpected browser page errors in ${testInfo.title}`).toEqual([]);
  };
};

export const login = async (page, user = USERS.alice, options = {}) => {
  const expectedUrl = options.expectedUrl || /\/$/;
  await page.goto('/login');
  await page.getByRole('textbox').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.locator('form button[type="submit"]').first().click();
  await expect(page).toHaveURL(expectedUrl);
};

export const expectAppReady = async (page) => {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#root')).toBeVisible();
};
