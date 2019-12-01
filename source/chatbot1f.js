const eris = require('eris');
const webhookListener = require('./webhook_listener_step6.js');
const { kat_owner_ID, kat_token } = require('../config.json');

const PREFIX = 'ck!';
const PREMIUM_CUTOFF = 10;

const bot = new eris.Client(BOT_TOKEN);

const premiumRole = {
  name: 'Special Member',
  color: 0x6aa84f,
  hoist: true, //displays users with this trait in their section of the member list
};

async function updateMemberRoleForDonation(guild, member, donationAmount) {
   //if the user donated more than $10, give them the specialTrait
  if (guild && member && donationAmount >= PREMIUM_CUTOFF) {
    //obtains the role or creates it
    let role = Array.from(guild.roles.values())
      .find(role => role.name === premiumRole.name);

    if (!role) {
      role = await guild.createRole(premiumRole);
    }

    //adds the role to the user with explanation for the audit log
	
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

    //handles invalid args
    //1. No mention or invalid mention
    //2. No amount or invalid amount
	
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

    //obtains existing requested command
    const command = commandForName[commandName];
    if (!command) {
      return;
    }

    //refuses to connect if the command is reserved for the owner
    const authorIsBotOwner = msg.author.id === BOT_OWNER_ID;
    if (command.botOwnerOnly && !authorIsBotOwner) {
      return await msg.channel.createMessage('Hey, only my owner can issue that command!');
    }

    //separates the command args from command prefix and name
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

bot.connect();
