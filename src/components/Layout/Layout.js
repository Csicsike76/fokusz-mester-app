import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import ChatButton from '../ChatButton/ChatButton';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';

const Layout = () => (
  <>
    <BackgroundVideo />
    <Navbar />
    <main>
      <Outlet />
    </main>
    <ChatButton />
  </>
);

export default Layout;
