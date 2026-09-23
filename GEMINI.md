# 020 - Last War Alliance Manager: Project Context

This file is auto-loaded by Antigravity (AGY) at the start of every conversation.
Keep this file updated whenever new features are added.

---

## What This Project Is

020 is an alliance management platform for the mobile game Last War: Survival. It helps alliance leaders (R4/R5) coordinate events, send announcements, track RSVPs, and manage members across two surfaces:

1. A Next.js web dashboard - feature-rich web app for alliance management tools
2. A Discord bot - sends scheduled announcements, RSVP embeds, and event reminders in the alliance Discord server

---

## Tech Stack

- Web Framework: Next.js 16 (App Router, TypeScript)
- Styling: Tailwind CSS v4
- Auth: StackFrame (@stackframe/stack)
- Database: Supabase (PostgreSQL + RLS)
- Discord Bot: discord.js v14
- Scheduling: node-cron v4
- Deployment: Vercel (web app), 24/7 server or Railway (bot)
- Runtime: Node.js

Key env vars (in .env.local):
- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
- DISCORD_TOKEN / DISCORD_CLIENT_ID / DISCORD_GUILD_ID
- NEXT_PUBLIC_STACK_PROJECT_ID / NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY / STACK_SECRET_SERVER_KEY

npm scripts:
- npm run dev - Next.js dev server
- npm run bot - Start Discord bot (node bot/index.js)
- npm run bot:register - Register slash commands with Discord API

---

## Project Structure

d:\Personal\020\
- app/                        - Next.js App Router pages and components
  - page.tsx                  - Landing/home page
  - layout.tsx                - Root layout
  - globals.css               - Global styles
  - MenuBar.tsx               - Main navigation component (very large, ~49KB)
  - MainContent.tsx           - Main content wrapper
  - UserStatusButton.tsx      - User auth status button
  - hub/                      - Alliance Hub dashboard
  - desert-storm/             - Desert Storm event management
  - canyon-storm/             - Canyon Storm event management
  - alliance-duel/            - Alliance Duel tracking
  - season-6/                 - Season 6 specific content
  - calculators/              - In-game calculators
  - command-center/           - R4/R5 command center
  - tactical-dashboard/       - Tactical overview board
  - growth/                   - Member growth tracking
  - guide/                    - Last War game guides
  - train/                    - Training management
  - settings/                 - User/alliance settings
  - signin/ and signup/       - Auth pages
  - about/ and contact/       - Info pages
  - handler/                  - API/event handlers
  - welcome/                  - New member welcome page
  - api/                      - Next.js API routes
- bot/                        - Discord Bot
  - index.js                  - Main bot entry point (~493 lines)
  - deploy-commands.js        - Deploy commands helper
  - register-commands.js      - Register slash commands with Discord
  - SETUP_GUIDE.md            - Bot setup instructions
  - commands/
    - announce.js             - isAllianceLeader permission check
  - services/
    - database.js             - Supabase + local JSON persistence
    - scheduler.js            - Cron/interval job engine (node-cron)
    - timezone.js             - Per-guild timezone management
    - weeklyReset.js          - Auto-clear DS and CS signups every Sunday 00:00
  - data/
    - announcements.json      - Local fallback data store
- lib/                        - Shared Next.js utilities/helpers
- public/                     - Static assets
- GEMINI.md                   - THIS FILE (auto-loaded project context)
- .env.local                  - All secrets/env vars
- package.json                - Project dependencies and scripts
- create_alliance_bot_table.sql - Supabase table: alliance_announcements
- create_season6_table.sql    - Supabase table: season_6 data
- fix_rls.sql                 - Supabase RLS policy fixes

---

## Discord Bot - Deep Dive

### Entry Point: bot/index.js
- Bootstraps discord.js Client with Guilds + GuildMembers intents
- Runs a keep-alive HTTP server on port 3000 for 24/7 hosting
- Handles all slash command interactions and modal/button callbacks
- Imports: isAllianceLeader, initScheduler, scheduleItem, cancelScheduledJob, saveAnnouncement, loadAnnouncements, deleteAnnouncement, matchId, getGuildTimezone, setGuildTimezone, parseLocalTime, initWeeklyReset

### Slash Commands

#### /announce create
1. Shows a channel selector dropdown (lists all text channels in the server)
2. After channel pick shows a modal popup with fields:
   - Title: Announcement title
   - Body: Main text/strategy notes
   - Schedule: now, in 30m, in 2h, 18:00, tomorrow 18:00, 18:00 10082026, or cron 0 18 * * 2
   - Role Ping: everyone, here, or none
   - Theme: gold, urgent, warning, info
3. Posts a rich Discord embed to the target channel with:
   - Live Discord relative timestamps
   - Attending / Absent RSVP buttons

#### /announce preset
Quick-fire built-in presets for common Last War events:
- Desert Storm (30m and 5m match alerts)
- Canyon Storm (15m readiness alert)
- Tech Donation and Daily Reset
- VS Warmup / Warzone Duel
- Capital War / Marshal Spawns

