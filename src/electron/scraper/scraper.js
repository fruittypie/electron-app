import pkg from 'discord.js';
const { Client, GatewayIntentBits} = pkg;
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import 'dotenv/config';

import { delay, rejectCookies, cleanupExpiredMessages, sendMessage } from './utils.js';
import { getItem, upsertItem } from './db.js';
import { orderProduct } from './orderService.js';

// puppeteer stealth setup
puppeteer.use(StealthPlugin());

let stopFlag = false;
export const stopScraping = () => {
  stopFlag = true;
  console.log("Stop flag set to true in scraper.js");
};

export const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

export const startScraping = async (scraperSettings, onDone) => {
    const { TOKEN, CHANNEL_ID, USER_ID, SHORT_DELAY } = process.env;

    const {  
        headless, 
        username, 
        password, 
        intervalSec, 
        notifyInApp, 
        notifyDiscord, 
        autoOrder, 
        minPrice
    } = scraperSettings;

    // only log in to Discord if the user wants Discord notifications
    if (notifyDiscord) {
        await discordClient.login(TOKEN);
    }

    const main = async () => {
        const browser = await puppeteer.launch({ 
            headless: headless,
        });
        const page = await browser.newPage();

        // browser config
        const customUA = 
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' +
            '(KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
        await page.setUserAgent(customUA);
        await page.setCacheEnabled(false); 
        await page.addStyleTag({ content: 'body { visibility: hidden !important; }' });

        // sign in
        await page.goto('https://creator.im.skeepers.io/auth/signin/en');2
        await delay(SHORT_DELAY);
        await page.waitForSelector('form#signin');
        
        await page.type('input#email', username);
        await page.type('input#password', password);
        await delay(5000);

        await rejectCookies(page, '.needsclick', '#axeptio_btn_dismiss');
        await page.click('button[type="submit"][data-testid="submit"]');
        await delay(SHORT_DELAY);

        // check if the toast notification for "Invalid email or password" appears
        const isLoginFailed = await page.$eval('.Toastify__toast', (toast) => {
            return toast && toast.innerText.includes('Invalid email or password');
        }).catch(() => false); 
        if (isLoginFailed) {
            console.log('Login failed: Invalid email or password');
            await browser.close(); 
            return;
        }
        // navigate to campaign search
        await page.goto('https://creator.im.skeepers.io/campaigns/search');
        await delay(SHORT_DELAY);
        
        // polling loop
        while (!stopFlag ) {
            try {
                console.log('fisrt check shouldStop ', stopFlag );
                await page.waitForSelector('.free-store');
                await page.waitForSelector('.col-md-4.col-xs-6');

                if (stopFlag ) {
                    console.log('Stop flag detected');
                    break;
                }
                // extract products
                const products = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.col-md-4.col-xs-6')).map(card => {
                    const titleEl      = card.querySelector('.Title-sc-99so87-5');
                    const soldOutEl    = card.querySelector('.OutOfStock-sc-99so87-0');
                    const orderedEl    = card.querySelector('skp-tag[text="ORDERED"], .skp-tag-root');
                    const buyButtonEl  = card.querySelector('button.btn-order-campaign');
                
                    const title = titleEl?.innerText.trim() ?? null;
                    const href  = card.querySelector('a')?.href ?? null;
                
                    let status;
                    if (soldOutEl)        status = 'sold out';
                    else if (orderedEl)    status = 'ordered';
                    else if (buyButtonEl)  status = 'in stock';
                    else                   status = 'unknown';
                
                    return { title, status, href };
                    });
                });

                // collect only the items that are currently in stock.
                const inStockProducts = products.filter(p => p.title && p.status === 'in stock');
                
                // for each product in stock, trigger the ordering process asynchronously
                for (const product of products) {
                    if (!product.title) continue;

                    // update or insert the product in the database
                    const existing = getItem(product.title);
                    const currentStatus = product.status.trim().toLowerCase();

                    if (stopFlag ) {
                        console.log('Stop flag detected');
                        break;
                    }

                    if (!existing) {
                        upsertItem(product.title, product.status);
                        console.log('added a new item to the db')
                        if (product.status === 'in stock') {
                            orderProduct(
                                product,
                                browser,
                                discordClient,
                                CHANNEL_ID,
                                USER_ID
                                ).catch(err =>
                                console.error(`Error ordering ${product.title}:`, err)
                                );
                        } else {
                            console.log(`The new product ${product.title} was already sold out at the time of checking.`);
                        }
                    } else {
                        if (existing.status.trim().toLowerCase() !== currentStatus) {
                            console.log(`Existing: "${existing.status}", New: "${product.status}"`);
                            upsertItem(product.title, product.status);
                            if (product.status === "in stock") {
                                orderProduct(
                                    product,
                                    browser,
                                    discordClient,
                                    CHANNEL_ID,
                                    USER_ID
                                    ).catch(err =>
                                    console.error(`Error ordering ${product.title}:`, err)
                                    );
                            } else {
                                await sendMessage(`Product updated: ${product.title} is now sold out.`)
                            }
                        }
                    }               
                }
                if (stopFlag ) {
                    console.log('Stop flag detected');
                    break;
                }
                if (inStockProducts.length > 0) {
                    // short wait time, the product is in stock
                    await delay(SHORT_DELAY);
                } else {
                    // nothing in stock, slow down the polling
                    await delay(intervalSec);
                } 
                const channel = discordClient.channels.cache.get(CHANNEL_ID);
                if (channel) {
                    // clean up any messages older than 10 minutes
                await cleanupExpiredMessages(channel, 10 * 60 * 1000, 24 * 60 * 60 * 1000);
                } else if (!notifyDiscord) {
                    continue;
                } else {
                    console.error("Discord channel not found");
                }

                if (stopFlag ) {
                    break;
                } 
                console.log('second check shouldStop ', stopFlag );         

                await page.reload();

            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.error('Timeout error occurred. Reloading the page...');
                    await page.reload();
                } else {
                    console.error('An error occurred', error);
                    break;
                }
            }
        } 
        console.log('Scraping stopped');
        await browser.close();
        if (typeof onDone === 'function') onDone()
    }
    main();
};
