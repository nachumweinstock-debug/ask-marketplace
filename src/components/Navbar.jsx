import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, User, LayoutDashboard, Briefcase, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="bg-white border-b border-amber-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">ASK</span>
          <span className="text-slate-400 text-sm hidden sm:block">· YU Marketplace</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/browse" className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors">
            Browse
          </Link>
          <Link to="/create-listing" className="hidden sm:flex items-center gap-1.5 text-amber-600 hover:text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-50 text-sm font-medium transition-colors">
            <PlusCircle size={16} />
            Sell a Service
          </Link>

          {user ? (
            <>
              <Link
                to="/dashboard/student"
                className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                <LayoutDashboard size={16} />
                <span className="hidden sm:block">My Bookings</span>
              </Link>
              {user.role === 'provider' && (
                <Link
                  to="/dashboard/provider"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                >
                  <Briefcase size={16} />
                  <span className="hidden sm:block">My Services</span>
                </Link>
              )}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-blue-700" />
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.name.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-slate-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                Log in
              </Link>
              <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
