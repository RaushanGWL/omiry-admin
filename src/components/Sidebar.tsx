import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, FileText, MessageSquare, Users, Image } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/collections', label: 'Collections', icon: FolderTree },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/blogs', label: 'Blogs', icon: FileText },
  { path: '/enquiries', label: 'Enquiries', icon: MessageSquare },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/hero', label: 'Hero Section', icon: Image },
];

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>OMRIY</h2>
        <p>Admin Panel</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
