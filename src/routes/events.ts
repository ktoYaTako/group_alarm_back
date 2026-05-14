import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { eventStreamService } from '../services/eventStream';
import { firestoreService } from '../services/firestore';

const router = Router();

router.get('/stream', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.uid!;

    const user = await firestoreService.getUser(userId);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    const teamIds = user.teams || [];

    console.error(`[SSE] 🔌 Client connected: ${userId}`);
    console.error(`[SSE] 📋 Subscribed to teams:`, teamIds);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    eventStreamService.addClient(userId, teamIds, res);

    // Send initial connection message
    res.write(`data: connected|${userId}\n\n`);
    console.error(`[SSE] ✅ Sent connection confirmation to ${userId}`);

    // Send current member status for all teams
    for (const teamId of teamIds) {
      const connectedUsers = eventStreamService.getConnectedUsers(teamId);
      console.error(`[SSE] 👥 Team ${teamId} has ${connectedUsers.length} connected users:`, connectedUsers);
      connectedUsers.forEach((memberId) => {
        if (memberId !== userId) {
          res.write(`data: member_status|${teamId}|${memberId}|online\n\n`);
        }
      });
    }
  } catch (error) {
    console.error('Error in event stream:', error);
    res.status(500).json({
      error: 'Failed to establish event stream',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

export default router;
