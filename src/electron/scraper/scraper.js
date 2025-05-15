import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import { delay, rejectCookies, cleanupExpiredMessages } from './utils.js';
import { getItem, upsertItem } from './db.js';
import { orderProduct } from './orderService.js';
import { notify } from './communication.js';

// Enable stealth plugin
puppeteer.use(StealthPlugin());

let stopFlag = false;
let browser = null;

export const stopScraping = () => {
  stopFlag = true;
  // Notify UI and Discord that stopping was requested
  notify({ text: '🛑 Stopping the scraper...' });
};

export const startScraping = async (scraperSettings) => {
  const { 
    headless, 
    username, 
    password, 
    intervalSec, 
  } = scraperSettings;

  // Reset stop flag at the beginning
  stopFlag = false;

  // Notify start
  await notify({ text: '🚀 Starting the scraper...' });

  browser = await puppeteer.launch({ headless });
  try {
    const page = await browser.newPage();
    // Browser setup
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    );
    await page.setCacheEnabled(false);

    // Navigate to login
    await notify({ text: '🔐 Navigating to login page...' });
    await page.goto('https://creator.im.skeepers.io/auth/signin/en');
    await delay(scraperSettings.SHORT_DELAY || 5000);
    await page.waitForSelector('form#signin');
    await page.type('input#email', username);
    await page.type('input#password', password);
    await delay(2000);
    await rejectCookies(page, '.needsclick', '#axeptio_btn_dismiss');
    await page.click('button[type="submit"][data-testid="submit"]');
    await delay(scraperSettings.SHORT_DELAY || 5000);

    // Check login success
    const loginFailed = await page
      .$$eval('.Toastify__toast', toasts =>
        toasts.some(t => t.innerText.includes('Invalid email or password'))
      )
      .catch(() => false);
    if (loginFailed) {
      await notify({ text: '❌ Login failed: Invalid credentials' });
      await browser.close();
      browser = null; // Make sure browser is set to null
      return;
    }
    await notify({ text: '✅ Logged in successfully' });

    // Navigate to campaigns search
    await page.goto('https://creator.im.skeepers.io/campaigns/search');
    await delay(scraperSettings.SHORT_DELAY || 5000);

    // Polling loop
    while (!stopFlag) {
      try {
        await page.waitForSelector('.free-store');
        await page.waitForSelector('.col-md-4.col-xs-6');

        const cards = await page.$$eval('.col-md-4.col-xs-6', elems =>
          elems.map(card => {
            const titleEl = card.querySelector('.Title-sc-99so87-5');
            const soldOutEl = card.querySelector('.OutOfStock-sc-99so87-0');
            const buyBtn = card.querySelector('button.btn-order-campaign');
            return {
              title: titleEl?.innerText.trim(),
              href: card.querySelector('a')?.href,
              status: soldOutEl ? 'sold out' : buyBtn ? 'in stock' : 'unknown'
            };
          })
        );

        // Process products only if scraper is still running
        if (!stopFlag) {
          for (const product of cards) {
            if (stopFlag) break; // Exit the loop if stopping was requested
            if (product.status === 'in stock' && !getItem(product.title)) {
              upsertItem(product.title, product.status);
              // Pass the browser instance to handle product processing
              if (browser) {
                try {
                  await orderProduct(product, browser, scraperSettings);
                } catch (err) {
                  console.error(`Error processing product ${product.title}:`, err);
                }
              }
            }
          }
        }

        // Break the loop if stop was requested
        if (stopFlag) break;

        // Delay between polls
        const waitTime = cards.some(p => p.status === 'in stock')
          ? (scraperSettings.SHORT_DELAY || 2000)
          : intervalSec * 1000;
        await delay(waitTime);

        // Cleanup old messages if needed
        await cleanupExpiredMessages();
        
        // Only reload if we're still running
        if (!stopFlag) {
          await page.reload();
        }
      } catch (err) {
        await notify({ text: `⚠️ Scraping error: ${err.message}` });
        break;
      }
    }

    // Notify stopped
    await notify({ text: '🏁 The scraper has stopped' });
  } catch (err) {
    await notify({ text: `❌ Unexpected error: ${err.message}` });
  } finally {
    // Clean browser close
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
      browser = null; // Make sure it's null after closing
    }
  }
};