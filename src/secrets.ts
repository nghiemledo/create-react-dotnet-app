import { randomBytes, randomInt } from 'node:crypto';

export interface ProjectSecrets {
  /** HMAC-SHA256 signing key shared by the `Jwt` and `JwtTokenSettings` sections of appsettings.json. */
  jwtSigningKey: string;
  /** Password for every development account created by DataSeeder.cs. */
  seedUserPassword: string;
  /** Password of the local development database container (compose.yaml, via the generated root .env). */
  databasePassword: string;
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

/** SQL Server rejects sa passwords without characters from at least three classes; this always has upper, lower and digit. */
export function generateDatabasePassword(length = 24): string {
  for (;;) {
    const password = generatePassword(length);
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
      return password;
    }
  }
}

export function generateSecrets(): ProjectSecrets {
  return {
    jwtSigningKey: randomBytes(64).toString('hex'),
    seedUserPassword: generatePassword(),
    databasePassword: generateDatabasePassword(),
  };
}
