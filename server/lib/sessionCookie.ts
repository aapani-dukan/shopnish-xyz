// server/lib/sessionCookie.ts

import { auth } from 'firebase-admin';

/**
 * Creates a Firebase session cookie for a given user.
 * @param idToken The user's Firebase ID token.
 * @param authInstance The Firebase Admin auth instance.
 * @returns A promise that resolves with the session cookie string.
 */
export async function createSessionCookie(idToken: string, authInstance: auth.Auth): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await authInstance.createSessionCookie(idToken, { expiresIn });
  return sessionCookie;
}
