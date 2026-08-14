import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocalizationProvider } from "./contexts/LocalizationContext";
import MainLayout from "./components/Layout/MainLayout";
import ConfirmProvider from "./contexts/ConfirmProvider";
import { OfflineSyncProvider } from "./contexts/OfflineSyncContext";
import NotificationCenter from "./components/feedback/NotificationCenter";

const LoginPage = lazy(() => import("./pages/Login"));
const HomePage = lazy(() => import("./pages/Home"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const FriendsPage = lazy(() => import("./pages/Friends"));
const SearchResultsPage = lazy(() => import("./pages/Search/SearchResultsPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));
const ChatListPage = lazy(() => import("./pages/Messages/ChatListPage"));
const ReelsPage = lazy(() => import("./pages/Reels/ReelsPage"));
const SavedItemsPage = lazy(() => import("./pages/SavedItems/SavedItemsPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetail/PostDetailPage"));
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));
const MarketplacePage = lazy(() => import("./pages/Discovery/MarketplacePage"));
const MemoriesPage = lazy(() => import("./pages/Discovery/MemoriesPage"));
const LivePage = lazy(() => import("./pages/Discovery/LivePage"));

const RouteFallback = () => (
  <div className="route-loading" role="status" aria-live="polite">
    <span className="route-loading__spinner" aria-hidden="true" />
    <span>Đang tải...</span>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isAdmin) return <Navigate to="/admin" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && !user.isAdmin) {
      logout();
    }
  }, [isAuthenticated, user, logout]);

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocalizationProvider>
        <OfflineSyncProvider>
        <ConfirmProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage mode="admin" />} />

          {/* Các trang cần đăng nhập sẽ nằm trong MainLayout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            {/* Index route: Đường dẫn mặc định khi vào "/" */}
            <Route index element={<HomePage />} />
            
            {/* Profile page */}
            <Route path="profile/:userId" element={<ProfilePage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="search" element={<SearchResultsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="messages" element={<ChatListPage />} />
            <Route path="messages/:friendId" element={<ChatListPage />} />
            <Route path="reels" element={<ReelsPage />} />
            <Route path="saved" element={<SavedItemsPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="memories" element={<MemoriesPage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="posts/:postId" element={<PostDetailPage />} />
          </Route>

          {/* Admin — standalone layout, no MainLayout */}
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Routes>
        </Suspense>
        <NotificationCenter />
        </ConfirmProvider>
        </OfflineSyncProvider>
        </LocalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
