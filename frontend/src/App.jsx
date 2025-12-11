import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Vault from './pages/Vault';
import AddItem from './pages/AddItem';
import ItemDetail from './pages/ItemDetail';
import Settings from './pages/Settings';
import Unlock from './pages/Unlock';
import SecurityDashboard from './pages/SecurityDashboard';
import TwoFactorSettings from './pages/TwoFactorSettings';
import BiometricSettings from './pages/BiometricSettings';

// 需要登录的路由保护
function PrivateRoute({ children }) {
  const { isLoggedIn, loading, isUnlocked } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full loading"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/welcome" replace />;
  }

  if (!isUnlocked()) {
    return <Navigate to="/unlock" replace />;
  }

  return children;
}

// 已登录时重定向
function PublicRoute({ children }) {
  const { isLoggedIn, isUnlocked } = useAuth();

  if (isLoggedIn && isUnlocked()) {
    return <Navigate to="/vault" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* 公开路由 */}
        <Route
          path="/welcome"
          element={
            <PublicRoute>
              <Welcome />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/unlock" element={<Unlock />} />

        {/* 需要登录的路由 */}
        <Route
          path="/vault"
          element={
            <PrivateRoute>
              <Vault />
            </PrivateRoute>
          }
        />
        <Route
          path="/add"
          element={
            <PrivateRoute>
              <AddItem />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <PrivateRoute>
              <AddItem />
            </PrivateRoute>
          }
        />
        <Route
          path="/item/:id"
          element={
            <PrivateRoute>
              <ItemDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/security"
          element={
            <PrivateRoute>
              <SecurityDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/2fa-settings"
          element={
            <PrivateRoute>
              <TwoFactorSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/biometric-settings"
          element={
            <PrivateRoute>
              <BiometricSettings />
            </PrivateRoute>
          }
        />

        {/* 默认路由 */}
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </div>
  );
}
