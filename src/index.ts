import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Initialize Firebase Admin SDK FIRST
let serviceAccount: any;

try {
  // Try to load from firebase-key.json first
  const keyPath = path.join(__dirname, '../firebase-key.json');
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  } else {
    // Fall back to environment variables
    const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || '';
    let privateKey = privateKeyEnv;

    // Remove quotes if present
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }

  if (!serviceAccount.project_id && !serviceAccount.projectId) {
    throw new Error('Missing Firebase project_id');
  }
  if (!serviceAccount.private_key && !serviceAccount.privateKey) {
    throw new Error('Missing Firebase private_key');
  }
  if (!serviceAccount.client_email && !serviceAccount.clientEmail) {
    throw new Error('Missing Firebase client_email');
  }

  // Normalize field names for Firebase Admin SDK
  if (!serviceAccount.projectId) serviceAccount.projectId = serviceAccount.project_id;
  if (!serviceAccount.privateKey) serviceAccount.privateKey = serviceAccount.private_key;
  if (!serviceAccount.clientEmail) serviceAccount.clientEmail = serviceAccount.client_email;
} catch (error) {
  console.error('Failed to load Firebase credentials:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Import routes AFTER Firebase initialization
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import teamsRoutes from './routes/teams';
import alarmsRoutes from './routes/alarms';
import eventsRoutes from './routes/events';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/teams', teamsRoutes);
app.use('/teams', alarmsRoutes);
app.use('/events', eventsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
