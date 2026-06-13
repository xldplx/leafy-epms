/**
 * validators.js — shared frontend input validators.
 * Location: frontend/src/utils/validators.js
 */

// Locked project-code format: PRJ-YYYY-NNN (e.g. PRJ-2026-004).
// Backend mirrors this server-side; existing legacy codes are grandfathered
// because they are never re-validated through the create form.
export const PROJECT_CODE_PATTERN = /^PRJ-\d{4}-\d{3}$/;

export const isValidProjectCode = (code = '') => PROJECT_CODE_PATTERN.test(code.trim());
