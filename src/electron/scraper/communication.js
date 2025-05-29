import { ipcMain } from 'electron';
import pkg from 'discord.js';
const {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle
} = pkg;
import { delay } from './utils.js';
import 'dotenv/config';

const { SHORT_DELAY} = process.env;

export let mainWindow = null;
export let discordClient = null;
export let settings       = {};
export let initialized   = false;

export function initComm({ window, discord, userSettings }) {
  mainWindow    = window;
  discordClient = discord;
  initialized   = true;
  settings = {
    ...userSettings,
    CHANNEL_ID: process.env.CHANNEL_ID,
    USER_ID:    process.env.USER_ID   
  };
}

// one‐way notification to Discord and/or in‐app log
export async function notify({ text, embed = null }) {
  // in-app log notification
  if (settings.notifyInApp && mainWindow) {
    mainWindow.webContents.send('scraper-log', { 
      timestamp: Date.now(),
      type: embed ? 'in-stock' : 'info',
      text,
      product: embed
        ? { title: embed.data.title, imageUrl: embed.data.image?.url } // TODO: embed a pic, not a link
        : null
    });
  }

  // Discord notification
  if (settings.notifyDiscord && discordClient) {
    const ch = discordClient.channels.cache.get(settings.CHANNEL_ID);
    if (ch) {
      await ch.send({
        content: text,
        embeds: embed ? [embed] : []
      });
    } else {
      console.error('Discord channel not found:', settings.CHANNEL_ID);
    }
  }
  }

// prompt the user "Yes/No" with a timeout.
export async function promptOrder(product, embed, stopSignal) {
  const yesId = `order_yes_${product.title}`;
  const noId  = `order_no_${product.title}`;
  const content = `🛍️ **${product.title}** is in stock at $${product.price}. Order?`;

  let discordPromise = Promise.resolve(null);
  if (settings.notifyDiscord && discordClient) {
    const ch = discordClient.channels.cache.get(settings.CHANNEL_ID);
    if (ch) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(yesId)
          .setLabel('Yes')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(noId)
          .setLabel('No')
          .setStyle(ButtonStyle.Danger)
      );
      const msg = await ch.send({
        content,
        embeds: embed ? [embed] : [],
        components: [row]
      });

      discordPromise = new Promise(async resolve => {
        try {
          const interaction = await msg.awaitMessageComponent({
            filter: i =>
              i.user.id === settings.USER_ID &&
              (i.customId === yesId || i.customId === noId),
            time: 60000
          });
          await interaction.reply({
            content: interaction.customId === yesId
              ? `✅ Ordering **${product.title}**…`
              : `❌ Skipped **${product.title}**.`,
            flags: 64
          });
          resolve(interaction.customId === yesId);
        } catch {
          // timeout or error
          await msg.reply({ content: `⌛ Time is over for **${product.title}**.`, flags: 64 })
            .catch(() => {});
          resolve(false);
        }
      });
    }
  }
  // In-app prompt
  let inAppPromise = Promise.resolve(null);

  if (settings.notifyInApp && mainWindow) {
    mainWindow.webContents.send('scraper-log', {
      timestamp: Date.now(),
      type: 'in-stock',
      text: content,
      product,
      components: [
        { type: 'button', customId: yesId, label: 'Yes', style: 'success' },
        { type: 'button', customId: noId,  label: 'No',  style: 'danger'  }
      ]
    });

    inAppPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 60000);

      const clickHandler = (_, customId) => {
        clearTimeout(timeout);
        resolve(customId === yesId);
      };

      ipcMain.once('inapp-order-click', clickHandler);

      if (stopSignal?.aborted) {
        clearTimeout(timeout);
        ipcMain.removeListener('inapp-order-click', clickHandler);
        resolve(false);
      } else {
        stopSignal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          ipcMain.removeListener('inapp-order-click', clickHandler);
          resolve(false);
        });
      }
    });
  }

  // wait for either channel
  const [d, a] = await Promise.all([discordPromise, inAppPromise]);
  if (d !== null) return d;
  if (a !== null) return a;
  return false;
}


export async function orderProduct(product, browser) {
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
        const channel = discordClient.channels.cache.get(settings.CHANNEL_ID);
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
