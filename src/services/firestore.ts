import * as admin from 'firebase-admin';
import { User, Team, TeamAlarm, Member } from '../types/models';

const getDb = () => admin.firestore();

export const firestoreService = {
  // User operations
  async getUser(uid: string): Promise<User | null> {
    const doc = await getDb().collection('users').doc(uid).get();
    return doc.exists ? (doc.data() as User) : null;
  },

  async createUser(uid: string, email: string, nickname: string): Promise<User> {
    const user: User = {
      uid,
      email,
      nickname,
      teams: [],
      activeTeamId: null,
      fcmToken: '',
      createdAt: Date.now(),
    };
    await getDb().collection('users').doc(uid).set(user);
    return user;
  },

  async updateUser(uid: string, updates: Partial<User>): Promise<User> {
    await getDb().collection('users').doc(uid).update(updates);
    const doc = await getDb().collection('users').doc(uid).get();
    return doc.data() as User;
  },

  async updateFcmToken(uid: string, token: string): Promise<boolean> {
    await getDb().collection('users').doc(uid).update({ fcmToken: token });
    return true;
  },

  // Team operations
  async createTeam(name: string, ownerId: string): Promise<Team> {
    const teamRef = getDb().collection('teams').doc();
    const teamId = teamRef.id;
    const team: Team = {
      id: teamId,
      name,
      ownerId,
      inviteCode: teamId,
      createdAt: Date.now(),
      alarm: {
        isActive: false,
        triggeredBy: '',
        triggeredAt: 0,
        acknowledgedBy: {},
      },
    };
    await teamRef.set(team);

    // Add creator as owner member
    await getDb()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .doc(ownerId)
      .set({
        uid: ownerId,
        nickname: (await this.getUser(ownerId))?.nickname || 'Owner',
        role: 'owner',
      });

    // Add team to creator's teams array
    const user = await this.getUser(ownerId);
    if (user) {
      await this.updateUser(ownerId, {
        teams: [...user.teams, teamId],
      });
    }

    return team;
  },

  async getTeam(teamId: string): Promise<Team | null> {
    const doc = await getDb().collection('teams').doc(teamId).get();
    return doc.exists ? (doc.data() as Team) : null;
  },

  async getTeamMembers(teamId: string): Promise<Member[]> {
    const snapshot = await getDb()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .get();
    return snapshot.docs.map((doc) => doc.data() as Member);
  },

  async addTeamMember(teamId: string, uid: string, nickname: string): Promise<void> {
    await getDb()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .doc(uid)
      .set({
        uid,
        nickname,
        role: 'member',
      });
  },

  async removeTeamMember(teamId: string, uid: string): Promise<void> {
    await getDb()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .doc(uid)
      .delete();
  },

  async deleteTeam(teamId: string): Promise<void> {
    const team = await this.getTeam(teamId);
    if (!team) return;

    // Get all members
    const members = await this.getTeamMembers(teamId);

    // Remove team from all members' teams arrays
    for (const member of members) {
      const user = await this.getUser(member.uid);
      if (user) {
        await this.updateUser(member.uid, {
          teams: user.teams.filter((t) => t !== teamId),
          activeTeamId: user.activeTeamId === teamId ? null : user.activeTeamId,
        });
      }
    }

    // Delete all members
    const membersSnapshot = await getDb()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .get();
    for (const doc of membersSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete team
    await getDb().collection('teams').doc(teamId).delete();
  },

  // Alarm operations
  async getAlarm(teamId: string): Promise<TeamAlarm | null> {
    const team = await this.getTeam(teamId);
    return team?.alarm || null;
  },

  async triggerAlarm(teamId: string, uid: string): Promise<TeamAlarm> {
    const alarm: TeamAlarm = {
      isActive: true,
      triggeredBy: uid,
      triggeredAt: Date.now(),
      acknowledgedBy: { [uid]: true },
    };
    await getDb().collection('teams').doc(teamId).update({ alarm });
    return alarm;
  },

  async acknowledgeAlarm(teamId: string, uid: string): Promise<TeamAlarm> {
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const alarm = {
      ...team.alarm,
      acknowledgedBy: {
        ...team.alarm.acknowledgedBy,
        [uid]: true,
      },
    };
    await getDb().collection('teams').doc(teamId).update({ alarm });
    return alarm;
  },

  async resetAlarm(teamId: string): Promise<TeamAlarm> {
    const alarm: TeamAlarm = {
      isActive: false,
      triggeredBy: '',
      triggeredAt: 0,
      acknowledgedBy: {},
    };
    await getDb().collection('teams').doc(teamId).update({ alarm });
    return alarm;
  },
};
