import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

(async () => {
  const browser = await puppeteer.launch({ 
    executablePath: '/root/.cache/puppeteer/chrome-headless-shell/linux-151.0.7922.47/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log("GOTO ERROR:", e.message);
  }
  await browser.close();
})();
