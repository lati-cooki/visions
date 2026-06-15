// Persistence shim.
//
// The prototype used the Claude.ai artifact's `window.storage`. This provides the same
// async get/set/remove surface, backed by localStorage, so feature components don't change
// when persistence later moves to the backend (D1 via the Worker).

const PREFIX = "visions:";

export const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value == null ? null : { value };
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return true;
    } catch {
      return false;
    }
  },

  async remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
