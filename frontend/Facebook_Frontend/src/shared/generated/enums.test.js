import { describe, it, expect } from 'vitest';
import { PostPrivacy, PostType, ReactionType } from './enums';
import { API, STORAGE_KEYS } from './constants';

// Guards the generated contract values shared with the backend + DB.
describe('shared generated enums', () => {
  it('PostPrivacy matches contract', () => {
    expect(PostPrivacy.Public).toBe(1);
    expect(PostPrivacy.Friends).toBe(2);
    expect(PostPrivacy.Private).toBe(3);
  });

  it('ReactionType matches contract', () => {
    expect(ReactionType.Like).toBe(1);
    expect(ReactionType.Angry).toBe(6);
  });

  it('PostType share/auto values', () => {
    expect(PostType.Share).toBe(2);
    expect(PostType.ProfilePicture).toBe(4);
    expect(PostType.CoverPhoto).toBe(5);
  });

  it('objects are frozen (immutable)', () => {
    expect(Object.isFrozen(PostPrivacy)).toBe(true);
  });
});

describe('shared generated constants', () => {
  it('api prefix + storage keys', () => {
    expect(API.prefix).toBe('/api/v1');
    expect(STORAGE_KEYS.accessToken).toBe('accessToken');
  });
});
