import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Referrals from './pages/Referrals';
import Withdraw from './pages/Withdraw';
import Claim from './pages/Claim';
import Admin from './pages/Admin';
import Blog from './pages/Blog';
import Guide from './pages/Guide';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SeoHead from './components/SeoHead';
import AuthCallback from './pages/AuthCallback';
import FloatingSupport from './components/FloatingSupport';
import MobileBottomNav from './components/MobileBottomNav';
import PwaInstall from './components/PwaInstall';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">Đang tải phiên đăng nhập...</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <SeoHead />
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="guide" element={<Guide />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="cookies" element={<Cookies />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<Blog />} />
        <Route
          path="dashboard"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />
        <Route
          path="orders"
          element={
            <Private>
              <Orders />
            </Private>
          }
        />
        <Route
          path="referrals"
          element={
            <Private>
              <Referrals />
            </Private>
          }
        />
        <Route
          path="withdraw"
          element={
            <Private>
              <Withdraw />
            </Private>
          }
        />
        <Route
          path="claim"
          element={
            <Private>
              <Claim />
            </Private>
          }
        />
        <Route
          path="admin"
          element={
            <Private>
              <Admin />
            </Private>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
      <FloatingSupport />
      <MobileBottomNav />
      <PwaInstall />
    </>
  );
}
