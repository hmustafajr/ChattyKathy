const eris = require('eris');
const webhookListener = require('./webhook_listener_step7.js');
const { kat_owner_ID, kat_token } = require('../config.json');

const PREFIX = 'pb!';
const PREMIUM_CUTOFF = 10;

const bot = new eris.Client(BOT_TOKEN);

const premiumRole = {
  name: 'Special Member',
  color: 0x6aa84f,
  hoist: true, //displays users with this trait in their section of the member list
};

async function updateMemberRoleForDonation(guild, member, donationAmount) {
  //if user donated more than $10 grants premium role
  if (guild && member && donationAmount >= PREMIUM_CUTOFF) {
    //obtains role or generates it
    let role = Array.from(guild.roles.values())
      .find(role => role.name === premiumRole.name);

    if (!role) {
      role = await guild.createRole(premiumRole);
    }

    //appends the role to the user and explains it
    return member.addRole(role.id, 'Donated $10 or more.');
  }
}

const commandForName = {};
commandForName['addpayment'] = {
  botOwnerOnly: true,
  execute: (msg, args) => {
    const mention = args[0];
    const amount = parseFloat(args[1]);
    const guild = msg.channel.guild;
    const userId = mention.replace(/<@(.*?)>/, (match, group1) => group1);
    const member = guild.members.get(userId);

    const userIsInGuild = !!member;
    if (!userIsInGuild) {
      return msg.channel.createMessage('User not found in this guild.');
    }

    const amountIsValid = amount && !Number.isNaN(amount);
    if (!amountIsValid) {
      return msg.channel.createMessage('Invalid donation amount');
    }

    return Promise.all([
      msg.channel.createMessage(`${mention} paid $${amount.toFixed(2)}`),
      updateMemberRoleForDonation(guild, member, amount),
    ]);
  },
};

bot.on('messageCreate', async (msg) => {
  try {
    const content = msg.content;

    //ignores messages sent as DMS
	//only accepts commands issued in the guild
    if (!msg.channel.guild) {
      return;
    }

    //igonres messages that do not start with the correct prefix
    if (!content.startsWith(PREFIX)) {
      return;
    }

    //extracts the name of the command
    const parts = content.split(' ').map(s => s.trim()).filter(s => s);
    const commandName = parts[0].substr(PREFIX.length);

    //obtains existing requested command
    const command = commandForName[commandName];
    if (!command) {
      return;
    }

    //if command is reserved for the owner the command is ignored
    const authorIsBotOwner = msg.author.id === BOT_OWNER_ID;
    if (command.botOwnerOnly && !authorIsBotOwner) {
      return await msg.channel.createMessage('Hey, only my owner can issue that command!');
    }

    //seperates the command args from the prefix and the name
    const args = parts.slice(1);

    //executes
    await command.execute(msg, args);
  } catch (err) {
    console.warn('Error handling message create event');
    console.warn(err);
  }
});

bot.on('error', err => {
  console.warn(err);
});

function findUserInString(str) {
  const lowercaseStr = str.toLowerCase();
  //searches for a username in the form of username#discriminator
  const user = bot.users.find(
    user => lowercaseStr.indexOf(`${user.username.toLowerCase()}#${user.discriminator}`) !== -1,
  );
  return user;
}

async function onDonation(
  paymentSource,
  paymentId,
  timestamp,
  amount,
  senderName,
  message,
) {
  try {
    const user = findUserInString(message);
    const guild = user ? bot.guilds.find(guild => guild.members.has(user.id)) : null;
    const guildMember = guild ? guild.members.get(user.id) : null;

    return await updateMemberRoleForDonation(guild, guildMember, amount);
  } catch (err) {
    console.warn('Error handling donation event.');
    console.warn(err);
  }
}

webhookListener.on('donation', onDonation);
bot.connect();
