import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { firestoreService } from '../services/firestore';
import { fcmService } from '../services/fcm';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const uid = req.uid!;

    if (!name) {
      res.status(400).json({
        error: 'Missing required field: name',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const team = await firestoreService.createTeam(name, uid);
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create team',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.get('/:teamId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    res.json(team);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get team',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.get('/:teamId/members', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;

    const members = await firestoreService.getTeamMembers(teamId);
    res.json(members);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get team members',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.post('/:teamId/join', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { inviteCode } = req.body;
    const uid = req.uid!;

    if (!inviteCode) {
      res.status(400).json({
        error: 'Missing required field: inviteCode',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    const team = await firestoreService.getTeam(teamId);
    if (!team) {
      res.status(404).json({
        error: 'Team not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    if (team.inviteCode !== inviteCode) {
      res.status(400).json({
        error: 'Invalid invite code',
        code: 'BAD_REQUEST',
        status: 400,
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

    // Check if already member
    if (user.teams.includes(teamId)) {
      res.status(400).json({
        error: 'Already a member of this team',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    // Add member
    await firestoreService.addTeamMember(teamId, uid, user.nickname);

    // Add team to user's teams array
    await firestoreService.updateUser(uid, {
      teams: [...user.teams, teamId],
    });

    // Subscribe to FCM topic
    if (user.fcmToken) {
      await fcmService.subscribeToTopic(user.fcmToken, `team_${teamId}`);
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to join team',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.post('/:teamId/leave', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const uid = req.uid!;

    const user = await firestoreService.getUser(uid);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    if (!user.teams.includes(teamId)) {
      res.status(400).json({
        error: 'Not a member of this team',
        code: 'BAD_REQUEST',
        status: 400,
      });
      return;
    }

    // Remove member
    await firestoreService.removeTeamMember(teamId, uid);

    // Remove team from user's teams array
    await firestoreService.updateUser(uid, {
      teams: user.teams.filter((t) => t !== teamId),
      activeTeamId: user.activeTeamId === teamId ? null : user.activeTeamId,
    });

    // Unsubscribe from FCM topic
    if (user.fcmToken) {
      await fcmService.unsubscribeFromTopic(user.fcmToken, `team_${teamId}`);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to leave team',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.post('/:teamId/members/:memberId/kick', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, memberId } = req.params;
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

    if (team.ownerId !== uid) {
      res.status(403).json({
        error: 'Only team owner can kick members',
        code: 'FORBIDDEN',
        status: 403,
      });
      return;
    }

    const member = await firestoreService.getUser(memberId);
    if (!member) {
      res.status(404).json({
        error: 'Member not found',
        code: 'NOT_FOUND',
        status: 404,
      });
      return;
    }

    // Remove member
    await firestoreService.removeTeamMember(teamId, memberId);

    // Remove team from member's teams array
    await firestoreService.updateUser(memberId, {
      teams: member.teams.filter((t) => t !== teamId),
      activeTeamId: member.activeTeamId === teamId ? null : member.activeTeamId,
    });

    // Unsubscribe from FCM topic
    if (member.fcmToken) {
      await fcmService.unsubscribeFromTopic(member.fcmToken, `team_${teamId}`);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to kick member',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

router.delete('/:teamId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    if (team.ownerId !== uid) {
      res.status(403).json({
        error: 'Only team owner can delete team',
        code: 'FORBIDDEN',
        status: 403,
      });
      return;
    }

    // Get all members
    const members = await firestoreService.getTeamMembers(teamId);

    // Unsubscribe all members from FCM topic
    for (const member of members) {
      const user = await firestoreService.getUser(member.uid);
      if (user && user.fcmToken) {
        await fcmService.unsubscribeFromTopic(user.fcmToken, `team_${teamId}`);
      }
    }

    // Delete team
    await firestoreService.deleteTeam(teamId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete team',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
});

export default router;
