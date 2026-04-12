import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ProviderProfile from './pages/ProviderProfile';
import StudentDashboard from './pages/StudentDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import { SignUp, Login, ForgotPassword } from './pages/Auth';
import CreateListing from './pages/CreateListing';
import ResetPassword from './pages/ResetPassword';
import AccountProfile from './pages/AccountProfile';
import AdminDashboard from './pages/AdminDashboard';

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

function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
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
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
