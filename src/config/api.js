// src/config/api.js
const isProdOnRender =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('onrender.com');

export const API_URL =
  // ha akarsz, beállíthatod .env-ben is:
  // REACT_APP_API_URL=https://fokusz-mester-backend.onrender.com
  process.env.REACT_APP_API_URL ||
  (isProdOnRender
    ? 'https://fokusz-mester-backend.onrender.com'
    : 'http://localhost:3001');
