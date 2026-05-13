import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { firestoreService } from '../services/firestore';
import { fcmService } from '../services/fcm';
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
    const triggeringMember = members.find(m => m.uid === uid);
    const triggeringMemberName = triggeringMember?.nickname || 'Unknown';

    for (const member of members) {
      if (member.uid !== uid) {
        const user = await firestoreService.getUser(member.uid);
        if (user && user.fcmToken) {
          const data = {
            type: 'ALARM',
            // notificationTitle: 'Alarm Triggered',
            // notificationBody: `Alarm triggered by ${triggeringMemberName}`,
            teamId,
            triggeredBy: uid,
            triggeredAt: alarm.triggeredAt.toString(),
          };
          await fcmService.sendToToken(user.fcmToken, data);
        }
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

    let alarm = await firestoreService.acknowledgeAlarm(teamId, uid);

    // Check if all members except the initiator have confirmed
    const members = await firestoreService.getTeamMembers(teamId);
    const otherMembers = members.filter((m) => m.uid !== alarm.triggeredBy);
    const allOthersConfirmed = otherMembers.every((m) => alarm.acknowledgedBy[m.uid] === true);

    if (allOthersConfirmed) {
      // Auto-reset alarm when all have confirmed
      alarm = await firestoreService.resetAlarm(teamId);
    }

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
