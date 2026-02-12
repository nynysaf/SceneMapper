/**
 * Server-only password hashing for users and map collaborator passwords.
 * Uses Node crypto.scrypt; set PASSWORD_SALT in production.
 */
import { scryptSync, timingSafeEqual } from 'crypto';

const SALT = process.env.PASSWORD_SALT ?? 'scene-mapper-dev-salt';
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  return scryptSync(password, SALT, KEY_LEN).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const buf = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, SALT, KEY_LEN);
  return buf.length === candidate.length && timingSafeEqual(buf, candidate);
}
