import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/Login";
import MainLayout from "./components/Layout/MainLayout";
import HomePage from "./pages/Home";
import ProfileTest from "./pages/Profile";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
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
            
            {/* Thích thì bạn vẫn có thể giữ route này để xem profile chi tiết */}
            <Route path="profile" element={<ProfileTest />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;