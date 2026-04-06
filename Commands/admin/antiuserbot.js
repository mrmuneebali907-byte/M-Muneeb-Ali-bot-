/**
 * Anti User-Bot Command - Detect and remove accounts running automated scripts
 */

const database = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'antiuserbot',
  aliases: ['antiautobot', 'antibotuser'],
  category: 'admin',
  description: 'Auto-remove accounts running WhatsApp bot scripts (Xeon, Cheems, etc.)',
  usage: '.antiuserbot on/off',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const { from, isAdmin, isBotAdmin, isOwner, reply } = extra;

      if (!isAdmin && !isOwner) {
        return reply('❌ Only group admins can toggle the user-bot detector.');
      }

      const groupSettings = database.getGroupSettings(from);
      const sub = (args[0] || '').toLowerCase();

      if (!sub || (sub !== 'on' && sub !== 'off')) {
        const current = groupSettings.antiuserbot ? '✅ ON' : '❌ OFF';
        return reply(
          `🤖 *User-Bot Detector*\n\n` +
          `Current status: *${current}*\n\n` +
          `Usage:\n` +
          `• *${config.prefix}antiuserbot on* — Enable detection\n` +
          `• *${config.prefix}antiuserbot off* — Disable detection\n\n` +
          `When ON detects and removes:\n` +
          `• Accounts with Xeon / Cheems-Bot signatures\n` +
          `• Messages from known bot frameworks\n` +
          `• Automated mass-forward floods\n` +
          `• "Powered by" bot footer text\n\n` +
          `_Admins and owner are always exempt._`
        );
      }

      const enable = sub === 'on';

      if (enable === groupSettings.antiuserbot) {
        return reply(`🤖 User-bot detector is already *${enable ? 'ON' : 'OFF'}*.`);
      }

      database.updateGroupSettings(from, { antiuserbot: enable });

      if (enable) {
        await sock.sendMessage(from, {
          text:
            `✅ *User-Bot Detector: ON*\n\n` +
            `🤖 Auto-detection is now active in this group.\n\n` +
            `The bot will auto-remove any account whose messages contain:\n` +
            `• Bot framework signatures (Xeon, Cheems, ZairaMD, etc.)\n` +
            `• "Powered by" bot footers\n` +
            `• "Sent via bot" patterns\n` +
            `• Mass-forward floods (50+ forwards)\n\n` +
            `_Admins and owner are exempt from detection._`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `❌ *User-Bot Detector: OFF*\n\nDetection has been disabled for this group.`
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('[antiuserbot] Error:', error.message);
      await extra.reply('❌ Failed to toggle user-bot detector.');
    }
  }
};
