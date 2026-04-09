import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const SECRET =
  process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

const CURRENT_ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-ctr";
const CURRENT_PREFIX = "v2";

let cachedKey: Buffer | null = null;

function getKey() {
  if (!cachedKey) {
    cachedKey = scryptSync(SECRET, "anitrya-token-salt", 32);
  }

  return cachedKey;
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  if (!value) return false;

  const parts = value.split(":");

  if (parts.length === 4 && parts[0] === CURRENT_PREFIX) {
    return parts.slice(1).every((part) => /^[0-9a-f]+$/i.test(part));
  }

  if (parts.length === 2) {
    return parts.every((part) => /^[0-9a-f]+$/i.test(part));
  }

  return false;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(CURRENT_ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    CURRENT_PREFIX,
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptLegacySecret(value: string) {
  const [ivHex, encryptedHex] = value.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid legacy encrypted secret format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(LEGACY_ALGORITHM, getKey(), iv);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptSecret(value: string) {
  const parts = value.split(":");

  if (parts.length === 4 && parts[0] === CURRENT_PREFIX) {
    const [, ivHex, authTagHex, encryptedHex] = parts;

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error("Invalid encrypted secret format.");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = createDecipheriv(CURRENT_ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  }

  if (parts.length === 2) {
    return decryptLegacySecret(value);
  }

  throw new Error("Invalid encrypted secret format.");
}

export function decryptStoredSecret(value: string | null | undefined) {
  if (!value) return null;
  return isEncryptedSecret(value) ? decryptSecret(value) : value;
}