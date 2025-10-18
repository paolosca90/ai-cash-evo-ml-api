# Frontend - AI Cash Revolution

React + TypeScript frontend application for AI Cash Revolution trading platform.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **State Management**: React Hooks
- **Routing**: React Router
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Fetch API / Axios

## Directory Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main App component
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── assets/             # Images, fonts, etc.
├── index.html          # HTML template
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tailwind.config.ts  # Tailwind configuration
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

Production build will be created in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_api_url
```

## Key Features

- Real-time trading dashboard
- Signal visualization
- Trade history and analytics
- User authentication (Supabase Auth)
- Responsive design
- Dark mode support

## Component Library

Using Shadcn/ui components:
- Button, Card, Dialog
- Form, Input, Select
- Table, Tabs, Toast
- And more...

## Deployment

The frontend is deployed to Vercel:

```bash
# Vercel CLI
npm i -g vercel
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Code Style

- ESLint for code linting
- Prettier for code formatting (optional)
- Follow React best practices
- Use TypeScript strict mode

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Related Documentation

- Project structure: `../PROJECT_STRUCTURE.md`
- API documentation: `../docs/api/`
- Deployment guide: `../DEPLOYMENT_GUIDE.md`
