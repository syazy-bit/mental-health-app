import '@testing-library/jest-dom/vitest';

// React 19 requires the act environment flag for async UI updates.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
