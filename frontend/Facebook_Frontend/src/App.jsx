import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocalizationProvider } from "./contexts/LocalizationContext";
import LoginPage from "./pages/Login";
import MainLayout from "./components/Layout/MainLayout";
import HomePage from "./pages/Home";
import ProfilePage from "./pages/Profile/ProfilePage";
import FriendsPage from "./pages/Friends";
import SearchResultsPage from "./pages/Search/SearchResultsPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import ChatListPage from "./pages/Messages/ChatListPage";
import ReelsPage from "./pages/Reels/ReelsPage";
import SavedItemsPage from "./pages/SavedItems/SavedItemsPage";
import PostDetailPage from "./pages/PostDetail/PostDetailPage";
import AdminPage from "./pages/Admin/AdminPage";
import ConfirmProvider from "./contexts/ConfirmProvider";
import { OfflineSyncProvider } from "./contexts/OfflineSyncContext";
import NotificationCenter from "./components/feedback/NotificationCenter";

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
        <NotificationCenter />
        </ConfirmProvider>
        </OfflineSyncProvider>
        </LocalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
