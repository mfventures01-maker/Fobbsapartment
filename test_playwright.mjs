import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('MEMBERSHIPS:')) console.log(msg.text());
        if (msg.text().includes('RESOLVED ROLE:')) console.log(msg.text());
    });

    await page.goto('http://localhost:5173/login');

    // Fill the login form
    await page.fill('input[type="email"]', 'superadmin@fobbs.com');
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Wait for navigation and auth context to settle
    await page.waitForTimeout(3000);

    const url = new URL(page.url());
    console.log('Current Route: ' + url.pathname);

    await browser.close();
})();
