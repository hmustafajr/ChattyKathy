const eris = require('eris');
const { BOT_TOKEN } = require('../config.json');

const PREFIX = 'pb!';

const bot = new eris.Client(BOT_TOKEN);

const commandHandlerForCommandName = {};
commandHandlerForCommandName['addpayment'] = (msg, args) => {
  const mention = args[0];
  const amount = parseFloat(args[1]);

  //handles invalid commands by:
  //1. no mention or invalid mention
  //2. no amount or invalid amount

  return msg.channel.createMessage(`${mention} paid $${amount.toFixed(2)}`);
};

bot.on('messageCreate', async (msg) => {
  const content = msg.content;

  //ignores messages sent as DMs Kathy will only accept commands issued in a guild
  if (!msg.channel.guild) {
    return;
  }

  //ignores any messages that don't start with a valid prefix
  if (!content.startsWith(PREFIX)) {
    return;
  }

  //extracts the name of the command
  const parts = content.split(' ').map(s => s.trim()).filter(s => s);
  const commandName = parts[0].substr(PREFIX.length);

  //gets the appropriate existing command handler
  const commandHandler = commandHandlerForCommandName[commandName];
  if (!commandHandler) {
    return;
  }

  //separates command args from the command prefix and name
  const args = parts.slice(1);

  try {
    //execute the command
    await commandHandler(msg, args);
  } catch (err) {
    console.warn('Error handling command');
    console.warn(err);
  }
});

bot.on('error', err => {
  console.warn(err);
});

bot.connect();
