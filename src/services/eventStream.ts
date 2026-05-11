import { Response } from 'express';

interface StreamClient {
  userId: string;
  teamIds: string[];
  res: Response;
  keepAliveInterval: NodeJS.Timeout;
}

class EventStreamService {
  private clients: Map<string, StreamClient> = new Map();

  addClient(userId: string, teamIds: string[], res: Response): void {
    const keepAliveInterval = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 30000);

    const client: StreamClient = {
      userId,
      teamIds,
      res,
      keepAliveInterval,
    };

    this.clients.set(userId, client);

    res.on('close', () => {
      this.removeClient(userId);
    });
  }

  removeClient(userId: string): void {
    const client = this.clients.get(userId);
    if (client) {
      clearInterval(client.keepAliveInterval);
      this.clients.delete(userId);
      console.log(`Client ${userId} disconnected from event stream`);
    }
  }

  sendAlarmEvent(teamId: string, state: any): void {
    const eventData = `alarm|${teamId}|${JSON.stringify(state)}`;
    this.broadcastToTeam(teamId, eventData);
  }

  sendMemberStatusEvent(teamId: string, memberId: string, status: string): void {
    const eventData = `member_status|${teamId}|${memberId}|${status}`;
    this.broadcastToTeam(teamId, eventData);
  }

  private broadcastToTeam(teamId: string, eventData: string): void {
    this.clients.forEach((client) => {
      if (client.teamIds.includes(teamId)) {
        try {
          client.res.write(`data: ${eventData}\n\n`);
        } catch (error) {
          console.error(`Failed to send event to client ${client.userId}:`, error);
          this.removeClient(client.userId);
        }
      }
    });
  }

  getConnectedUsers(teamId: string): string[] {
    const users: string[] = [];
    this.clients.forEach((client) => {
      if (client.teamIds.includes(teamId)) {
        users.push(client.userId);
      }
    });
    return users;
  }
}

export const eventStreamService = new EventStreamService();
