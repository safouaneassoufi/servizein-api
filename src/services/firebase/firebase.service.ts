import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App | null = null;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const rawKey = this.config.get<string>('FIREBASE_PRIVATE_KEY') ?? '';
    const privateKey = rawKey.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey || privateKey === '') {
      this.logger.warn('Firebase credentials missing — Firebase Auth disabled');
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log('Firebase Admin SDK initialized');
    } catch (err: any) {
      this.logger.error('Firebase init failed — Firebase Auth disabled: ' + err.message);
      this.app = null;
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) throw new Error('Firebase not initialized');
    return this.app.auth().verifyIdToken(idToken, true);
  }

  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    if (!this.app) throw new Error('Firebase not initialized');
    return this.app.auth().getUser(uid);
  }
}
