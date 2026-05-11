import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { firestoreService } from '../services/firestore';
import { fcmService } from '../services/fcm';
import { User } from '../types/models';

const router = Router();

router.get('/:uid', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    if (req.uid !== uid) {
      res.status(403).json({
        error: 'Cannot access other users profile',
        code: 'FORBIDDEN',
        status: 403,
      });
      return;
    }

    const user = await firestoreService.getUser(uid);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.put('/:uid', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    if (req.uid !== uid) {
      res.status(403).json({
        error: 'Cannot update other users profile',
        code: 'FORBIDDEN',
        status: 403,
      });
      return;
    }

    const updates = req.body as Partial<User>;
    const allowedFields: (keyof User)[] = ['nickname', 'activeTeamId'];
    const filteredUpdates: Partial<User> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        (filteredUpdates[field] as any) = updates[field];
      }
    }

    const user = await firestoreService.updateUser(uid, filteredUpdates);
    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update user',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.put('/:uid/fcm-token', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { token } = req.body;

    if (req.uid !== uid) {
      res.status(403).json({
        error: 'Cannot update other users FCM token',
        code: 'FORBIDDEN',
        status: 403,
      });
      return;
    }

    if (!token) {
      res.status(400).json({
        error: 'Missing required field: token',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    await firestoreService.updateFcmToken(uid, token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update FCM token',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

export default router;
