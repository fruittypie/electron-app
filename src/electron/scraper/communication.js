export let mainWindow = null;
export let discordClient = null;
export let notifyDiscord = false;
export let notifyInApp   = false;
export let channelId     = null;
export let initialized   = false;

export function initComm({ window, discord, settings }) {
  if (initialized) {
    console.log('Communication already initialized, skipping');
  return;
  }

  mainWindow    = window;
  discordClient = discord;
  notifyDiscord = settings.notifyDiscord;
  notifyInApp   = settings.notifyInApp;
  channelId     = settings.CHANNEL_ID;
  initialized   = true;
}

export async function sendMessage({ text, embed = null, components = [] }) {
  // 1) In-app log
  if (notifyInApp && mainWindow) {
    mainWindow.webContents.send('scraper-log', {
      timestamp: Date.now(),
      type: embed ? 'in-stock' : 'info',
      text,
      product: embed
        ? { title: embed.data.title, imageUrl: embed.data.image?.url }
        : null
    });
  }

  // 2) Discord
  if (notifyDiscord && discordClient && channelId) {
    const channel = discordClient.channels.cache.get(channelId);
    if (channel) {
      await channel.send({ content: text, embeds: embed ? [embed] : [], components });
    } else {
      console.error('Discord channel not found:', channelId);
    }
  }
}