import { firestoreService } from '../../services/firestore';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          })),
          get: jest.fn(),
        })),
      })),
    })),
  })),
}));

describe('Firestore Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User operations', () => {
    it('should create a user', async () => {
      const uid = 'test-uid';
      const email = 'test@example.com';
      const nickname = 'Test User';

      const user = await firestoreService.createUser(uid, email, nickname);

      expect(user.uid).toBe(uid);
      expect(user.email).toBe(email);
      expect(user.nickname).toBe(nickname);
      expect(user.teams).toEqual([]);
      expect(user.activeTeamId).toBeNull();
    });

    it('should get a user', async () => {
      const uid = 'test-uid';
      const mockUser = {
        uid,
        email: 'test@example.com',
        nickname: 'Test User',
        teams: [],
        activeTeamId: null,
        fcmToken: '',
        createdAt: Date.now(),
      };

      const db = admin.firestore() as any;
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      const user = await firestoreService.getUser(uid);
      expect(user).toEqual(mockUser);
    });
  });

  describe('Team operations', () => {
    it('should create a team', async () => {
      const name = 'Test Team';
      const ownerId = 'owner-uid';

      const team = await firestoreService.createTeam(name, ownerId);

      expect(team.name).toBe(name);
      expect(team.ownerId).toBe(ownerId);
      expect(team.alarm.isActive).toBe(false);
    });
  });

  describe('Alarm operations', () => {
    it('should trigger an alarm', async () => {
      const teamId = 'team-id';
      const uid = 'user-uid';

      const alarm = await firestoreService.triggerAlarm(teamId, uid);

      expect(alarm.isActive).toBe(true);
      expect(alarm.triggeredBy).toBe(uid);
      expect(alarm.acknowledgedBy[uid]).toBe(true);
    });

    it('should acknowledge an alarm', async () => {
      const teamId = 'team-id';
      const uid = 'user-uid';

      const alarm = await firestoreService.acknowledgeAlarm(teamId, uid);

      expect(alarm.acknowledgedBy[uid]).toBe(true);
    });

    it('should reset an alarm', async () => {
      const teamId = 'team-id';

      const alarm = await firestoreService.resetAlarm(teamId);

      expect(alarm.isActive).toBe(false);
      expect(alarm.triggeredBy).toBe('');
      expect(alarm.acknowledgedBy).toEqual({});
    });
  });
});
