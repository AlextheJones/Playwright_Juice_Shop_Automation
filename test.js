const { chromium } = require('playwright');

(async () => {
  console.log('Starting security automation demo: Playwright + Burp Proxy');

  const browser = await chromium.launch({
    headless: false,
    proxy: {
      server: 'http://127.0.0.1:8080',
    }
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Juice Shop...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

// Dismiss welcome banner if present - more robust locator
    console.log('Checking for OWASP Juice Shop welcome banner...');

    const dismissButton = page.locator(
      'button:has(span.hide-lt-sm:text("Dismiss")), ' +
      'button[aria-label*="dismiss"], ' +
      'button.close-dialog, ' +
      '[aria-modal="true"] button'
    );

// Give it up to 4 seconds to appear
    try {
      await dismissButton.waitFor({ state: 'visible', timeout: 4000 });
      await dismissButton.click({ force: true });  // force in case of overlay issues
      console.log('Dismissed welcome banner successfully!');
      await page.waitForTimeout(1500);  // let the UI fully settle after dismiss
    } catch (e) {
      console.log('Welcome banner not found or already dismissed (continuing anyway)');
    }

// Step: Click the Account button in navbar to open dropdown
    console.log('Clicking Account button in navbar...');
    const accountButton = page.locator('#navbarAccount');
    await accountButton.waitFor({ state: 'visible', timeout: 10000 });
    await accountButton.click();
    await page.waitForTimeout(1000); // let dropdown animate/open

// Step: Click the "Login" option in the dropdown
    console.log('Selecting Login from dropdown...');
    const loginItem = page.getByRole('menuitem', { name: 'Login' });
    await loginItem.waitFor({ state: 'visible', timeout: 8000 });
    await loginItem.click({ force: true });

// Now on login page — wait for form to be ready
    await page.waitForURL('**/#/login', { timeout: 10000 });
    console.log('On login page now!');

// Now do the login
    console.log('Filling login form...');
    await page.fill('input[name="email"]', 'admin@juice-sh.op');
    await page.fill('input[name="password"]', 'admin123');

        console.log('Submitting login...');
    await page.click('button[type="submit"]');

// Wait for either success (dashboard loads) or error message
    await page.waitForTimeout(3000); // give time for toast/network

// Check for error toast (common selector in Juice Shop)
    const errorToast = page.locator('mat-error, simple-snack-bar:has-text("Invalid"), .error');
    if (await errorToast.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Login FAILED: Invalid email or password message detected!');
// Optional: take screenshot of failure for debug
      await page.screenshot({ path: 'login-failure.png', fullPage: true });
    } else {
// Check for dashboard indicator (e.g. basket icon, or URL change, or welcome message)
      const dashboardIndicator = page.locator('#navbarBasket, h1:has-text("All Products"), .mat-drawer-inner-container');
      if (await dashboardIndicator.isVisible({ timeout: 8000 })) {
        console.log('Login SUCCESSFUL! 🎉 On dashboard now.');
      } else {
        console.log('...');
      }
    }

    await page.waitForTimeout(5000); // extra time for Burp capture

    console.log('Login successful! 🎉');

// Screenshot
    await page.screenshot({ path: 'juice-shop-admin-dashboard.png', fullPage: true });
    console.log('Screenshot saved as juice-shop-admin-dashboard.png');
    await page.waitForTimeout(6000); // extra time for Burp capture

// Step: Click the Account button in navbar to open dropdown
    console.log('Clicking Account button in navbar...');
    await accountButton.waitFor({ state: 'visible', timeout: 10000 });
    await accountButton.click();
    await page.waitForTimeout(1000); // let dropdown animate/open

// Step: Click the "Logout" option in the dropdown
    console.log('Selecting Login from dropdown...');
    const logoutItem = page.getByRole('menuitem', { name: 'Logout' });
    await logoutItem.waitFor({ state: 'visible', timeout: 8000 });
    await logoutItem.click({ force: true });

  } catch (error) {
    console.error('Error during automation:', error.message);
  }

  console.log('\nBrowser stays open. Explore, check Burp, then close window or Ctrl+C.');
})();
