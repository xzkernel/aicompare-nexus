import { describe, expect, it } from "vitest";

import {
  decryptApiKeysPayload,
  parseApiKeys,
  parseEncryptedKeyData,
} from "./secure-api-keys";

async function legacyEncrypt(value: unknown, password: string) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value))
  ));
  const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { data: hex(encrypted), iv: hex(iv), salt: hex(salt) };
}

describe("API key payload validation", () => {
  it("accepts legacy shapes and supplies optional defaults", () => {
    expect(parseApiKeys({ openaiKey: "key" })).toMatchObject({
      openaiKey: "key",
      googleProvider: "google",
      claudeProvider: "anthropic",
      customApiConfig: { baseUrl: "", keyHeader: "Authorization" },
    });
  });

  it("rejects malformed keys, providers, and custom configuration", () => {
    expect(() => parseApiKeys({ openaiKey: 123 })).toThrow(/openaiKey/);
    expect(() => parseApiKeys({ googleProvider: "together" })).toThrow(/Google provider/);
    expect(() => parseApiKeys({ customApiConfig: "https://example.com" })).toThrow(/custom API configuration/);
    expect(() => parseApiKeys({ customApiConfig: { baseUrl: "http://example.com", keyHeader: "Authorization" } })).toThrow(/base URL/);
    expect(() => parseApiKeys({ customApiConfig: { baseUrl: "https://example.com", keyHeader: "Bad Header" } })).toThrow(/key header/);
  });

  it("rejects malformed versioned vault envelopes", () => {
    expect(() => parseEncryptedKeyData({ data: "aa", iv: "aa", salt: "aa", version: 3 })).toThrow(/version/);
    expect(() => parseEncryptedKeyData({ data: "aa", iv: "aa", salt: "aa", version: 2 })).toThrow(/KDF/);
  });

  it("decrypts unversioned legacy vaults with weak historical passwords", async () => {
    const encrypted = await legacyEncrypt({ openaiKey: "legacy-key" }, "old-pass");
    await expect(decryptApiKeysPayload(encrypted, "old-pass")).resolves.toMatchObject({
      openaiKey: "legacy-key",
      googleProvider: "google",
    });
  });

  it("rejects malformed API keys after successful decryption", async () => {
    const encrypted = await legacyEncrypt({
      openaiKey: "legacy-key",
      customApiConfig: { baseUrl: "javascript:alert(1)", keyHeader: "Authorization" },
    }, "old-pass");
    await expect(decryptApiKeysPayload(encrypted, "old-pass")).rejects.toThrow(/base URL/);
  });
});
