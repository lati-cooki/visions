// worker/src/lib/code.js
// 6-digit verification codes. Raw codes are emailed but never stored — only a SHA-256
// hash peppered with a server secret + the email is persisted.

const enc = new TextEncoder();

export function generateCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

export async function hashCode(pepper, email, code) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${pepper}|${email}|${code}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
