import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import { rejectCookies, cleanupExpiredMessages, safeDelay } from './utils.js';
import { getItem, upsertItem } from './db.js';
import { orderProduct } from './orderService.js';
import { notify, discordClient, settings } from './communication.js';

puppeteer.use(StealthPlugin());

export function getStopFlag() {
  return stopFlag;
}

export function getStopSignal() {
  return stopSignal;
}

function shouldStop() {
  return stopFlag || (stopSignal && stopSignal.aborted);
}

let stopFlag = false;
let controller = null;
export let stopSignal = null;
let browser = null;

export const stopScraping = () => {
  notify({ text: '🛑 Stopping the scraper...' });
  stopFlag = true;
  // stop all async functions
  if (controller) {
    controller.abort();
    console.log('[SCRAPER] Controller aborted');
  }
};

export const startScraping = async (scraperSettings) => {
  const { headless, username, password, intervalSec, notifyDiscord } = scraperSettings;
  // Reset stop flag at the beginning
  stopFlag = false;
  controller = new AbortController();
  stopSignal = controller.signal;
  const intervalMs = intervalSec * 1000;

  await notify({ text: '🚀 Starting the scraper...' });

  browser = await puppeteer.launch({ headless });
  const page = await browser.newPage();

  // Browser setup
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36');
  await page.setCacheEnabled(false);

  // Navigate to login
  try {
    await notify({ text: '🔐 Navigating to login page...' });
    await page.goto('https://creator.im.skeepers.io/auth/signin/en');
    if (!(await safeDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal))) return;

    await page.waitForSelector('form#signin');
    await page.type('input#email', username);
    await page.type('input#password', password);
    if (!(await safeDelay(6000, stopSignal))) return;

    await rejectCookies(page, '.needsclick', '#axeptio_btn_dismiss');
    await page.click('button[type="submit"][data-testid="submit"]');
    if (!(await safeDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal))) return;
    
    // Check login success 
    const loginFailed = await page
      .$$eval('.Toastify__toast', toasts =>
        toasts.some(t => t.innerText.includes('Invalid email or password'))
      )
      .catch(() => false);

    if (loginFailed) {
      await notify({ text: '❌ Login failed: Invalid credentials' });
      return;
    }
    await notify({ text: '✅ Logged in successfully' });

    // Navigate to campaigns search
    await page.goto('https://creator.im.skeepers.io/campaigns/search');
    if (!(await safeDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal))) return;

    // Polling loop
    while (!shouldStop()) {
      try {
        await page.waitForSelector('.free-store');
        await page.waitForSelector('.col-md-4.col-xs-6');

        const products = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.col-md-4.col-xs-6')).map(card => {
            const titleEl = card.querySelector('.Title-sc-99so87-5');
            const soldOutEl = card.querySelector('.OutOfStock-sc-99so87-0');
            const orderedEl = card.querySelector('skp-tag[text="ORDERED"], .skp-tag-root');
            const title = titleEl ? titleEl.innerText.trim() : null;
            const href = card.querySelector('a')?.href ?? null;
            let status = "not found";
            if (soldOutEl) status = "sold out";
            else if (orderedEl) status = "ordered";
            else status = "in stock";
            return { title, status, href };
          });
        });

        const inStockProducts = products.filter(p => p.title && p.status === 'in stock');
        const orderTasks = [];

        // Process products only if scraper is still running
        for (const product of products) {
          if (!product.title) continue;
          const existing = getItem(product.title);
          const currentStatus = product.status.trim().toLowerCase();
          const shouldOrder = !existing || existing.status.trim().toLowerCase() !== currentStatus;

          if (shouldOrder) {
            upsertItem(product.title, product.status);
            // Pass the browser instance to handle product processing
            if (browser && product.status === 'in stock') {
              orderTasks.push(
                orderProduct(product, browser, scraperSettings).catch(err =>
                  console.error(`Error ordering ${product.title}:`, err)
                )
              );
            }
          }
        }
        // Cleanup old messages if needed
        if (inStockProducts.length > 0) {
          await Promise.allSettled(orderTasks);
          if (!(await safeDelay(30000, stopSignal))) break;
        } else {
          if (!(await safeDelay(intervalMs, stopSignal))) break;
        }

        if (notifyDiscord && discordClient) {
          const ch = discordClient.channels.cache.get(settings.CHANNEL_ID);
          if (ch) {
            await cleanupExpiredMessages(ch);
          } else {
            console.error('Discord channel not found:', settings.CHANNEL_ID);
          }
        }

        if (!shouldStop()) {
          await page.reload();
        }

      } catch (error) {
        if (error.name === 'TimeoutError') {
          console.error('Timeout error occurred. Reloading the page...');
          await page.reload();
        } else {
          console.error('An error occurred', error);
          await notify({ text: 'The scraper has stopped due to technical problems' });
          break;
        }
      }
    }
  } finally {
    // Clean browser closing
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
      browser = null;
    }
  }

  return true;
};
