# BankWise Frontend

Modern React + Vite frontend for BankWise banking system. Features role‑based dashboards, animated UI, real-time notifications, and optimized API handling.

## Tech Stack
- **React 19** with functional components and hooks
- **Vite 7** for fast development and building
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lottie** for success/error/loading animations
- **STOMP/WebSocket** for real-time notifications

## Features

### User Interface
- 🏦 User Dashboard with balance, quick actions, and transactions
- 💸 Secure fund transfers with recipient search
- 📊 Transaction history with filters and PDF export
- 💰 Deposit requests with status tracking
- 📋 Loan application with EMI calculator
- 👤 Profile page with photo upload
- 🔔 Real-time notification bell with toasts

### Admin Interface
- 📈 Analytics dashboard with charts
- ✅ Account verification workflow
- 💳 Deposit approval management
- 🏛️ Loan approval with detailed review
- ⚙️ Interest rate configuration
- 🩺 Service health monitoring

### Developer Interface
- 📊 System analytics (uptime, memory, requests)
- 🔍 Endpoint performance metrics
- 📁 Database statistics
- 📝 Request logs viewer

## Performance Optimizations

| Feature | Description |
|---------|-------------|
| Request Deduplication | Prevents duplicate API calls |
| Response Caching | 30-second cache for GET requests |
| Automatic Retry | 2 retries with exponential backoff |
| Cache Invalidation | Auto-clears on mutations |
| Global Loading | Shows spinner during API calls |
| Lazy Components | Code splitting for faster loads |

## Setup

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Configure `VITE_API_BASE_URL` to point to your backend

3. Install dependencies:
   ```bash
   npm install
   ```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

Output will be in `dist/` folder. Deploy to Netlify, Vercel, or any static host.

## Project Structure

```
src/
├── Components/
│   ├── Admin/      # Admin dashboard components
│   ├── Auth/       # Login, Register pages
│   ├── Developer/  # Developer analytics dashboard
│   ├── Layout/     # Navbar, Header
│   ├── Modals/     # Dialogs, toasts, overlays
│   ├── Pages/      # Main page components
│   └── User/       # User dashboard components
├── context/        # React context providers
├── hooks/          # Custom React hooks
└── utils/          # API client, auth, notifications
```

## API Layer

All API calls use the centralized client in [src/utils/apiClient.js](src/utils/apiClient.js):

```javascript
import { apiFetch, invalidateCache } from './utils/apiClient';

// GET with automatic caching
const data = await apiFetch('/api/users', { token });

// POST with cache invalidation
await apiFetch('/api/transfer', { 
  method: 'POST', 
  body: transferData,
  token 
});

// Force skip cache
const fresh = await apiFetch('/api/balance', { token, cache: false });
```

## Deployment (Netlify)

1. Update `.env.production` with your backend URL
2. Build: `npm run build`
3. Deploy `dist/` folder
4. The `_redirects` file handles SPA routing automatically
