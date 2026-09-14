# MicroStudy — Your Daily Learning Path

MicroStudy turns study material into a daily learning path: you upload your notes, tell it how many days you have until your exam, and the app automatically splits the material into sequential steps with fresh AI-generated questions per session. Duolingo-style structure (streaks, XP, daily steps), with the visual polish and interaction feel of Apple (fluid spring animations instead of rigid CSS transitions).

🔗 Live: [microstudy.lovable.app](https://microstudy.lovable.app)
🛠️ Editor: [Lovable project](https://lovable.dev/projects/5b0b2e64-484a-4a5d-80c2-9f386ebe6339)

> Built with [Lovable](https://lovable.dev). Every change made in the Lovable editor is committed straight to this repository, and pushes to `main` on GitHub sync back into Lovable.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture & folder structure](#architecture--folder-structure)
- [Database schema (Supabase)](#database-schema-supabase)
- [AI integration](#ai-integration)
- [Push notifications](#push-notifications)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Known open issues](#known-open-issues)

---

## Features

### 🧭 Learning path (core feature)
- User uploads study material (text, PDF, Word `.docx`, or a photo) and specifies how many days until the exam.
- An AI model (via the Lovable AI Gateway, Gemini 3.5 Flash) splits the material into exactly as many learning steps as there are days, increasing in difficulty, tailored to education level, goal, and available daily time (from the user's profile).
- Each day automatically unlocks the next step (`unlock_date`).
- Every step generates fresh multiple-choice and/or open questions — never duplicated, and strictly scoped to that step's material.
- Open questions are graded by AI (fair but lenient), with feedback in Dutch (the app's UI language).
- Completing a step awards XP (10 XP per correct answer) and updates the streak.

### 🔥 Streaks & XP
- Daily streak counter that only continues on consecutive active days.
- XP accumulates per correctly answered question and per completed step.

### 👥 Groups & leaderboard
- Users can create groups and get a unique invite code.
- Others can join via a `join_group_by_code` RPC function.
- Leaderboard per group, sorted by XP, with each member's streak shown.

### 🔔 Notifications (email + push)
- A server-side cron job (`/api/public/push-check`) decides per user, per day, whether and which push notification to send — via the same AI gateway (`decidePush`), based on context: open steps, upcoming exam date, streak, leaderboard position, inactivity.
- Per-category preferences: `notify_study`, `notify_streak`, `notify_leaderboard`, `notify_inactivity` (configurable via `NotifyPrefsPanel`).
- Maximum of 1 notification per user per day.
- After 14 days of inactivity: one final notification, after which the app automatically stops sending (`push_stopped`).
- Delivered via Firebase Cloud Messaging (web push), with automatic deactivation of expired device tokens.

### 🔐 Authentication
- Email + password via Supabase Auth (deliberately no "Continue with Google").
- Password recovery flow (`/wachtwoord-herstellen`).

### 🎨 Visual & interaction design (Apple-style)
- Immediate feedback on touch/click, no artificial delay (`Pressable` component).
- Spring animations (via `motion`/Framer Motion) instead of fixed CSS transitions: critically damped by default, with light bounce only on drag/swipe interactions with momentum.
- Animations are interruptible/reversible at any time without "jumping".
- Subtle translucency/blur for overlays (e.g. the nav bar) instead of flat colors.
- System font, tight letter/line spacing for large headings (streak counter, XP), roomier line spacing for body text.
- Respects `prefers-reduced-motion` (cross-fade instead of spring/slide) and `prefers-contrast`.

### 📱 PWA
- Installable as a Progressive Web App (`vite-plugin-pwa`), with its own icon set (`public/icons/`) and Apple-specific meta tags (`apple-mobile-web-app-capable`, etc.).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19) + [TanStack Router](https://tanstack.com/router) (file-based routing) |
| Data fetching / state | [TanStack Query](https://tanstack.com/query) |
| Server functions | `createServerFn` from `@tanstack/react-start` (type-safe RPC to the server) |
| Database & auth | [Supabase](https://supabase.com) (Postgres + Auth + RLS) |
| AI | Lovable AI Gateway → `google/gemini-3.5-flash` (JSON mode) |
| Push notifications | Firebase Cloud Messaging (web push) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| Animation | `motion` (Framer Motion) |
| Forms & validation | `react-hook-form` + `zod` |
| Build | Vite 8, Bun (lockfile: `bun.lock`) |
| Language | TypeScript |
| Linting/formatting | ESLint 9 (flat config) + Prettier |
| PWA | `vite-plugin-pwa` |

---


