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

    console.error(`[FCM] Collected ${fcmTokens.length} FCM tokens`);
    if (fcmTokens.length > 0) {
      console.error(`[FCM] Tokens:`, fcmTokens);
    }

    // Send multicast message with data-only payload
    if (fcmTokens.length > 0) {
      const message: admin.messaging.MulticastMessage = {
        data: {
          type: 'ALARM',
          teamId,
          triggeredBy: uid,
          triggeredAt: alarm.triggeredAt.toString(),
        },
        tokens: fcmTokens,
      };

      console.error(`[FCM] Sending multicast message to ${fcmTokens.length} devices`);
      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.error(`[FCM] ✅ Multicast message sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);
      } catch (error) {
        console.error('[FCM] ❌ Failed to send FCM multicast message:', error);
        // Don't throw, continue execution
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

    console.error(`[ALARM] User ${uid} acknowledging alarm in team ${teamId}`);
    console.error(`[ALARM] Current acknowledgedBy BEFORE:`, team.alarm.acknowledgedBy);

    const alarm = await firestoreService.acknowledgeAlarm(teamId, uid);

    console.error(`[ALARM] Current acknowledgedBy AFTER:`, alarm.acknowledgedBy);

    const members = await firestoreService.getTeamMembers(teamId);
    const allMemberIds = members.map((m) => m.uid);
    const allConfirmed = allMemberIds.every((id) => alarm.acknowledgedBy[id] === true);

    console.error(`[ALARM] Current team members:`, allMemberIds);
    console.error(`[ALARM] All confirmed?`, allConfirmed);

    if (allConfirmed) {
      console.error(`[ALARM] ✅ ALL CONFIRMED! Sending SSE event with full acknowledgedBy`);
      console.error(`[ALARM] SSE event data:`, {
        isActive: alarm.isActive,
        acknowledgedBy: alarm.acknowledgedBy,
      });
    } else {
      const missing = allMemberIds.filter((id) => !alarm.acknowledgedBy[id]);
      console.error(`[ALARM] ❌ Not all confirmed yet. Missing:`, missing);
    }

    // Send SSE event with full acknowledgedBy state
    console.error(`[ALARM] 📤 Sending SSE event to all connected clients...`);
    eventStreamService.sendAlarmEvent(teamId, {
      isActive: alarm.isActive,
      triggeredBy: alarm.triggeredBy,
      triggeredAt: alarm.triggeredAt,
      acknowledgedBy: alarm.acknowledgedBy,
    });
    console.error(`[ALARM] 📤 SSE event sent`);

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
