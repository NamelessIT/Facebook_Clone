import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css"; // KHÔNG QUÊN IMPORT CSS

const LoginPage = () => {
  const [email, setEmail] = useState("alice@fbclone.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      const { accessToken, refreshToken } = response.data.data;
      await login(accessToken, refreshToken);
      navigate("/");
    } catch (err) {
      setError("Đăng nhập thất bại! Kiểm tra lại thông tin.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        
        {/* Nửa Trái */}
        <div className="login-left">
          <img 
            src="https://static.xx.fbcdn.net/rsrc.php/y1/r/4lCu2zih0ca.svg" 
            alt="Facebook" 
            className="fb-logo" 
          />
          <h2 className="login-slogan">
            Facebook giúp bạn kết nối và chia sẻ với mọi người trong cuộc sống của bạn.
          </h2>
        </div>

        {/* Nửa Phải */}
        <div className="login-right">
          <div className="login-card">
            {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email hoặc số điện thoại"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="btn-login">Đăng nhập</button>
            </form>
            <a href="#" className="forgot-link">Quên mật khẩu?</a>
            <div className="divider"></div>
            <button className="btn-create">Tạo tài khoản mới</button>
          </div>
          <p className="create-page-text">
            <b>Tạo Trang</b> dành cho người nổi tiếng, thương hiệu hoặc doanh nghiệp.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;