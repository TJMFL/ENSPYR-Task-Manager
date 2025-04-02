import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardList,
  Home,
  Zap,
  FolderKanban,
  Settings,
  LogOut,
  Calendar,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false); // State for mobile sidebar toggle

  // Define navigation items
  const navItems = [
    { title: 'Dashboard', icon: <Home className="h-5 w-5 mr-3" />, path: '/' },
    { title: 'Tasks', icon: <ClipboardList className="h-5 w-5 mr-3" />, path: '/tasks' },
    { title: 'Calendar', icon: <Calendar className="h-5 w-5 mr-3" />, path: '/calendar' },
    { title: 'AI Assistant', icon: <Zap className="h-5 w-5 mr-3" />, path: '/ai-assistant' },
    { title: 'Projects', icon: <FolderKanban className="h-5 w-5 mr-3" />, path: '/projects' },
    { title: 'Settings', icon: <Settings className="h-5 w-5 mr-3" />, path: '/settings' },
  ];

  return (
    <>
      {/* Mobile menu button - only visible on small screens (up to medium) */}
      <Button 
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-500 text-white rounded-full p-2"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </Button>

      {/* Sidebar content */}
      <div className={`
        fixed h-full bg-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40
        md:relative md:translate-x-0 md:w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center space-x-2">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">ENSPYR - Task Manager</h1>
        </div>

        <nav className="mt-8 flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path} 
              className={cn(
                "flex items-center px-4 py-2 rounded-lg",
                location === item.path 
                  ? "text-gray-100 bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.username || 'User'}</p>
            </div>
          </div>
          <Link href="/logout" onClick={(e) => {
            e.preventDefault();
            logout();
            toast({ title: "Logged out successfully" });
          }}>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-white border-gray-700 hover:bg-gray-800 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </Link>
        </div>

        {/* Close button for mobile */}
        <Button 
          className="md:hidden absolute top-4 right-4 bg-red-500 text-white rounded-full p-2"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          ×
        </Button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;
