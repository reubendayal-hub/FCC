# FCC Nets · Karlebo

Nets booking app for **Fredensborg Cricket Club**.

Built with React + Vite. Deployable to Vercel in minutes.

---

## Features
- 📅 View upcoming & past nets sessions
- ➕ Add / join sessions by tapping player names
- 🔐 PIN-based login with role system (Super Admin → Admin → Captain → Vice Captain → Member)
- 👑 Captain & Vice Captain roles for senior teams only (Div 2, Div 3, Div 4, Women's)
- 📲 WhatsApp reminder pre-fill for tomorrow's sessions
- 📅 Save to Calendar (.ics download)
- ⚙️ Member management with team assignments

---

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

---

## Deploy to Vercel (recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Leave all settings as default — Vercel auto-detects Vite
5. Click **Deploy**

You'll get a live URL like `fcc-nets.vercel.app` — share it in the WhatsApp group!

---

## First-time setup after deploy

1. Open the app and find **Reuben Dayal** in the member list
2. Set your PIN — you are pre-configured as **Super Admin**
3. Go to **⚙️ Members** tab to assign teams and roles to other members
4. Share the URL with the club!

---

## Tech stack
- [React 18](https://react.dev)
- [Vite 5](https://vitejs.dev)
- Storage: `localStorage` (data persists per device — shared via the storage API)
