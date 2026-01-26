export const toDisplayString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "message" in value && value.message) {
    return String(value.message);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
