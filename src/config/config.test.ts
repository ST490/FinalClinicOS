import { describe, it, expect } from 'vitest';
import { validateConfig } from './index.js';

describe('Config Security Validation', () => {
  it('should validate successfully in non-production mode', () => {
    expect(() => validateConfig()).not.toThrow();
  });
});
