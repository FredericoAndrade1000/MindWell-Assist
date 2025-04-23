// Optional: Setup file for Vitest
// Can be used to import global mocks or setup code before tests run
// Example: import '@testing-library/jest-dom/extend-expect'; // If needed and installed separately

import '@testing-library/jest-dom'; // Import directly if using @testing-library/jest-dom

// Mock matchMedia for components relying on it (like some Headless UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver if needed (e.g., for lazy loading tests)
// const mockIntersectionObserver = vi.fn();
// mockIntersectionObserver.mockReturnValue({
//   observe: () => null,
//   unobserve: () => null,
//   disconnect: () => null
// });
// window.IntersectionObserver = mockIntersectionObserver;

console.log("Vitest setup file loaded.");
