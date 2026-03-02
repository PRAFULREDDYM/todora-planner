# Todora Planner

Todora is a premium daily momentum planner and habit tracker designed to help you reclaim your rhythm and focus on what matters most. Built with a modern, glassmorphic aesthetic, it offers a seamless experience across desktop and mobile devices.

![Todora Logo](/logo.jpg)

## Features

- **Dynamic Task Management**: Create, edit, and organize tasks with ease. Support for recurring tasks (daily, weekly, weekdays, weekends).
- **Focus Mode**: A minimalist interface to help you concentrate on a single task at a time.
- **Note-Taking with Drawing**: Integrated notes editor with rich text support and a drawing canvas for quick sketches.
- **Habit Tracking**: Monitor your progress and build consistent routines.
- **Premium Design**: Sleek dark mode, smooth animations (powered by Framer Motion), and a responsive layout.
- **Secure Authentication**: Built-in support for email/password and Google Sign-In via Supabase.
- **PWA Support**: Install Todora as an app on your device for offline access and a native-like experience.

## Tech Stack

- **Frontend**: React 19, Vite, Framer Motion
- **Backend & Auth**: Supabase
- **Styling**: Vanilla CSS with modern CSS features
- **PWA**: `vite-plugin-pwa`

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/todora-planner.git
   cd todora-planner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

Todora is designed to be easily deployed on **Vercel**.

### Deploy to Vercel

1. **Push to GitHub/GitLab/Bitbucket**:
   Ensure your code is pushed to a remote repository.

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and import your repository.
   - Vercel will automatically detect the Vite setup.

3. **Configure Environment Variables**:
   In the Vercel project settings, add the following environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

4. **Deploy**:
   Click **Deploy**. Vercel will build the project and provide you with a live URL.

### Manual Build

If you prefer to build manually:
```bash
npm run build
```
The production-ready files will be in the `dist/` directory.

## License

This project is licensed under the MIT License.
