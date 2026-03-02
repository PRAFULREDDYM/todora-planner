# 🖋️ Todora Planner

Todora is a premium, all-in-one productivity suite designed to help you **reclaim your rhythm**. It combines intelligent task management, focused execution, and creative note-taking into a single, cohesive experience. Built with a modern glassmorphic aesthetic and powered by robust cloud synchronization, Todora is your ultimate companion for personal and professional growth.

![Todora Banner](/logo.jpg)

## 🌟 Why Todora?

In a world full of distractions, Todora stands out by prioritizing **Focus** and **Simplicity**. Whether you're tracking daily habits, sketching out new ideas, or managing complex project deadlines, Todora provides the tools you need without the clutter you don't.

---

## 🛠️ Key Features

### ✅ Intelligent Task Management
*   **Dynamic Recurrence**: Set tasks to repeat daily, weekly, on weekdays, or weekends.
*   **Smart Categorization**: Organise tasks into categories like "Quick Win", "Deep Work", or "Personal".
*   **Priority Levels**: Visual cues for high, mid, and low priority tasks.
*   **Custom Reminders & Deadlines**: Never miss a beat with integrated time tracking.
*   **Reorderable Lists**: Intuitive drag-and-drop task prioritization.

### 🎯 Focus & Flow
*   **Focus Mode**: A dedicated minimalist view that centers your attention on a single "Starred" or top-priority task.
*   **Integrated Timer**: Track exactly how much time you spend on each task with pause, resume, and reset controls.

### 🎨 Creative Junction (Notes & Drawing)
*   **Rich Text Editor**: Capture thoughts with full formatting support.
*   **Infinite Sketchpad**: A built-in drawing canvas with eraser mode and one-click clearing.
*   **Image Support**: Attach images to your notes for visual context.
*   **PDF Export**: Convert your notes into professional PDF documents instantly.

### 📊 Insights & Analytics
*   **Visual History**: Track your daily wins through an interactive calendar.
*   **Performance Metrics**: Analyze your productivity trends over time.
*   **Multi-View Calendar**: Switch between Day, Week, Month, and Year views to see the big picture.

### ☁️ Seamless Cloud Sync
*   **Supabase Integration**: Your data is securely synced across all your devices in real-time.
*   **Local Migration**: Upgrading from a local-only setup? Todora handles the migration to the cloud automatically.

### 📱 PWA (Progressive Web App)
*   **Installable**: Add Todora to your home screen for a native app experience.
*   **Offline Ready**: Access your tasks and notes even without an internet connection.

---

## 🚀 Tech Stack

*   **Frontend**: React 19, Vite
*   **Animations**: Framer Motion
*   **Database & Auth**: Supabase
*   **Styling**: Vanilla CSS (Modern CSS Variables & Glassmorphism)
*   **PDF Generation**: jsPDF
*   **PWA**: `vite-plugin-pwa`

---

## 📦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Supabase Project

### 1. Installation
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

### 3. Supabase Schema Setup (SQL)
Run the following commands in your Supabase SQL Editor to create the required tables:

#### Profiles Table
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  user_name text,
  is_dark boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

#### Tasks Table
```sql
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  description text,
  recurrence text default 'once',
  goal_min integer default 0,
  reminder_at text,
  priority text default 'mid',
  category text default 'Quick Win',
  deadline text,
  image text,
  sort_order integer default 0,
  is_starred boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

#### Notes Table
```sql
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  title text,
  content text,
  drawing text,
  image text,
  note_date text,
  is_starred boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

#### Task History Table
```sql
create table task_history (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade,
  task_id uuid,
  task_name text,
  completion_date text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);
```

---

## 🏗️ Production Build & Deployment

### Build
```bash
npm run build
```

### Vercel Deployment
1.  Push your code to GitHub.
2.  Import the repository into Vercel.
3.  Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to **Project Settings > Environment Variables**.
4.  Add your Vercel URL to your **Supabase Dashboard > Auth > URL Configuration > Redirect URLs**.

---

## 🤝 How to Contribute

We welcome contributions! If you'd like to improve Todora, feel free to:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---
*Created with ❤️ by the Todora Team.*
