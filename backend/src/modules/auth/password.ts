import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

interface Argon2Module {
  argon2id: number;
  hash(password: string, options: { type: number }): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

// argon2 is an optional native dependency — load it lazily via dynamic import
// so the app still boots on machines where it isn't installed (falls back to
// scrypt). Using `await import()` instead of `eval("require")` avoids tripping
// security scanners and works in both ESM and CommonJS modes.
async function loadArgon2(): Promise<Argon2Module | null> {
  try {
    // @ts-expect-error — argon2 is an optional native dependency; it may not
    // be installed, and its types are not present. The try/catch handles the
    // missing module at runtime.
    const mod = await import("argon2");
    return mod as unknown as Argon2Module;
  } catch {
    return null;
  }
}

async function scryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const argon2 = await loadArgon2();

  if (argon2) {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  const salt = randomBytes(16);
  const derivedKey = await scryptKey(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });

  return [
    "scrypt",
    SCRYPT_N.toString(),
    SCRYPT_R.toString(),
    SCRYPT_P.toString(),
    salt.toString("base64url"),
    derivedKey.toString("base64url")
  ].join("$");
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (passwordHash.startsWith("$argon2")) {
    const argon2 = await loadArgon2();
    return argon2 ? argon2.verify(passwordHash, password) : false;
  }

  const parts = passwordHash.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts as [
    string,
    string,
    string,
    string,
    string,
    string
  ];
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltRaw, "base64url");
  const expectedHash = Buffer.from(hashRaw, "base64url");
  const derivedKey = await scryptKey(password, salt, expectedHash.length, {
    N: n,
    r,
    p
  });

  if (derivedKey.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedHash);
}
