/**
 * NSFW Toggle Command - Enable/disable NSFW content filter in groups
 */

const database = require('../../database');
const config = require('../../config');

module.exports = {
  name: 'nsfw',
  aliases: ['nsfwtoggle', 'antinsfw'],
  category: 'admin',
  description: 'Toggle NSFW content filter (auto-delete + warn system)',
  usage: '.nsfw on/off',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const { from, isAdmin, isBotAdmin, isOwner, reply } = extra;

      if (!isAdmin && !isOwner) {
        return reply('❌ Only group admins can toggle the NSFW filter.');
      }

      const groupSettings = database.getGroupSettings(from);
      const sub = (args[0] || '').toLowerCase();

      if (!sub || (sub !== 'on' && sub !== 'off')) {
        const current = groupSettings.nsfw ? '✅ ON' : '❌ OFF';
        return reply(
          `🛡️ *NSFW Content Filter*\n\n` +
          `Current status: *${current}*\n\n` +
          `Usage:\n` +
          `• *${config.prefix}nsfw on* — Enable NSFW filter\n` +
          `• *${config.prefix}nsfw off* — Disable NSFW filter\n\n` +
          `When ON:\n` +
          `• NSFW images/videos/stickers are auto-deleted\n` +
          `• Adult links & bad words are flagged\n` +
          `• 3 warnings → user is removed`
        );
      }

      const enable = sub === 'on';

      if (enable === groupSettings.nsfw) {
        return reply(`🛡️ NSFW filter is already *${enable ? 'ON' : 'OFF'}*.`);
      }

      database.updateGroupSettings(from, { nsfw: enable });

      if (enable) {
        await sock.sendMessage(from, {
          text:
            `✅ *NSFW Content Filter: ON*\n\n` +
            `🛡️ The filter is now active in this group.\n\n` +
            `Rules:\n` +
            `• NSFW images, videos & stickers → deleted\n` +
            `• Adult text & links → deleted\n` +
            `• ⚠️ Warning 1/3\n` +
            `• ⚠️⚠️ Warning 2/3\n` +
            `• 🚫 Warning 3/3 → Removed from group\n\n` +
            `_Admins and owner are exempt._`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `❌ *NSFW Content Filter: OFF*\n\nThe filter has been disabled for this group.`
        }, { quoted: msg });
      }

    } catch (error) {
      console.error('[nsfw] Error:', error.message);
      await extra.reply('❌ Failed to toggle NSFW filter.');
    }
  }
};
