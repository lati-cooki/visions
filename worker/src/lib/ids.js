// Cryptographically random, URL-safe ID for shareable plan links and booking rows.
// Using crypto.randomUUID() (available in Workers + Node 15+) gives 122 bits of entropy
// and removes the time-component that made old IDs partially guessable.
export const newId = () => crypto.randomUUID().replace(/-/g, "");
