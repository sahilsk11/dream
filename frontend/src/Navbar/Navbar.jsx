import React, { useState, useEffect } from 'react';
import "./TopNav/TopNav"
import TopNav from './TopNav/TopNav';
import LeftNavBar from "./LeftNavBar/LeftNavBar";

export default function Navbar({ activePage, useSideNav }) {
  console.log(useSideNav);
  return useSideNav ? <LeftNavBar /> : <TopNav />;
}