import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint = 992) => {
  // Inicializáljuk az állapotot az ablak jelenlegi szélessége alapján
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    // Ez a függvény lefut, valahányszor átméretezik az ablakot
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Hozzáadjuk az eseményfigyelőt
    window.addEventListener('resize', handleResize);

    // Tisztítás: eltávolítjuk az eseményfigyelőt, amikor a komponenst már nem használjuk
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]); // A függőség a breakpoint, bár ez ritkán változik

  return isMobile;
};

export default useIsMobile;