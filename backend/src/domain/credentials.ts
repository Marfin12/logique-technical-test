import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(
  password: string,
  fixtureSalt?: Buffer,
): Promise<string> {
  if (password.length < 10 || password.length > 256) {
    throw new Error("Passwords must contain between 10 and 256 characters.");
  }
  const salt = fixtureSalt ?? randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] =
    encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    cost !== String(COST) ||
    blockSize !== String(BLOCK_SIZE) ||
    parallelization !== String(PARALLELIZATION) ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  try {
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await deriveKey(
      password,
      Buffer.from(saltValue, "base64url"),
    );
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
