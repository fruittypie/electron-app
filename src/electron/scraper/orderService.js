import { delay } from './utils.js';
import { notify, promptOrder } from './communication.js';
import pkg from 'discord.js';
import 'dotenv/config';

const { EmbedBuilder } = pkg;
const { SHORT_DELAY = 5000 } = process.env;

// fetch product details (price & image), then either auto-order or notify the user.
export async function orderProduct(product, browser, settings) {
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
    const priceNum = parseFloat((priceText || '').replace(/[^0-9.]/g, '')) || Infinity;

    // Extract image URL
    let imageUrl = null;
    try {
      imageUrl = await page.$eval('img.img-responsive', el => el.src);
    } catch {
      console.log(`Image not found for ${product.title}`);
    }

    // build an embed for rich messages
    const embed = new EmbedBuilder().setTitle(product.title);
    if (imageUrl) embed.setImage(imageUrl);

    // Auto-order || manual order
    const { autoOrder = false, minPrice = Infinity, keywords = [] } = settings;
    const priceMatch = autoOrder && priceNum >= minPrice;
    const keywordMatch = autoOrder && 
      keywords.some( kw=> products.title.toLowerCase().includes(kw.toLowerCase()));
    
    // auto-order path
    if (priceMatch || keywordMatch) {
        await notify({
            text: `Auto-ordering **${details.title}** — $${details.price}`,
            embed
        });
            
        await finalizeOrder(page, product.title);
        await notify({
            text: `✅ **${details.title}** auto-ordered successfully!`
        });
    // manual path
    } else {
      const userConfirmed = await promptOrder(
        { title: product.title, href: product.href, price: priceText, imageUrl },
        embed
      );
      if (userConfirmed) {
        await notify({
          text: `Ordering **${product.title}**…`
        });

        await finalizeOrder(page, product.title);
        await notify({
          text: `🎉 **${product.title}** has been ordered!`
        });
      } else {
        await notify({
          text: `⏭️ Skipped **${product.title}**.`
        });
      }
    }
  } catch (err) {
    console.error(`Error in orderProduct for ${product.title}:`, err);
    await notify({
      text: `❌ Failed to order **${product.title}**: ${err.message}`
    });
  } finally {
    await page.close();
  }
}

export async function finalizeOrder(page) {
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
  await delay(); // brief wait
}
