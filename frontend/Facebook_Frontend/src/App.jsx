import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
import AdminPage from "./pages/Admin/AdminPage";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user?.isAdmin) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;