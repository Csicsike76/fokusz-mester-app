// src/hooks/useThemeZoom.js
import { useCallback, useEffect, useState } from 'react';

const LS_KEY = 'fm_zoom'; // százalék: 75..150

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const useThemeZoom = (min = 75, max = 150, step = 5) => {
  const [zoom, setZoom] = useState(() => {
    const saved = parseInt(localStorage.getItem(LS_KEY) || '100', 10);
    return clamp(isNaN(saved) ? 100 : saved, min, max);
  });

  const apply = useCallback((z) => {
    // Chrome-ban bevált, gyors: body.zoom
    document.body.style.zoom = `${z}%`;
    localStorage.setItem(LS_KEY, String(z));
  }, []);

  useEffect(() => { apply(zoom); }, [zoom, apply]);

  const inc = useCallback(() => setZoom((z) => clamp(z + step, min, max)), [min, max, step]);
  const dec = useCallback(() => setZoom((z) => clamp(z - step, min, max)), [min, max, step]);

  return { zoom, setZoom, inc, dec, min, max, step };
};
