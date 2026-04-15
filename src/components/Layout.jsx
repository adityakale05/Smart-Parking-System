import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children, title }) => {
  return (
    <div className="main-container">
      <Sidebar />
      <div className="content">
        <Topbar title={title} />
        {children}
      </div>
    </div>
  );
};

export default Layout;
