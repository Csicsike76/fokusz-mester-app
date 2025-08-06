import React from 'react';
import Navbar from '../Navbar/Navbar';
import ChatButton from '../ChatButton/ChatButton'; // Ez az útvonal most már helyes!
import BackgroundVideo from '../BackgroundVideo/BackgroundVideo';

const Layout = ({ children }) => {
  return (
    <>
      <BackgroundVideo />
      <Navbar />
      <main>{children}</main>
      <ChatButton />
    </>
  );
};

export default Layout;