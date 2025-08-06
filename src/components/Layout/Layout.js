import React from 'react';
import { Outlet } from 'react-router-dom'; // ÚJ IMPORT
import Navbar from '../Navbar/Navbar';
import ChatButton from '../ChatButton/ChatButton';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';

const Layout = () => {
  return (
    <>
      <BackgroundVideo />
      <Navbar />
      <main>
        <Outlet /> {/* A 'children' helyett az Outlet jeleníti meg az oldalakat */}
      </main>
      <ChatButton />
    </>
  );
};

export default Layout;