import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getUserById } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

interface SessionPayload {
  userId: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Simple base64 JWT-like token (not cryptographically secure, but fine for demo)
// For production, use a proper JWT library
function encodeToken(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const signature = simpleHash(data + JWT_SECRET);
  return Buffer.from(data).toString('base64') + '.' + signature;
}

function decodeToken(token: string): SessionPayload | null {
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const data = Buffer.from(dataB64, 'base64').toString('utf-8');
    const expectedSignature = simpleHash(data + JWT_SECRET);

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(data) as SessionPayload;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

// Simple hash function for token signing (demo purposes)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function createSession(userId: number): string {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SESSION_DURATION,
  };
  return encodeToken(payload);
}

export function verifySession(token: string): { userId: number } | null {
  const payload = decodeToken(token);
  if (!payload) return null;
  return { userId: payload.userId };
}

export async function getSession(): Promise<{ userId: number; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const session = verifySession(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user) return null;

  return { userId: user.id, email: user.email };
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION / 1000, // in seconds
    path: '/',
  };
}

export function getCookieName() {
  return COOKIE_NAME;
}
