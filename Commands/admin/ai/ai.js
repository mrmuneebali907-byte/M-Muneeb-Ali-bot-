/**
AI Chat Command - ChatGPT-style responses
*/

const APIs = require('../../utils/api');

module.exports = {
name: 'ai',
aliases: ['gpt', 'chatgpt', 'ask'],
category: 'ai',
description: 'Chat with AI (ChatGPT-style)',
usage: '.ai <question>',

async execute(sock, msg, args, extra) {
try {
  // 1. Check if the message is a reply to the bot
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const isReplyToBot = contextInfo?.participant?.includes(sock.user.id.split(':')[0]);
  
  // 2. Question nikalne ka full proof tareeka
  let question = args.join(' ');

  // Agar command khali hai lekin bot ko reply kiya gaya hai, toh wahi hamara sawal hai
  if (!question && isReplyToBot) {
    question = msg.message?.extendedTextMessage?.text || msg.message?.conversation;
  }

  // Agar phir bhi sawal nahi mila toh silent raho (taaki har message pe AI na bole)
  if (!question) return;

  // 3. Reaction start (🤔)
  await sock.sendMessage(extra.from, { react: { text: '🤔', key: msg.key } });  
  
  const response = await APIs.chatAIWithFallbacks(question);  
  const answer = response.response || response.msg || response.data?.msg || String(response);  
  
  // 4. Reaction End (✅)
  await sock.sendMessage(extra.from, { react: { text: '✅', key: msg.key } });  
  
  // Direct reply bhej do
  await extra.reply(answer);  
    
} catch (error) {  
  console.error("AI Error:", error);
  // Hum silent fail karenge taaki group mein faltu error messages na aayein
}

}
};
