import crypto from "node:crypto";
import { ENV } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Uses JWT_SECRET as the base for the encryption key
 */
function getEncryptionKey(): Buffer {
    const secret = ENV.cookieSecret;
    // Create a 32-byte key from the secret using SHA-256
    return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a string value
 * Returns base64 encoded string: iv:tag:encrypted
 */
export function encrypt(text: string): string {
    if (!text) return "";

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted (all in hex)
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string value
 * Expects base64 encoded string: iv:tag:encrypted
 */
export function decrypt(encryptedText: string): string {
    if (!encryptedText) return "";

    // Check if it looks like an encrypted value (has the iv:tag:encrypted format)
    if (!encryptedText.includes(":")) {
        // Return as-is if not encrypted (for backwards compatibility)
        return encryptedText;
    }

    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(":");

        if (parts.length !== 3) {
            // Not in expected format, return as-is
            return encryptedText;
        }

        const [ivHex, tagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("[Crypto] Decryption failed, returning as-is:", error);
        // If decryption fails, return the original (might be unencrypted legacy data)
        return encryptedText;
    }
}

/**
 * Check if a value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(":");
    return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}
