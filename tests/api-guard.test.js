import { describe, it, expect } from 'vitest';
import { isAllowedHost } from '../api/_lib/guard.js';

describe('origines autorisées', () => {
  it('accepte la prod, les previews du projet et le dev local', () => {
    expect(isAllowedHost('myfinanx.vercel.app')).toBe(true);
    expect(isAllowedHost('myfinanx-git-feat-x-emmanuel-dantons-projects.vercel.app')).toBe(true);
    expect(isAllowedHost('localhost:5173')).toBe(true);
  });
  it('refuse les autres applications Vercel et les origines absentes', () => {
    expect(isAllowedHost('attaquant.vercel.app')).toBe(false);
    expect(isAllowedHost('myfinanx.vercel.app.evil.com')).toBe(false);
    expect(isAllowedHost('')).toBe(false);
  });
  it('accepte un domaine ajouté par ALLOWED_ORIGINS', () => {
    expect(isAllowedHost('myfinanx.fr', ['https://myfinanx.fr'])).toBe(true);
  });
});
