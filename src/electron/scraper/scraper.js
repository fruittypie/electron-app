import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';
import { delay, rejectCookies, cleanupExpiredMessages, abortableDelay } from './utils.js';
import { getItem, upsertItem } from './db.js';
import { orderProduct } from './orderService.js';
import { notify, discordClient, settings  } from './communication.js';

// Enable stealth plugin
puppeteer.use(StealthPlugin());

export function getStopFlag() {
  return stopFlag;
}

export function getStopSignal() {
  return stopSignal;
}

let stopFlag = false;
let controller = null;
export let stopSignal = null; 
let browser = null;

export const stopScraping = () => {
  notify({ text: '🛑 Stopping the scraper...' });
  stopFlag = true;
  // stop all async functions
  if (controller) controller.abort();
};

export const startScraping = async (scraperSettings) => {
  const { 
    headless, 
    username, 
    password, 
    intervalSec, 
    notifyDiscord
  } = scraperSettings;

  // Reset stop flag at the beginning
  stopFlag = false;
  controller = new AbortController();
  stopSignal = controller.signal;
  const intelvalMsec = intervalSec * 1000;

  // Notify start
  await notify({ text: '🚀 Starting the scraper...' });

  browser = await puppeteer.launch({ headless });
    const page = await browser.newPage();
    // Browser setup
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    );
    await page.setCacheEnabled(false);

    // Navigate to login
    await notify({ text: '🔐 Navigating to login page...' });
    await page.goto('https://creator.im.skeepers.io/auth/signin/en');
    await abortableDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal);
    await page.waitForSelector('form#signin');
    await page.type('input#email', username);
    await page.type('input#password', password);
    await abortableDelay(6000);
    await rejectCookies(page, '.needsclick', '#axeptio_btn_dismiss');
    await page.click('button[type="submit"][data-testid="submit"]');
    await abortableDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal);

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
    await abortableDelay(scraperSettings.SHORT_DELAY || 5000, stopSignal);

    // Polling loop
    while (!stopFlag && !stopSignal.aborted) {
      try {
        await page.waitForSelector('.free-store');
        await page.waitForSelector('.col-md-4.col-xs-6');

        const products = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.col-md-4.col-xs-6')).map(card => {
            const titleEl = card.querySelector('.Title-sc-99so87-5');
            const soldOutEl = card.querySelector('.OutOfStock-sc-99so87-0');
            const orderedEl    = card.querySelector('skp-tag[text="ORDERED"], .skp-tag-root');

            const title = titleEl ? titleEl.innerText.trim() : null;
            const href = card.querySelector('a')?.href ?? null;

            let status = "not found";

            if (soldOutEl) {
                status = "sold out";
            } else if (orderedEl) {
                status = "ordered";
            } else {
                status = "in stock";
            }
            return { title, status, href }
          });
        });
          
       const inStockProducts = products.filter(p => p.title && p.status === 'in stock');
       const orderTasks = [];

        // Process products only if scraper is still running
        if (!stopFlag) {
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
              } else {
                console.log(`The new product ${product.title} is now sold out.`);
              }
            
                } else {
                  console.log('testing on out of stock items');
                  orderTasks.push(
                    orderProduct(product, browser, scraperSettings).catch(err =>
                      console.error(`Error ordering ${product.title}:`, err)
                    )
                 );
            }
          }
          if (inStockProducts.length >= 0) {
            await Promise.allSettled(orderTasks);
            await delay(30000); // TODO: fix this
          } else {
            await delay(intelvalMsec);
          }

          // Break the loop if stop was requested
          if (stopFlag || stopSignal.aborted) break;

          // Cleanup old messages if needed
          if (notifyDiscord && discordClient) {
            const ch = discordClient.channels.cache.get(settings.CHANNEL_ID);
            if (ch) {
              await cleanupExpiredMessages(ch);
            } else {
              console.error('Discord channel not found:', settings.CHANNEL_ID);
            }
          }
          
          // Only reload if we're still running
          if (!stopFlag && !stopSignal.aborted) {
            await page.reload();
          }
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
    // Clean browser close
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('Error closing browser:', err);
      }
      browser = null; 
    }
  }
  

