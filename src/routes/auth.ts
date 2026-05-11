import { Router, Request, Response } from 'express';
import { authService } from '../services/auth';
import { firestoreService } from '../services/firestore';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({
        error: 'Missing required fields: email, password, nickname',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const authResponse = await authService.register(email, password);

    await firestoreService.createUser(authResponse.uid, email, nickname);

    res.status(201).json({
      uid: authResponse.uid,
      email: authResponse.email,
      nickname,
      firebaseToken: authResponse.firebaseToken,
      refreshToken: authResponse.refreshToken,
      expiresIn: authResponse.expiresIn,
    });
  } catch (error: any) {
    if (error.message === 'Email already registered') {
      res.status(400).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
        status: 400,
      });
    } else {
      res.status(500).json({
        error: 'Registration failed',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
      });
    }
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields: email, password',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const authResponse = await authService.login(email, password);

    res.json({
      uid: authResponse.uid,
      email: authResponse.email,
      firebaseToken: authResponse.firebaseToken,
      refreshToken: authResponse.refreshToken,
      expiresIn: authResponse.expiresIn,
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED',
        status: 401,
      });
    } else {
      res.status(500).json({
        error: 'Login failed',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
      });
    }
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Missing required field: refreshToken',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const tokenResponse = await authService.refreshToken(refreshToken);

    res.json({
      firebaseToken: tokenResponse.firebaseToken,
      refreshToken: tokenResponse.refreshToken,
      expiresIn: tokenResponse.expiresIn,
    });
  } catch (error) {
    res.status(401).json({
      error: 'Failed to refresh token',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true });
});

export default router;
