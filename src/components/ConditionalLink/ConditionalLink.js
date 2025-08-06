import React from 'react';
import { Link } from 'react-router-dom';
import useIsMobile from '../../hooks/useIsMobile';

const ConditionalLink = ({ to, children, ...props }) => {
  const isMobile = useIsMobile(); // A breakpoint alapértelmezetten 992px

  if (isMobile) {
    return (
      <Link to={to} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={to} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};

export default ConditionalLink;