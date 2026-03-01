# City - Event Management & Ticketing Platform

City is a modern, high-performance event management and ticketing platform built with Next.js 16, ElysiaJS, and Prisma. It provides a seamless experience for creating, discovering, and booking tickets for local events.

## 🚀 Tech Stack

- **Frontend:** [Next.js 16 (App Router)](https://nextjs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **API Engine:** [ElysiaJS](https://elysiajs.com/) (running within Next.js route handlers)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication:** [Better Auth](https://www.better-auth.com/) (Google & Email/Password)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Payments:** [Stripe](https://stripe.com/)
- **Email:** [Resend](https://resend.com/)
- **Components:** Radix UI & Shadcn/UI primitives

## ✨ Key Features

- **Event Discovery:** Browse and explore upcoming events with a modern, responsive UI.
- **Event Management:** Create and manage your own events, including venue details, dates, and pricing.
- **Ticketing System:** Securely purchase tickets for events with real-time availability.
- **Payment Integration:** Fully integrated checkout flow using Stripe.
- **User Profiles:** Personalized user settings and ticket history.
- **Automated Emails:** Ticket confirmations and notifications via Resend.
- **QR Codes:** Ticket generation with QR codes for easy check-ins.

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js
- PostgreSQL instance (e.g., [Neon](https://neon.tech/))

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd city
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="postgresql://..."
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   BETTER_AUTH_SECRET="..."
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   RESEND_API_KEY="..."
   STRIPE_SECRET_KEY="..."
   STRIPE_WEBHOOK_SECRET="..."
   ```

4. Set up the database:
   ```bash
   bun run generate
   bun run migrate
   ```

5. Run the development server:
   ```bash
   bun dev
   ```

## 📂 Project Structure

- `app/`: Next.js App Router (Pages, Layouts, Client/Server components)
- `server/api/`: ElysiaJS API modules (grouped by feature)
- `components/`: UI and feature-specific components
- `lib/`: Shared utilities (Auth, Prisma, Stripe, Email)
- `prisma/`: Database schema and migrations

## 📜 Available Scripts

- `bun dev`: Starts the Next.js development server
- `bun run build`: Creates a production-ready build
- `bun run start`: Runs the built application
- `bun run lint`: Runs ESLint for code quality checks
- `bun run generate`: Generates the Prisma client
- `bun run migrate`: Applies database migrations

## 🛡️ License

This project is private and for internal use only.
