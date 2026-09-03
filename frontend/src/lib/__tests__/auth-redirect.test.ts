import { describe, expect, it } from 'vitest';
import { getSafeNextPath } from '@/lib/auth-redirect';

describe('getSafeNextPath', () => {
  it('accepts same-origin absolute paths', () => {
    expect(getSafeNextPath('/chat')).toBe('/chat');
    expect(getSafeNextPath('/booking/confirm?x=1')).toBe('/booking/confirm?x=1');
  });

  it('falls back to / for missing values', () => {
    expect(getSafeNextPath(null)).toBe('/');
    expect(getSafeNextPath(undefined)).toBe('/');
    expect(getSafeNextPath('')).toBe('/');
  });

  it('rejects open-redirect shapes', () => {
    expect(getSafeNextPath('https://evil.example.com')).toBe('/');
    expect(getSafeNextPath('//evil.example.com/phish')).toBe('/');
    expect(getSafeNextPath('/\\evil.example.com')).toBe('/');
    expect(getSafeNextPath('javascript:alert(1)')).toBe('/');
    expect(getSafeNextPath('chat')).toBe('/');
  });
});
