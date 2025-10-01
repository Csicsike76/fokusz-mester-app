import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo'; // Importáljuk a BackgroundVideo komponenst
import UiControls from '../UiControls/UiControls'; // Importáljuk a UiControls komponenst

const Layout = () => {
  return (
    <>
      {/* A BackgroundVideo a JSX fában a legelső elem,
                  így a z-index: -1 tudja a háttérbe helyezni. */}
      <BackgroundVideo /> 
      <Navbar />
      <UiControls /> 
      <main>
        <Outlet />
      </main>
      {/* Ide jöhet a Footer komponens, ha van */}
    </>
  );
};

export default Layout;