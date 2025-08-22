import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import ChatButton from '../ChatButton/ChatButton';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';
import UiControls from '../UiControls/UiControls';
import PomodoroTimer from '../UiControls/PomodoroTimer'; // ✅ default import

const Layout = () => (
  <>
    <BackgroundVideo />
    <Navbar />
    <UiControls />
    <PomodoroTimer /> {/* ✅ mindig megjelenik a bal oldalon, navbar alatt */}
    <main>
      <Outlet />
    </main>
    <ChatButton />
  </>
);

export default Layout;
