const eris = require('eris');
const { kat_owner_ID, kat_token } = require('../config.json');

const PREFIX = 'pb!';
const PREMIUM_CUTOFF = 10;

const bot = new eris.Client(kat_token);

const specialTrait = {
  name: 'Special Member',
  color: 0x6aa84f,
  hoist: true, //displays users with this trait in their section of the member list
};

async function updateMemberRoleForDonation(guild, member, donationAmount) {
  //if the user donated more than $10, give them the specialTrait.
  if (guild && member && donationAmount >= PREMIUM_CUTOFF) {
    //obtains the role or creates it.
    let role = Array.from(guild.roles.values())
      .find(role => role.name === specialTrait.name);

    if (!role) {
      role = await guild.createRole(specialTrait);
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

    //handles invalid args
    //1. No mention or invalid mention.
    //2. No amount or invalid amount.

    return Promise.all([
      msg.channel.createMessage(`${mention} paid $${amount.toFixed(2)}`),
      updateMemberRoleForDonation(guild, member, amount),
    ]);
  },
};

bot.on('messageCreate', async (msg) => {
  try {
    const content = msg.content;

    //ignores messages sent as DMs
    //Kathy will only accept commands issued in a guild
    if (!msg.channel.guild) {
      return;
    }

    //ignores messages that don't start with a proper prefix
    if (!content.startsWith(PREFIX)) {
      return;
    }

    //extracts the name of the command
    const parts = content.split(' ').map(s => s.trim()).filter(s => s);
    const commandName = parts[0].substr(PREFIX.length);

    //obtains the existing requested command
    const command = commandForName[commandName];
    if (!command) {
      return;
    }

    //if command is only for Kathys owner refuses to execute for any other user
    const authorIsBotOwner = msg.author.id === kat_owner_ID;
    if (command.botOwnerOnly && !authorIsBotOwner) {
      return await msg.channel.createMessage('Nope, not today!');
    }

    //separates the command args from command prefix and name
    const args = parts.slice(1);

    //execute the command
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
