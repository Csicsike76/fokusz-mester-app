import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint = 992) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);

    // Tisztítás a komponens eltávolításakor
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;javascript
import React from 'react';
import { Link } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';

// Ez a komponens kap minden olyan prop-ot, amit egy normál link is kapna.
// A 'to' a belső útvonal, a 'href' a külső. A 'children' a link szövege/tartalma.
const ConditionalLink = ({ to, children, ...props }) => {
  const isMobile = useIsMobile(); // Meghívjuk a hook-ot

  // Ha mobilon vagyunk, a React Router Link komponensét használjuk
  if (isMobile) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }

  // Ha desktopon vagyunk, egy sima <a> taget használunk, ami új lapon nyílik meg
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

export default ConditionalLink;