# Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites
- Node.js 18+ installed
- Firebase project created
- Service account JSON downloaded

### 2. Clone & Install
```bash
cd backend
npm install
```

### 3. Configure Firebase
```bash
cp .env.example .env
```

Edit `.env` и добавьте Firebase credentials:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
```

### 4. Start Development Server
```bash
npm run dev
```

Server запустится на `http://localhost:3000`

### 5. Test API
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nickname": "Test User"
  }'
```

## Docker Quick Start

```bash
# Build image
docker build -t groupalarm-backend .

# Run container
docker run -p 3000:3000 \
  -e FIREBASE_PROJECT_ID=your-project-id \
  -e FIREBASE_PRIVATE_KEY=your-key \
  -e FIREBASE_CLIENT_EMAIL=your-email \
  groupalarm-backend
```

## Docker Compose Quick Start

```bash
# Create .env file with Firebase credentials
cp .env.example .env

# Start services
docker-compose up

# Stop services
docker-compose down
```

## Available Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm test             # Run tests
npm test -- --watch  # Run tests in watch mode
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── middleware/auth.ts    # Authentication middleware
│   ├── routes/               # API routes
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── teams.ts
│   │   └── alarms.ts
│   ├── services/             # Business logic
│   │   ├── firestore.ts
│   │   ├── fcm.ts
│   │   └── auth.ts
│   └── types/models.ts       # TypeScript types
├── dist/                     # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| GET | `/users/:uid` | Get user profile |
| POST | `/teams` | Create team |
| POST | `/teams/:teamId/join` | Join team |
| POST | `/teams/:teamId/alarm/trigger` | Trigger alarm |
| POST | `/teams/:teamId/alarm/acknowledge` | Acknowledge alarm |
| POST | `/teams/:teamId/alarm/reset` | Reset alarm |

## Troubleshooting

### Port already in use
```bash
# Change port in .env
PORT=3001
```

### Firebase connection error
- Verify `.env` file has correct credentials
- Check Firebase project is active
- Ensure service account has Firestore permissions

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [API_EXAMPLES.md](./API_EXAMPLES.md) for API usage examples
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
4. See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment

## Support

- Firebase Docs: https://firebase.google.com/docs
- Express.js Docs: https://expressjs.com
- TypeScript Docs: https://www.typescriptlang.org/docs
