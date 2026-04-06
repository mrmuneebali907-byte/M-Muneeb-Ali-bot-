const fs = require('fs');
const path = require('path');

const BANNED_PATH = path.join(__dirname, '../../data/banned.json');

function readBanned() {
  try {
    if (!fs.existsSync(BANNED_PATH)) {
      fs.mkdirSync(path.dirname(BANNED_PATH), { recursive: true });
      fs.writeFileSync(BANNED_PATH, '[]');
    }
    return JSON.parse(fs.readFileSync(BANNED_PATH, 'utf8'));
  } catch { return []; }
}

function writeBanned(list) {
  try { fs.writeFileSync(BANNED_PATH, JSON.stringify(list, null, 2)); }
  catch (e) { console.error('[ban] Error writing banned list:', e.message); }
}

module.exports = {
  name: 'ban',
  aliases: ['blacklist'],
  category: 'admin',
  description: 'Ban a user from using bot commands',
  usage: '.ban @user or reply to user',
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const { from, sender, isAdmin, isBotAdmin, isOwner, reply } = extra;

      if (!isBotAdmin) return reply('❌ Please make the bot an admin to use .ban');
      if (!isAdmin && !isOwner) return reply('❌ Only group admins can use .ban');

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      let userToBan = null;

      if (ctx?.mentionedJid?.length > 0) {
        userToBan = ctx.mentionedJid[0];
      } else if (ctx?.participant && ctx.stanzaId && ctx.quotedMessage) {
        userToBan = ctx.participant;
      }

      if (!userToBan) {
        return reply('❌ Please mention or reply to the user to ban!\n\nExample: .ban @user');
      }

      try {
        const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        if (userToBan === botId) return reply('❌ You cannot ban the bot itself!');
      } catch {}

      const bannedUsers = readBanned();
      if (bannedUsers.includes(userToBan)) {
        return reply(`⚠️ @${userToBan.split('@')[0]} is already banned!\n\nUse .unban to remove the ban.`);
      }

      bannedUsers.push(userToBan);
      writeBanned(bannedUsers);

      const adminName = msg.pushName || 'Admin';
      await sock.sendMessage(from, {
        text: `╭━━━❰ ⚠️ 𝘽𝘼𝙉 𝘼𝘾𝙏𝙄𝙊𝙉 ❱━━━╮\n┃\n┃ 👑 𝘼𝙙𝙢𝙞𝙣 : ${adminName}\n┃ 🔒 𝘽𝙖𝙣𝙣𝙚𝙙 : @${userToBan.split('@')[0]}\n┃ ⏰ 𝙏𝙞𝙢𝙚 : ${new Date().toLocaleTimeString()}\n┃\n┃ This user can no longer use bot commands.\n╰━━━━━━━━━━━━━━━━━━╯`,
        mentions: [userToBan]
      }, { quoted: msg });

    } catch (error) {
      console.error('[ban] Error:', error.message);
      await extra.reply(`❌ Failed to ban user: ${error.message}`);
    }
  }
};
