import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import ChatButton from '../ChatButton/ChatButton';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';
import UiControls from '../UiControls/UiControls';

const Layout = () => (
  <>
    <BackgroundVideo />
    <Navbar />
    <UiControls />
    {/* JAVÍTÁS: Hozzáadunk egy className-t a main elemhez */}
    <main className="main-content">
      <Outlet />
    </main>
    <ChatButton />
  </>
);

export default Layout;