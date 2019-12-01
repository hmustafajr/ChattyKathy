const eris = require('eris'); //eirs is the Discord API Library that I am going to use
const webhookListener = require('./webhook_listener.js');
const { kat_owner_ID, kat_token, log_channel_ID } = require('../config.json');

const PREFIX = 'ck!';
const PREMIUM_CUTOFF = 10;

const bot = new eris.Client(kat_token);

const specialTrait = {
  name: 'Special Member',
  color: 0x6aa84f,
  hoist: true, //displays users with this trait in their section of the member list
};

async function updateMemberRoleForDonation(guild, member, donationAmount) {
  //if user donated more than $10, give them the premium trait
  if (guild && member && donationAmount >= PREMIUM_CUTOFF) {
    //obtains role or generates it
    let role = Array.from(guild.roles.values())
      .find(role => role.name === specialTrait.name);

    if (!role) {
      role = await guild.createRole(specialTrait);
    }

    //appends the role to the user with explanation
    return member.addRole(role.id, 'Donated Money');
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
      return msg.channel.createMessage('user not found here');
    }

    const amountIsValid = amount && !Number.isNaN(amount);
    if (!amountIsValid) {
      return msg.channel.createMessage('please provide valid amount');
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

    //ignores any message sent as DM
    //only accept commands issued in guild
    if (!msg.channel.guild) {
      return;
    }

    //ignores messages that don't start with the correct prefix
    if (!content.startsWith(PREFIX)) {
      return;
    }

    //extracts the name of the command
    const parts = content.split(' ').map(s => s.trim()).filter(s => s);
    const commandName = parts[0].substr(PREFIX.length);

    //obtains the requested command if one exists
    const command = commandForName[commandName];
    if (!command) {
      return;
    }

    //if command is only for the bot owner refuse to execute for other users
    const authorIsBotOwner = msg.author.id === kat_owner_ID;
    if (command.botOwnerOnly && !authorIsBotOwner) {
      return await msg.channel.createMessage('maybe if you ask nicer');
    }

    //separates command arguments from command prefix and name.
    const args = parts.slice(1);

    //executes the command.
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

function logDonation(member, donationAmount, paymentSource, paymentId, senderName, message, timestamp) {
  const isKnownMember = !!member;
  const memberName = isKnownMember ? `${member.username}#${member.discriminator}` : 'Unknown';
  const embedColor = isKnownMember ? 0x00ff00 : 0xff0000;

  const logMessage = {
    embed: {
      title: 'Donation received',
      color: embedColor,
      timestamp: timestamp,
      fields: [
        { name: 'Payment Source', value: paymentSource, inline: true },
        { name: 'Payment ID', value: paymentId, inline: true },
        { name: 'Sender', value: senderName, inline: true },
        { name: 'Donor Discord name', value: memberName, inline: true },
        { name: 'Donation amount', value: donationAmount.toString(), inline: true },
        { name: 'Message', value: message, inline: true },
      ],
    }
  }

  bot.createMessage(log_channel_ID, logMessage);
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

    return await Promise.all([
      updateMemberRoleForDonation(guild, guildMember, amount),
      logDonation(guildMember, amount, paymentSource, paymentId, senderName, message, timestamp),
    ]);
  } catch (err) {
    console.warn('Error updating donor role and logging donation');
    console.warn(err);
  }
}

webhookListener.on('donation', onDonation);
bot.connect();
