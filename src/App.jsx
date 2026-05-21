import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ProviderProfile from './pages/ProviderProfile';
import StudentDashboard from './pages/StudentDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import { SignUp, Login, ForgotPassword } from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
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
import AnalyticsTracker from './components/AnalyticsTracker';
import AdminAnalytics from './pages/AdminAnalytics';
import Support from './pages/Support';
import AdminSupport from './pages/AdminSupport';
import AdminSupportConversation from './pages/AdminSupportConversation';
import FloatingSupportButton from './components/FloatingSupportButton';
import QuickAccessDrawer from './components/QuickAccessDrawer';
import WelcomeWalkthrough from './components/WelcomeWalkthrough';
import { LegalDocument, LegalHub } from './pages/LegalPages';
import SavedTutors from './pages/SavedTutors';
import ProviderAnalytics from './pages/ProviderAnalytics';
import AdminReviewModeration from './pages/AdminReviewModeration';
import AdminReferrals from './pages/AdminReferrals';
import FindTutor from './pages/FindTutor';
import Referrals from './pages/Referrals';
import SessionReminders from './components/SessionReminders';
import StudyHangouts from './pages/StudyHangouts';
import NotFound from './pages/NotFound';
import Go from './pages/Go';

function ProtectedRoute({ children, role, developerOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (developerOnly && !user.is_admin) return <Navigate to="/" replace />;
  if (role === 'admin' && !user.is_admin) return <Navigate to="/" replace />;
  if (role && role !== 'admin' && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

const IG_URL = 'https://www.instagram.com/uasklive?igsh=d2Y1eXM4NTltbDd4';
const COMMENTATOR_ARTICLE_URL = 'https://yucommentator.org/2026/05/final-exams-begin-next-week-need-help-organizing-your-studying/';

function Footer() {
  const footerLink = {
    fontSize: 12,
    color: 'var(--muted)',
    textDecoration: 'none',
  };

  return (
    <footer className="app-footer" style={{
      borderTop: '1px solid var(--border)',
      padding: '20px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 24, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>© {new Date().getFullYear()} ASK</span>
      <Link to="/faq" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        FAQ
      </Link>
      <Link to="/legal" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Legal
      </Link>
      <Link to="/terms" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Terms
      </Link>
      <Link to="/privacy" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Privacy
      </Link>
      <Link to="/cookies" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Cookies
      </Link>
      <Link to="/refund-policy" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Refunds
      </Link>
      <Link to="/community-guidelines" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Guidelines
      </Link>
      <Link to="/help-wanted" style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Request a service
      </Link>
      <a href={COMMENTATOR_ARTICLE_URL} target="_blank" rel="noopener noreferrer"
        style={footerLink}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Featured in The YU Commentator
      </a>
      <a href={IG_URL} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        onMouseEnter={e => e.currentTarget.style.color = '#bc1888'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
        Instagram
      </a>
    </footer>
  );
}

function IgBar() {
  return (
    <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '9px 16px', textDecoration: 'none',
      background: 'linear-gradient(90deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.8" fill="#fff" stroke="none"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-ui)', letterSpacing: '0.01em' }}>
        Follow us on Instagram @uasklive
      </span>
    </a>
  );
}

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <IgBar />
      <Navbar />
      <SessionReminders />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}

function LayoutNoFooter({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <IgBar />
      <Navbar />
      <SessionReminders />
      <main style={{ flex: 1, overflow: 'hidden' }}>{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/browse" element={<Layout><Browse /></Layout>} />
        <Route path="/support" element={<Layout><Support /></Layout>} />
        <Route path="/find-a-tutor" element={<Layout><FindTutor /></Layout>} />
        <Route path="/saved-tutors" element={<Layout><SavedTutors /></Layout>} />
        <Route path="/legal" element={<Layout><LegalHub /></Layout>} />
        <Route path="/terms" element={<Layout><LegalDocument type="terms" /></Layout>} />
        <Route path="/privacy" element={<Layout><LegalDocument type="privacy" /></Layout>} />
        <Route path="/cookies" element={<Layout><LegalDocument type="cookies" /></Layout>} />
        <Route path="/refund-policy" element={<Layout><LegalDocument type="refunds" /></Layout>} />
        <Route path="/community-guidelines" element={<Layout><LegalDocument type="guidelines" /></Layout>} />
        <Route path="/people" element={<Layout><People /></Layout>} />
        <Route path="/studyparty" element={<Layout><StudyHangouts /></Layout>} />
        <Route path="/hangouts" element={<Layout><StudyHangouts /></Layout>} />
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
          path="/admin/analytics"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminAnalytics /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminSupport /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/support/:conversationId"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminSupportConversation /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminReviewModeration /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <ProtectedRoute role="admin">
              <Layout><AdminReferrals /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dms"
          element={
            <ProtectedRoute role="admin">
              <Layout><DirectMessages adminMode /></Layout>
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
          path="/dashboard/analytics"
          element={
            <ProtectedRoute role="provider">
              <Layout><ProviderAnalytics /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <Layout><Referrals /></Layout>
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
        <Route path="/reset-password" element={<ResetPassword />} />
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
        <Route path="/go" element={<Go />} />
        <Route path="/faq" element={<Layout><FAQ /></Layout>} />
        <Route path="/u/:username" element={<Layout><UserProfile /></Layout>} />
        {/* Pretty URLs: /sacha-feit-7 → ProviderProfile (ID parsed from slug) */}
        <Route path="/:providerSlug" element={<Layout><ProviderProfile /></Layout>} />
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
      <QuickAccessDrawer />
      <WelcomeWalkthrough />
      <FloatingSupportButton />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <CookieBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