#### /announce list
- Shows all active scheduled reminders, target channels, and live RSVP counts

#### /announce delete id:<ann_id>
- Cancels and removes a scheduled reminder by ID

#### Timezone commands
- Set per-guild timezone so time inputs (like 18:00) resolve correctly for the alliance region

### Weekly Auto-Reset (bot/services/weeklyReset.js)
- Fires every Sunday at 00:00 in the guild's saved timezone (from /timezone command)
- Clears Desert Storm signups: ds_choice, ds_team, ds_signup_time, team_assignment
- Clears Canyon Storm signups: cs_choice, cs_team, cs_team_assignment, cs_signup_time
- Writes an entry to audit_logs table
- Posts a rich embed announcement to channel 1294462126634696789
- Signup windows (registration_open / cs_registration_open) are NOT changed - members can re-register immediately
- Functions: initWeeklyReset(client), runWeeklyReset(client) [also exported for manual triggers], stopWeeklyReset()

### Time Parsing (parseUserTime in bot/index.js)
Supported formats:
- now or 0 - immediately
- in 30m / in 30 minutes - relative minutes
- in 2h / in 2 hours - relative hours
- in 3 days - relative days
- tomorrow - next day same time
- tomorrow 18:00 - next day at specific time
- 18:00 - today at 18:00 (or tomorrow if passed)
- 18:00 10082026 - specific date (DDMMYYYY)
- 0 18 * * 2 - raw cron expression

### ID System
- Announcement IDs: zero-padded numeric strings like 001, 002 (stored as ann_001 in some contexts)
- matchId() in database.js does flexible matching: 1, 001, ann_001 all match

### Database (bot/services/database.js)
- Dual persistence: Supabase (source of truth) + local bot/data/announcements.json (fallback)
- If Supabase unavailable, falls back to local JSON file seamlessly
- Supabase table: alliance_announcements
  - Columns: id, guild_id, title, content, target_channel_id, type, execute_at, interval_minutes, cron_expression, role_ping, image_url, created_by, created_at, active
- Functions: loadAnnouncements(guildId), saveAnnouncement(obj), saveAnnouncements(arr), deleteAnnouncement(id, guildId)

### Scheduler (bot/services/scheduler.js)
- Wraps node-cron for scheduling announcement jobs
- Functions: initScheduler(), scheduleItem(item, callback), cancelScheduledJob(id)

### Timezone (bot/services/timezone.js)
- Functions: getGuildTimezone(guildId), setGuildTimezone(guildId, tz), parseLocalTime(timeStr, guildId)

---

## Web App - Pages Summary

- /                  - Landing/home page
- /hub               - Alliance Hub - main dashboard
- /desert-storm      - Desert Storm event planner and tracker (reads ds_choice, ds_team, ds_signup_time from members table)
- /canyon-storm      - Canyon Storm event management (reads cs_choice, cs_team, cs_team_assignment, cs_signup_time)
- /alliance-duel     - Alliance Duel match tracking
- /season-6          - Season 6 content and leaderboard
- /calculators       - In-game resource/troop calculators
- /command-center    - R4/R5 command center
  - CLEAR ALL DATA (DS): UPDATE members SET ds_choice=null, ds_team=null, ds_signup_time=null, team_assignment=null
  - CLEAR ALL DATA (CS): UPDATE members SET cs_choice=null, cs_team=null, cs_team_assignment=null, cs_signup_time=null
  - OPEN/CLOSE signups: UPDATE settings SET registration_open / cs_registration_open WHERE id=1
- /tactical-dashboard - Strategic/tactical overview
- /growth            - Member growth and progress tracking
- /guide             - Last War game guides and tips
- /train             - Training queue/management
- /settings          - User/alliance settings
- /signin and /signup - Auth (StackFrame)
- /about             - About the 020 alliance
- /contact           - Contact page
- /welcome           - New member onboarding

---

## Supabase Tables

- alliance_announcements - Discord bot scheduled announcements and RSVPs
- members                - All alliance members, their roles, and event signup fields
- settings               - Global settings (id=1): registration_open, cs_registration_open
- audit_logs             - Action log: user_id, username, action, details (JSONB)
- growth_snapshots       - Weekly power snapshots per member
- (season 6 table)       - Season 6 event/leaderboard data

RLS (Row Level Security) is enabled. fix_rls.sql patches any policy issues.

---

## Update Log

Keep this updated whenever a significant feature is added or changed.

| Date | Change |
|------|--------|
| 2026-09-22 | Initial GEMINI.md created. Documented full project: Next.js web app + Discord bot for Last War: Survival alliance management. |
| 2026-09-22 | Added bot/services/weeklyReset.js - auto-clears DS and CS signup fields every Sunday 00:00 (guild timezone) and posts Discord announcement to channel 1294462126634696789. Hooked into bot/index.js ClientReady event. |