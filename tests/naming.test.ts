import { describe, expect, it } from 'vitest';
import { toPascalCase, validateDisplayName, validateProjectName } from '../src/naming.js';

describe('validateProjectName', () => {
  it.each(['my-app', 'app', 'shop2', 'school-portal-v2'])('accepts %s', (name) => {
    expect(validateProjectName(name)).toBeUndefined();
  });

  it.each(['', 'My-App', '1app', '-app', 'app-', 'my--app', 'my_app', 'my app', 'a'.repeat(65)])(
    'rejects %j',
    (name) => {
      expect(validateProjectName(name)).toBeTypeOf('string');
    },
  );

  it.each(['con', 'nul', 'com1', 'lpt9'])('rejects the Windows device name %s', (name) => {
    expect(validateProjectName(name)).toMatch(/reserved device name/);
  });

  it('rejects names that collide with framework namespaces', () => {
    expect(validateProjectName('system')).toMatch(/reserved/);
    expect(validateProjectName('microsoft')).toMatch(/reserved/);
  });
});

describe('validateDisplayName', () => {
  it.each(['My App', 'Hệ thống quản lý đào tạo', 'Shop v2.0', 'my_app-1'])('accepts %s', (name) => {
    expect(validateDisplayName(name)).toBeUndefined();
  });

  it.each(['', ' leading space', 'Quote"d', 'Back\\slash', '<script>', "It's"])('rejects %j', (name) => {
    expect(validateDisplayName(name)).toBeTypeOf('string');
  });
});

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-app')).toBe('MyApp');
    expect(toPascalCase('school-portal-v2')).toBe('SchoolPortalV2');
    expect(toPascalCase('app')).toBe('App');
  });
});
