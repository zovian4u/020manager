# ⚔️ Alliance Discord Bot - Step-by-Step Setup Guide

Follow this quick guide to set up your bot token, invite the bot to your server, and start sending scheduled announcements and interval reminders!

---

## Step 1: Create your Bot in the Discord Developer Portal (2 Minutes)

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and log in with your Discord account.
2. Click the **"New Application"** button in the top right.
3. Enter a Name for your bot (e.g. `Alliance Manager Bot` or `020 Alliance Bot`) and click **Create**.
4. Go to the **Bot** menu on the left sidebar:
   - Click **Reset Token** -> Copy your new **Bot Token** (This is your `DISCORD_TOKEN`).
   - Scroll down to **Privileged Gateway Intents** and enable these 3 switches:
     - ✅ **Presence Intent**
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
   - Click **Save Changes**.
5. Go to the **OAuth2** menu on the left sidebar:
   - Copy your **Client ID** (This is your `DISCORD_CLIENT_ID`).

---

## Step 2: Add Credentials to `.env.local`

Open your project's `.env.local` file located at `d:\Personal\020\.env.local` and add the following lines at the bottom:

```env
DISCORD_TOKEN=paste_your_bot_token_here
DISCORD_CLIENT_ID=paste_your_client_id_here
DISCORD_GUILD_ID=paste_your_discord_server_id_here
```

> 💡 **How to get your Server (Guild) ID**:
> In Discord, go to User Settings -> Advanced -> turn on **Developer Mode**. Then right-click your Discord Server icon on the left sidebar and click **Copy Server ID**.

---

## Step 3: Invite the Bot to your Discord Server

1. In the Discord Developer Portal, go to **OAuth2** -> **URL Generator** on the left menu.
2. Under **Scopes**, check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, check:
   - ✅ `Administrator` *(or explicitly check Send Messages, Embed Links, Read Message History, Mention Everyone, Use Slash Commands)*.
4. Copy the **Generated URL** at the bottom of the page.
5. Paste the URL into your web browser, select your Alliance Discord Server, and click **Authorize**!

---

## Step 4: Register Commands & Start the Bot

Open a command prompt or terminal in your project directory `d:\Personal\020`:

### 1. Register Slash Commands with Discord
Run:
```bash
npm run bot:register
```
*You will see: `✅ Successfully registered 1 slash commands for Server ID...`*

### 2. Start the Bot Daemon
Run:
```bash
npm run bot
```
*You will see: `🤖 Alliance Discord Bot is ONLINE as Alliance Manager Bot#1234`*

---

## Step 5: How R4 Leaders Use the Bot in Discord

Once the bot is online, any member with **Administrator** or **R4 / R5 / Leader** permissions can use the commands:

### 📢 1. Custom Channel Announcement & Scheduler (`/announce create`)
- Type `/announce create` in any channel.
- A **Channel Selector Dropdown** will appear: pick the target channel (e.g. `#alliance-announcements`, `#desert-storm`, `#war-room`).
- An interactive **Pop-up Modal** will open. Fill in:
  - **Title**: e.g., `Desert Storm Match 1`
  - **Body**: Detailed strategy notes or instructions
  - **Schedule**: `now` (immediate), `30m` (every 30 mins), `2h`, or `0 18 * * 2` (cron format)
  - **Role Ping**: `everyone`, `here`, or `none`
  - **Theme**: `gold`, `urgent`, `warning`, `info`
- The bot posts the rich embed directly to the target channel with live relative countdowns (`<t:TIMESTAMP:R>`) and clickable **`✅ Attending`** / **`❌ Absent`** RSVP buttons!

### ⚡ 2. Quick Alliance Presets (`/announce preset`)
- Type `/announce preset`
- Pick built-in alliance events:
  - 🌵 **Desert Storm** (30m & 5m match alerts)
  - ⛈️ **Canyon Storm** (15m readiness alert)
  - 💡 **Tech Donation & Daily Reset**
  - 🛡️ **VS Warmup / Warzone Duel**
  - ⚔️ **Capital War / Marshal Spawns**

### 📜 3. View & Manage Active Reminders (`/announce list` and `/announce delete`)
- Type `/announce list` to see all active scheduled reminders, target channels, and live RSVP check-in counts.
- Type `/announce delete id:ann_1771343505` to cancel any reminder.
