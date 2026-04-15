import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, ClipboardList, Users, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        if (data) setIsAdmin(data.is_admin);
      }
    };
    checkAdmin();
  }, []);

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, public: true },
    { title: 'Parking Slots', path: '/parking', icon: <Car size={20} />, public: true },
    { title: 'System Audit Log', path: '/booking', icon: <ClipboardList size={20} />, public: false },
    { title: 'Registered Users', path: '/users', icon: <Users size={20} />, public: false },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <h2>SMART PARKING</h2>
      <ul>
        {menuItems.map((item) => {
          // Hide non-public routes from normal users
          if (!item.public && !isAdmin) return null;

          return (
            <li
              key={item.path}
              className={location.pathname === item.path ? 'active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              {item.title}
            </li>
          );
        })}
        <li onClick={handleLogout} style={{ marginTop: 'auto' }}>
          <LogOut size={20} />
          Logout
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
