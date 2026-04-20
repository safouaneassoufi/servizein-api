import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    // Avoid re-initializing if already done (hot-reload safety)
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    const privateKey = (
      this.config.get<string>('FIREBASE_PRIVATE_KEY') ?? ''
    ).replace(/\\n/g, '\n');

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey,
      }),
    });
  }

  /**
   * Verifies a Firebase ID token and returns the decoded claims.
   * Throws if the token is invalid or expired.
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.app.auth().verifyIdToken(idToken, true);
  }

  /**
   * Returns Firebase user record by UID.
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    return this.app.auth().getUser(uid);
  }
}
