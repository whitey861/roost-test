import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/dashboard" className="flex items-center">
                <span className="text-xl font-bold">VaultSync</span>
              </Link>
              <div className="ml-10 flex items-center space-x-4">
                <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100">
                  Dashboard
                </Link>
                <Link to="/jobs" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100">
                  Jobs
                </Link>
                <Link to="/files" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100">
                  Files
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100">
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
