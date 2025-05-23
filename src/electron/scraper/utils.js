import 'dotenv/config';
const { CHANNEL_ID } = process.env;
import { discordClient } from './scraper.js';
// timer
export const delay = ms => new Promise(r => setTimeout(r, ms));

// reject cookies during login
export async function rejectCookies(page, shadowHostSelector, buttonSelector) {
    const shadowHost = await page.$(shadowHostSelector);
    if (!shadowHost) {
        console.log("Shadow host not found");
        return false;
    }
    const shadowRoot = await page.evaluateHandle(el => el.shadowRoot, shadowHost);
    const button = await shadowRoot.$(buttonSelector);
    if (button) {
        await button.click();
        return true;
    } else {
        console.log("Button not found inside shadow root");
        return false;
    }
}

// delete Discord messages sent by a bot that offer already expired items
export async function cleanupExpiredMessages(channel, minAgeMs = 10 * 60 * 1000, maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const now = Date.now();
  
      for (const message of messages.values()) {
        if (!message.author.bot) continue;
  
        const age = now - message.createdTimestamp;
        if (age > minAgeMs && age < maxAgeMs) {
          await message.delete().catch(err => {
            console.error(`Failed to delete message ${message.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error('Error during ranged message cleanup:', err);
    }
}

export async function sendMessage(content) {
    // get the channel object
    const channel = discordClient.channels.cache.get(CHANNEL_ID);
    if (!channel) {
      console.error("Discord channel not found for sendMessage");
      return;
    }
  
    try {
      // send a message
      await channel.send(content);
      console.log("Message sent via bot:", content);
    } catch (err) {
      console.error("Error sending message via bot:", err);
    }
}