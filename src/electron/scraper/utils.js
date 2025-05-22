import { discordClient } from './communication.js';

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
    // Make sure Discord client exists and is logged in
    if (!discordClient || !discordClient.isReady()) {
      console.log('Discord client not available or not ready for message cleanup');
      return;
    }
    
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

export function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      });
    }
  });
}
