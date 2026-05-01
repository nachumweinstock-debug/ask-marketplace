import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ProviderProfile from './pages/ProviderProfile';
import StudentDashboard from './pages/StudentDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import { SignUp, Login, ForgotPassword } from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import CreateListing from './pages/CreateListing';
import AccountProfile from './pages/AccountProfile';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import People from './pages/People';
import UserProfile from './pages/UserProfile';
import DirectMessages from './pages/DirectMessages';
import HelpWanted from './pages/HelpWanted';
import FAQ from './pages/FAQ';
import CookieBanner from './components/CookieBanner';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && !user.is_admin) return <Navigate to="/" replace />;
  if (role && role !== 'admin' && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

const IG_URL = 'https://www.instagram.com/uasklive?igsh=d2Y1eXM4NTltbDd4';

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)' }}>
      {/* Instagram promo strip */}
      <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '14px 24px', textDecoration: 'none',
        background: 'linear-gradient(90deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      }}>
        <InstagramIcon style={{ color: '#fff' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-ui)', letterSpacing: '0.01em' }}>
          Follow us @uasklive
        </span>
      </a>

      {/* Links row */}
      <div style={{
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>© {new Date().getFullYear()} ASK</span>
        <Link to="/faq" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
          FAQ
        </Link>
        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
          Privacy & Terms
        </a>
        <Link to="/help-wanted" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
          Request a service
        </Link>
        <a href={IG_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#bc1888'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
          <InstagramIcon /> Instagram
        </a>
      </div>
    </footer>
  );
}

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/browse" element={<Layout><Browse /></Layout>} />
        <Route path="/people" element={<Layout><People /></Layout>} />
        <Route path="/help-wanted" element={<Layout><HelpWanted /></Layout>} />
        <Route path="/people/:id" element={<Layout><UserProfile /></Layout>} />
        <Route path="/providers/:id" element={<Layout><ProviderProfile /></Layout>} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Layout><AccountProfile /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute>
              <Layout><StudentDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/provider"
          element={
            <ProtectedRoute role="provider">
              <Layout><ProviderDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-listing"
          element={
            <ProtectedRoute>
              <Layout><CreateListing /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" replace /> : <SignUp />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === 'provider' ? '/dashboard/provider' : '/dashboard/student'} replace /> : <Login />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/chat/:bookingId"
          element={
            <ProtectedRoute>
              <Layout><Chat /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Layout><DirectMessages /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:userId"
          element={
            <ProtectedRoute>
              <Layout><DirectMessages /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/faq" element={<Layout><FAQ /></Layout>} />
        {/* Pretty URLs: /sacha-feit-7 → ProviderProfile (ID parsed from slug) */}
        <Route path="/:providerSlug" element={<Layout><ProviderProfile /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <CookieBanner />
    </AuthProvider>
  );
}
