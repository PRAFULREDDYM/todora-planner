# 🖋️ Todora Planner

Todora is a premium, all-in-one productivity suite designed to help you **reclaim your rhythm**. It combines intelligent task management, focused execution, and creative note-taking into a single, cohesive experience. Built with a modern glassmorphic aesthetic and powered by robust cloud synchronization, Todora is your ultimate companion for personal and professional growth.

![Todora Banner](/logo.jpg)

## 🌟 Why Todora?

In a world full of distractions, Todora stands out by prioritizing **Focus** and **Simplicity**. Whether you're tracking daily habits, sketching out new ideas, or managing complex project deadlines, Todora provides the tools you need without the clutter you don't.

---

## ✨ Live Demo

🔗 **[todora-planner.vercel.app](https://todora-planner.vercel.app)**

---

## 🛠️ Key Features

### ✅ Intelligent Task Management
*   **Dynamic Recurrence**: Set tasks to repeat daily, weekly, on weekdays, or weekends.
*   **Smart Categorization**: Organise tasks into "Quick Win", "Deep Work", or "Creative".
*   **Priority Levels**: Visual cues for high, mid, and low priority tasks.
*   **Custom Reminders & Deadlines**: Set date/time reminders with a drum picker UI. Remove reminders anytime.
*   **Reorderable Lists**: Intuitive drag-and-drop task prioritization.
*   **Batch Operations**: Select multiple tasks for bulk delete or complete.

### 🎯 Focus & Flow
*   **Focus Mode**: A minimalist view that centers your attention on a single starred or top-priority task.
*   **Full Timer Controls**: Start → Pause → Resume → Reset. Time accumulates across pause/resume cycles until you reset or complete the task.
*   **Goal Duration**: Set target time for tasks and get notified when you hit your goal.

### 🎨 Creative Junction (Notes & Drawing)
*   **Rich Text Editor**: Capture thoughts with bold, italic, underline, lists, and links.
*   **Infinite Sketchpad**: Built-in drawing canvas with pen, highlighter, and eraser tools.
*   **Image Support**: Paste or attach images to your notes.
*   **PDF Export**: Convert notes into PDF documents with one click.
*   **Share & Copy**: Native share and clipboard copy.

### 📊 Insights & Analytics
*   **Streak Tracking**: Current streak and best streak counters.
*   **Performance Heatmap**: Consistency calendar showing daily completion rates.
*   **Engagement Trend**: 21/40-day bar chart of daily activity (responsive on mobile/desktop).
*   **Multi-View Calendar**: Day, Week, Month, and Year views with task dots and completion pills.

### 🔐 Authentication
*   **Email/Password**: Sign up with email confirmation.
*   **Google OAuth**: One-tap Google sign-in.
*   **Password Reset**: In-app password reset flow.
*   **Persistent Sessions**: Auto-refresh tokens with secure session handling.

### ☁️ Seamless Cloud Sync
*   **Supabase Integration**: Data synced across all devices in real-time.
*   **Row-Level Security**: Every table enforces `auth.uid() = user_id`.
*   **Local Migration**: Automatic migration from local storage to cloud on first sign-in.

### 📱 Progressive Web App (PWA)
*   **Installable**: Add to home screen for a native app experience.
*   **Service Worker**: Workbox-powered offline caching.
*   **Safe Area Support**: Optimized for iPhone Dynamic Island and notched devices.

### 🌓 Theme
*   **Dark / Light Mode**: Smooth crossfade theme transitions.
*   **Persistent Preference**: Theme choice synced to your profile.

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 | UI framework |
| Build | Vite 7 | Dev server, HMR, bundling |
| Animation | Framer Motion | Page transitions, drag-to-reorder |
| Backend | Supabase (PostgreSQL) | Auth, database, RLS |
| PDF | jsPDF | Client-side PDF export |
| PWA | vite-plugin-pwa | Service worker, installable app |
| Error Handling | react-error-boundary | Graceful crash recovery |
| Hosting | Vercel | CI/CD, CDN |

---

## 📦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm
*   A [Supabase](https://supabase.com) project

### 1. Clone & Install
```bash
git clone https://github.com/PRAFULREDDYM/todora-planner.git
cd todora-planner
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup
Run the included schema file in your **Supabase SQL Editor** (Database > SQL Editor):
```bash
# The full schema is in:
supabase-schema.sql
```
This creates all 4 tables (`profiles`, `tasks`, `notes`, `task_history`), RLS policies, indexes, and triggers.

### 4. Supabase Auth Configuration
1. Enable **Email** provider in Supabase Auth settings.
2. Enable **Google** provider and add your OAuth client ID/secret.
3. Add your app URL to **Redirect URLs** (e.g., `http://localhost:5173` and your production URL).

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

## 🏗️ Production Deployment

### Build
```bash
npm run build    # Output: dist/
npm run preview  # Preview production build locally
```

### Vercel Deployment
1.  Push your code to GitHub.
2.  Import the repository into [Vercel](https://vercel.com).
3.  Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
4.  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to **Project Settings > Environment Variables**.
5.  Add your Vercel URL to **Supabase Dashboard > Auth > URL Configuration > Redirect URLs**.

### Netlify Deployment
Same as Vercel, plus a `public/_redirects` file is already included for SPA routing.

---

## 📁 Project Structure

```
todora-planner/
├── public/
│   ├── _redirects          # Netlify SPA routing
│   ├── logo.jpg            # App logo
│   └── pwa-*.png           # PWA icons
├── src/
│   ├── App.jsx             # Core application
│   ├── main.jsx            # Entry point + ErrorBoundary
│   ├── index.css           # Global styles + safe areas
│   ├── components/
│   │   └── Auth.jsx        # Authentication UI
│   ├── contexts/
│   │   ├── AuthContext.jsx  # Auth provider
│   │   └── AuthContextInstance.js
│   ├── hooks/
│   │   ├── useAuth.js      # Auth hook
│   │   └── useSupabaseData.js  # CRUD hooks
│   └── lib/
│       └── supabase.js     # Supabase client
├── supabase-schema.sql     # Complete DB schema
├── vercel.json             # Vercel SPA rewrites
├── vite.config.js          # Vite + PWA config
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

*Built with ❤️ by Praful Reddy*
