import { randomBytes, randomInt } from 'node:crypto';

export interface ProjectSecrets {
  /** HMAC-SHA256 signing key shared by the `Jwt` and `JwtTokenSettings` sections of appsettings.json. */
  jwtSigningKey: string;
  /** Password for every development account created by DataSeeder.cs. */
  seedUserPassword: string;
}

// No look-alike characters, and nothing that needs escaping inside a C# string literal.
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generatePassword(length = 16): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

export function generateSecrets(): ProjectSecrets {
  return {
    jwtSigningKey: randomBytes(64).toString('hex'),
    seedUserPassword: generatePassword(),
  };
}
