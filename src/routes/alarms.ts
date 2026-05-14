import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { authMiddleware } from '../middleware/auth';
import { firestoreService } from '../services/firestore';
import { eventStreamService } from '../services/eventStream';

const router = Router();

router.post('/:teamId/alarm/trigger', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const uid = req.uid!;

    const team = await firestoreService.getTeam(teamId);
    if (!team) {
      res.status(404).json({
        error: 'Team not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    const alarm = await firestoreService.triggerAlarm(teamId, uid);

    // Send SSE event
    eventStreamService.sendAlarmEvent(teamId, {
      isActive: alarm.isActive,
      triggeredBy: alarm.triggeredBy,
      triggeredAt: alarm.triggeredAt,
      acknowledgedBy: alarm.acknowledgedBy,
    });

    const members = await firestoreService.getTeamMembers(teamId);

    // Collect FCM tokens from all members except the one who triggered the alarm
    const fcmTokens: string[] = [];
    for (const member of members) {
      if (member.uid !== uid) {
        const user = await firestoreService.getUser(member.uid);
        if (user && user.fcmToken) {
          fcmTokens.push(user.fcmToken);
        }
      }
    }

    // Send multicast message with data-only payload
    if (fcmTokens.length > 0) {
      const message = {
        data: {
          type: 'ALARM',
          teamId,
          triggeredBy: uid,
          triggeredAt: alarm.triggeredAt.toString(),
        },
        tokens: fcmTokens,
      };

      try {
        await admin.messaging().sendMulticast(message as any);
      } catch (error) {
        console.error('Failed to send FCM multicast message:', error);
      }
    }

    res.json(alarm);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger alarm',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.post('/:teamId/alarm/acknowledge', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const uid = req.uid!;

    const team = await firestoreService.getTeam(teamId);
    if (!team) {
      res.status(404).json({
        error: 'Team not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    if (!team.alarm.isActive) {
      res.status(400).json({
        error: 'Alarm is not active',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const alarm = await firestoreService.acknowledgeAlarm(teamId, uid);

    // Send SSE event with full acknowledgedBy state
    eventStreamService.sendAlarmEvent(teamId, {
      isActive: alarm.isActive,
      triggeredBy: alarm.triggeredBy,
      triggeredAt: alarm.triggeredAt,
      acknowledgedBy: alarm.acknowledgedBy,
    });

    res.json(alarm);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to acknowledge alarm',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.post('/:teamId/alarm/reset', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    const team = await firestoreService.getTeam(teamId);
    if (!team) {
      res.status(404).json({
        error: 'Team not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    if (!team.alarm.isActive) {
      res.status(400).json({
        error: 'Alarm is not active',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const alarm = await firestoreService.resetAlarm(teamId);

    // Send SSE event
    eventStreamService.sendAlarmEvent(teamId, {
      isActive: alarm.isActive,
      triggeredBy: alarm.triggeredBy,
      triggeredAt: alarm.triggeredAt,
      acknowledgedBy: alarm.acknowledgedBy,
    });

    res.json(alarm);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset alarm',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.get('/:teamId/alarm', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    const alarm = await firestoreService.getAlarm(teamId);
    if (!alarm) {
      res.status(404).json({
        error: 'Alarm not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    res.json(alarm);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get alarm',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

export default router;
