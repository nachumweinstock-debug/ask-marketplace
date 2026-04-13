/**
 * End-to-end encryption using ECDH (P-256) + AES-GCM 256.
 * Keys are generated per browser and stored in localStorage.
 * The server stores only ciphertext — it cannot read messages.
 *
 * Wire format:  enc:v1:<base64_iv>:<base64_ciphertext>
 * System messages (is_system=1) are stored plaintext and skipped.
 */

const ALGO   = { name: 'ECDH', namedCurve: 'P-256' };
const AES    = { name: 'AES-GCM', length: 256 };
const PREFIX = 'enc:v1:';
const LS_PRIV = 'ask_e2e_priv';
const LS_PUB  = 'ask_e2e_pub';

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

/** Returns the current key pair, generating one if not stored. */
export async function getOrCreateKeyPair() {
  const storedPriv = localStorage.getItem(LS_PRIV);
  const storedPub  = localStorage.getItem(LS_PUB);
  if (storedPriv && storedPub) {
    try {
      const priv = await crypto.subtle.importKey('jwk', JSON.parse(storedPriv), ALGO, true, ['deriveKey', 'deriveBits']);
      const pub  = await crypto.subtle.importKey('jwk', JSON.parse(storedPub),  ALGO, true, []);
      return { privateKey: priv, publicKey: pub };
    } catch { /* corrupt — regenerate */ }
  }
  const pair = await crypto.subtle.generateKey(ALGO, true, ['deriveKey', 'deriveBits']);
  localStorage.setItem(LS_PRIV, JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey)));
  localStorage.setItem(LS_PUB,  JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey)));
  return pair;
}

/** Exports a public key as a base64 string for uploading to the server. */
export async function exportPublicKey(pubKey) {
  return btoa(JSON.stringify(await crypto.subtle.exportKey('jwk', pubKey)));
}

/** Imports a base64 public key string from the server. */
export async function importPublicKey(b64str) {
  return crypto.subtle.importKey('jwk', JSON.parse(atob(b64str)), ALGO, true, []);
}

/** Derives a shared AES-GCM key from our private key + their public key. */
export async function deriveSharedKey(myPrivKey, theirPubKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPubKey },
    myPrivKey,
    AES,
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypts a plaintext string. Returns the wire-format enc:v1:... string. */
export async function encryptMessage(plaintext, sharedKey) {
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, new TextEncoder().encode(plaintext));
  return PREFIX + b64(iv) + ':' + b64(cipher);
}

/**
 * Decrypts a wire-format enc:v1:... string.
 * Returns the original plaintext.
 * If ciphertext is not in enc:v1: format, returns it as-is (plaintext fallback).
 */
export async function decryptMessage(ciphertext, sharedKey) {
  if (!ciphertext?.startsWith(PREFIX)) return ciphertext;
  const rest = ciphertext.slice(PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon === -1) return '[encrypted]';
  try {
    const iv   = unb64(rest.slice(0, colon));
    const data = unb64(rest.slice(colon + 1));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, data);
    return new TextDecoder().decode(plain);
  } catch {
    return '[encrypted message — open on original device to read]';
  }
}

export const isEncrypted = body => body?.startsWith(PREFIX);
