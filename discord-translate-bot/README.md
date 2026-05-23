# Discord Translate Bot (中文 ↔ English)

监听所有 channel 消息，自动检测语言，翻译成另一语言，threading reply。

## Setup (10 分钟)

### Step 1: 创建 Discord bot

1. 打开 https://discord.com/developers/applications
2. 点 **New Application** → 命名 `TeamTranslate`
3. 左侧 **Bot** → **Reset Token** → 复制 token 存好
4. **Privileged Gateway Intents** → 打开 **MESSAGE CONTENT INTENT**
5. 左侧 **OAuth2** → **URL Generator** → 勾 `bot` scope + `Send Messages` `Read Message History` permissions
6. 复制生成的 URL → 浏览器打开 → 邀请 bot 进你的 server

### Step 2: 本机跑（最简）

```bash
cd discord-translate-bot
cp .env.example .env
# 填 DISCORD_BOT_TOKEN + ANTHROPIC_API_KEY
npm install
npm start
```

跑起来后 Discord channel 里任何消息会被自动翻译。

### Step 3 (可选): 部署到 Railway (永久在线)

```bash
# 1. 装 Railway CLI
brew install railway

# 2. login + init
railway login
railway init

# 3. 加环境变量
railway variables set DISCORD_BOT_TOKEN=xxx ANTHROPIC_API_KEY=yyy

# 4. deploy
railway up
```

Railway 免费 tier 500 hours/月，hackathon 5 天 = 120 小时，绰绰有余。

## 行为细节

- **跳过翻译**：bot 消息 / 短于 5 字 / 以 `!` 或 `/` 开头（命令）/ 三个反引号开头（代码块）/ 纯 URL / 超过 2000 字
- **检测语言**：CJK 字符比例 > 30% → 中文，否则英文
- **缓存**：相同消息 → 缓存翻译，LRU 500 entries，省 token
- **回复格式**：`🇨🇳 译文` 或 `🇬🇧 译文`，threading reply 不刷屏
- **失败**：API 失败 silent fallback（不打断聊天），错误打 stderr

## 成本估算

Haiku 4.5: ~$1/M input + $5/M output。每条消息约 100 in + 100 out tokens = $0.0006。

每天 200 条消息 = $0.12/day。Hackathon 5 天 = **$0.60**。

## 调试

```bash
# 看 bot 是否登录成功
npm start
# 应该看到: ✓ logged in as TeamTranslate#1234

# 看具体翻译 log
DEBUG=1 npm start
```

## 已知限制

- 不能翻译图片 OCR / 文件附件
- 不识别第三种语言（粤语 / 日文 / 等）
- 多人同时打字时 reply 顺序可能错乱（无 transaction）
