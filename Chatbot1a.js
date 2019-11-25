const eris = require('eris');
const { BOT_TOKEN } = require('../config.json');

//Creates an instance with your bot token
const bot = new eris.Client(BOT_TOKEN);

//When the Kathy is connected and ready, logs to console
bot.on('ready', () => {
  console.log('Im Here');
});

//When a message is sent where Kathy is present this event will trigger checks if the Kathy was mentioned if not Kathy will respond with "Present".
bot.on('messageCreate', async (msg) => {
  const botWasMentioned = msg.mentions.find(
    mentionedUser => mentionedUser.id === bot.user.id,
  );

  if (botWasMentioned) {
    try {
      await msg.channel.createMessage('Present');
    } catch (err) {
      //Reasons why sending a message may fail.
      //API might time out or choke and return a 5xx status,
      //Kathy may not have permission to send the message (403 status).
      console.warn('Failed to respond to mention.');
      console.warn(err);
    }
  }
});

bot.on('whoops', err => {
  console.warn(err);
});

bot.connect();
