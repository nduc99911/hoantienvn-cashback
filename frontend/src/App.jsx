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
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="guide" element={<Guide />} />
        <Route path="terms" element={<Terms />} />
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
  );
}
