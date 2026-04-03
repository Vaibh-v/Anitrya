import crypto from "crypto";

const SECRET = process.env.APP_SECRET || "dev-secret";
const ALGORITHM = "aes-256-ctr";

function getKey() {
  return crypto.scryptSync(SECRET, "vsight-salt", 32);
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(value: string) {
  const [ivHex, encryptedHex] = value.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted secret format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}