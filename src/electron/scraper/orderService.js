import { delay } from './utils.js';
import { sendMessage } from './communication.js';
import 'dotenv/config';

const { SHORT_DELAY } = process.env;

/**
 * Places an order for the given product using Puppeteer.
 * Sends unified notifications via sendMessage().
 * @param {{ title: string, href: string }} product
 * @param {import('puppeteer').Browser} browser
 */
export async function orderProduct(product, browser) {
  const page = await browser.newPage();
  try {
    // Navigate to product page
    const url = new URL(product.href, 'https://creator.im.skeepers.io').href;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await delay(Number(SHORT_DELAY) || 2000);

    // Extract price
    let price = null;
    try {
      price = await page.$eval(
        'div.mt-10 > div.text-muted:last-of-type',
        el => el.textContent.replace('Retail price', '').trim()
      );
    } catch {
      console.log(`Price not found for ${product.title}`);
    }

    // Extract image URL
    let imageUrl = null;
    try {
      imageUrl = await page.$eval('img.img-responsive', el => el.src);
    } catch {
      console.log(`Image not found for ${product.title}`);
    }

    // Notify ordering started
    await sendMessage({
      text: `✅ Ordering **${product.title}**${price ? ` at $${price}` : ''}`
    });

    // Perform the delivery popup flow
    await handleDeliveryPopup(page, product.title);

    // Notify order completed
    await sendMessage({
      text: `🎉 **${product.title}** has been ordered successfully!`
    });
  } catch (err) {
    console.error(`Error ordering ${product.title}:`, err);
    await sendMessage({
      text: `❌ Failed to order **${product.title}**: ${err.message}`
    });
  } finally {
    await page.close();
  }
}

/**
 * Handles the final confirmation steps in the delivery popup.
 * @param {import('puppeteer').Page} page
 * @param {string} productTitle
 */
export async function handleDeliveryPopup(page, productTitle) {
  // Click the "Order" button to open the popup
  await page.waitForSelector('skp-button[text="Order"] button', { timeout: 10000 });
  await page.click('skp-button[text="Order"] button');

  // Wait for dialog
  await page.waitForSelector('dialog[open]', { timeout: 10000 });

  // Confirm address checkbox
  const addr = await page.$('#checkAddress');
  if (addr) await addr.click();

  // Confirm other rules
  for (const selector of ['#requestedViewCount', '#licensing_checkbox']) {
    const chk = await page.$(selector);
    if (chk) await chk.click();
  }

  // Finalize order
  await page.click('button.btn-responsive.btn-order-campaign.btn.btn-primary');
  await delay(500); // brief wait
}
