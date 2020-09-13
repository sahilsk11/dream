import React, { useState, useEffect } from 'react';
import "./TopNav/TopNav"
import TopNav from './TopNav/TopNav';
import LeftNavBar from "./LeftNavBar/LeftNavBar";

export default function Navbar(activePage) {
  const [displaySideBar, updateSidebarDisplay] = useState(window.innerWidth > 867);
  useEffect(() => {
    function handleResize() {
      updateSidebarDisplay(window.innerWidth > 867)
    }
    window.addEventListener('resize', handleResize);
  });

  return displaySideBar ? LeftNavBar() : <TopNav />;
}