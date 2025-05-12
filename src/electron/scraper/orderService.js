import pkg from 'discord.js';
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = pkg;
import { delay } from './utils.js';
import 'dotenv/config';

const { SHORT_DELAY} = process.env;

export async function orderProduct(product, browser, discordClient, CHANNEL_ID, USER_ID) {
    const page = await browser.newPage();
    try {
        // Open product page
        const fullUrl = new URL(product.href, 'https://creator.im.skeepers.io');
        await page.goto(fullUrl.href, { waitUntil: 'domcontentloaded' });
        await delay(SHORT_DELAY);

        // Extract price
        let price = null;
        try {
            price = await page.$eval('div.mt-10 > div.text-muted:last-of-type', el =>
                el.textContent.replace('Retail price', '').trim()
            );
        } catch (err) {
            console.log(`Could not find price element for ${product.title}.`);
        }
        
        let imageUrl = null;
        try {
            imageUrl = await page.$eval('img.img-responsive', el => el.getAttribute('src'));
        } catch (err) {
            console.log(`Could not find image for ${product.title}.`);
        }

        const embed = imageUrl
        ? new EmbedBuilder()
            .setTitle(product.title)
            .setImage(imageUrl)                  
        : null;

        // Send a Discord message for confirmation
        const channel = discordClient.channels.cache.get(CHANNEL_ID);
        if (!channel) {
            console.error("Discord channel not found");
            return;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`order_yes_${product.title}`)
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`order_no_${product.title}`)
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
        );

        const msg = await channel.send({
            content: `🛍️ **Available:** ${product.title}\n💵 **Price:** ${price ?? 'N/A'}\nDo you want to order it?`,
            embeds: embed ? [embed] : [],
            components: [row]
        });

        // Wait up to 60 seconds for user confirmation without blocking other processes
        try {
            const filter = (i) =>
                i.user.id === USER_ID &&
                (i.customId === `order_yes_${product.title}` || i.customId === `order_no_${product.title}`);
            const interaction = await msg.awaitMessageComponent({ filter, time: 60000 });
            
            if (interaction.customId.startsWith('order_yes')) {
                await interaction.reply({ content: `✅ Ordering **${product.title}**...`, flags: 64 });
                // Continue the ordering process
                try {
                    handleDeliveryPopup(page, product.title);
                    await interaction.followUp({ content: `✅ **${product.title}** has been ordered`, flags: 64 });
                } catch (err) {
                    console.error(`Could not click order button for ${product.title}`, err);
                }
            } else {
                await interaction.followUp({ content: `❌ Skipped **${product.title}**.`, flags: 64 });
            }
        } catch (err) {
            if (err.name === 'TimeoutError') {
                await msg.reply({ content: `⌛ Time is over for **${product.title}**.`, flags: 64 }).catch(() => {});
            } else {
                console.error("Interaction error:", err);
            }
        }
    } catch (err) {
        console.error(`Error in orderProduct for ${product.title}:`, err);
    } finally {
        await page.close();
    }
}

 // confirm final order
export async function handleDeliveryPopup(page, productTitle) {
    console.log('popup function started');
    // hit order button
    await page.waitForSelector('skp-button[text="Order"] button', { timeout: 10000 });
    await page.click('skp-button[text="Order"] button');
    // wait for the pop-up
    await page.waitForSelector('dialog[open]', { timeout: 10000 });
  
    // confirm address checkbox
    const addr = await page.$('#checkAddress');
    if (addr) await addr.click();
  
    // confirm each rule
    for (const selector of ['#requestedViewCount', '#licensing_checkbox']) {
      const checkbox = await page.$(selector);
      if (checkbox) await checkbox.click();
    }
  
    // final click
    await page.click('button.btn-responsive.btn-order-campaign.btn.btn-primary');
    console.log(`✅ Final “Order” clicked for ${productTitle}`);
}
