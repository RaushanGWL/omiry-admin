import { User, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/api';
import './Header.css';

export const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  return (
    <header className="admin-header">
      <div className="header-search">
        {/* Search can go here later */}
      </div>
      <div className="header-actions">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <span>Admin</span>
        </div>
        <button
          className="icon-btn logout-btn"
          onClick={handleLogout}
          aria-label="Logout"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
