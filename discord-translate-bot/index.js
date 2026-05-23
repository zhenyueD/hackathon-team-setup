// Discord auto-translate bot — 中文/英文双向自动翻译
// 监听所有 channel，检测主要语言后翻译成另一语言，threading reply

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import Anthropic from '@anthropic-ai/sdk';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
const MIN_LENGTH = Number(process.env.MIN_LENGTH || 5);

if (!DISCORD_BOT_TOKEN || !ANTHROPIC_API_KEY) {
  console.error('FATAL: DISCORD_BOT_TOKEN and ANTHROPIC_API_KEY required in env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const ai = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Simple LRU cache: same message → same translation (saves cost)
const cache = new Map();
const CACHE_MAX = 500;

function detectLanguage(text) {
  const cjkChars = (text.match(/[一-鿿]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars === 0) return 'unknown';
  return cjkChars / totalChars > 0.3 ? 'zh' : 'en';
}

function shouldSkip(msg) {
  if (msg.author.bot) return 'bot';
  if (!msg.content || msg.content.length < MIN_LENGTH) return 'too-short';
  if (msg.content.startsWith('!') || msg.content.startsWith('/')) return 'command';
  if (msg.content.startsWith('```')) return 'code-block';
  if (/^https?:\/\/\S+$/.test(msg.content.trim())) return 'pure-url';
  if (msg.content.length > 2000) return 'too-long';
  return null;
}

async function translate(text, targetLang) {
  const cacheKey = `${targetLang}:${text}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const targetName = targetLang === 'zh' ? '简体中文' : 'English';
  const result = await ai.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Translate the following message to ${targetName}. Output ONLY the translation, no preamble, no quotes, no explanation. Preserve code, URLs, @mentions, and emoji as-is.\n\n---\n${text}\n---`,
    }],
  });

  const translation = result.content[0]?.text?.trim() || '(translation failed)';

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, translation);

  return translation;
}

client.on('messageCreate', async (msg) => {
  const skip = shouldSkip(msg);
  if (skip) return;

  const sourceLang = detectLanguage(msg.content);
  if (sourceLang === 'unknown') return;
  const targetLang = sourceLang === 'zh' ? 'en' : 'zh';

  try {
    const translation = await translate(msg.content, targetLang);
    if (translation === msg.content.trim()) return;

    const flag = targetLang === 'zh' ? '🇨🇳' : '🇬🇧';
    await msg.reply({
      content: `${flag} ${translation}`,
      allowedMentions: { repliedUser: false, parse: [] },
    });
  } catch (err) {
    console.error('translate error:', err?.message || err);
  }
});

client.once('clientReady', () => {
  console.log(`✓ logged in as ${client.user.tag}`);
});

client.on('error', (err) => console.error('client error:', err?.message || err));

client.login(DISCORD_BOT_TOKEN);
