import React from 'react';
import { Link } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';

const ConditionalLink = ({ to, children, ...props }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobilon a Link komponenshez adjuk a prop-okat
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }

  // Desktopon az <a> tag-hez adjuk a prop-okat
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

export default ConditionalLink;