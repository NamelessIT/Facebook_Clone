import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import { X } from "lucide-react"; // Import icon nút X
import "./Login.css"; 

const LoginPage = () => {
  // State Đăng nhập
  const [email, setEmail] = useState("alice@fbclone.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  
  // State Đăng ký
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // --- XỬ LÝ ĐĂNG NHẬP ---
  const handleLoginSubmit = async (e) => {
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

  // --- XỬ LÝ ĐĂNG KÝ ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError("");
    
    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setRegError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    setIsRegistering(true);
    try {
      // Gọi API Đăng ký (Đường dẫn có thể khác tùy backend của bạn, thường là /auth/register)
      await api.post("/auth/register", {
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        password: regPassword
      });
      
      alert("Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.");
      
      // Tự động điền email vừa đăng ký vào ô Đăng nhập cho tiện
      setEmail(regEmail);
      setPassword(regPassword); // (Có thể bỏ dòng này nếu muốn user tự gõ lại mk)
      
      // Đóng modal và reset form
      setIsRegisterOpen(false);
      setRegFirstName(""); setRegLastName(""); setRegEmail(""); setRegPassword("");
    } catch (err) {
      console.error("Lỗi đăng ký:", err.response?.data);
      setRegError(err.response?.data?.message || "Đăng ký thất bại. Email có thể đã tồn tại.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-container">
      
      {/* =========================================
          MODAL ĐĂNG KÝ (NỔI LÊN TRÊN CÙNG)
      ========================================= */}
      {isRegisterOpen && (
        <div className="register-overlay" onMouseDown={() => setIsRegisterOpen(false)}>
          <div className="register-modal" onMouseDown={e => e.stopPropagation()}>
            
            <div className="register-header">
              <h2>Đăng ký</h2>
              <p>Nhanh chóng và dễ dàng.</p>
              <button onClick={() => setIsRegisterOpen(false)} className="close-register-btn">
                <X size={24} />
              </button>
            </div>

            <div className="register-body">
              {regError && <div style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{regError}</div>}
              
              <form onSubmit={handleRegisterSubmit}>
                <div className="name-row">
                  <input 
                    type="text" placeholder="Họ" className="reg-input" style={{marginBottom: 0}}
                    value={regLastName} onChange={e => setRegLastName(e.target.value)}
                  />
                  <input 
                    type="text" placeholder="Tên" className="reg-input" style={{marginBottom: 0}}
                    value={regFirstName} onChange={e => setRegFirstName(e.target.value)}
                  />
                </div>
                
                <input 
                  type="email" placeholder="Email hoặc số di động" className="reg-input"
                  value={regEmail} onChange={e => setRegEmail(e.target.value)}
                />
                <input 
                  type="password" placeholder="Mật khẩu mới" className="reg-input"
                  value={regPassword} onChange={e => setRegPassword(e.target.value)}
                />

                <p style={{fontSize: '11px', color: '#777', marginTop: '10px', marginBottom: '10px'}}>
                  Bằng cách nhấp vào Đăng ký, bạn đồng ý với Điều khoản, Chính sách quyền riêng tư và Chính sách cookie của chúng tôi.
                </p>

                <button type="submit" className="btn-register-submit" disabled={isRegistering}>
                  {isRegistering ? "Đang xử lý..." : "Đăng ký"}
                </button>
              </form>
            </div>
            
          </div>
        </div>
      )}

      {/* =========================================
          GIAO DIỆN LOGIN CHÍNH
      ========================================= */}
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
            
            <form onSubmit={handleLoginSubmit}>
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
            
            {/* 👇 KÍCH HOẠT NÚT MỞ MODAL ĐĂNG KÝ 👇 */}
            <button onClick={() => setIsRegisterOpen(true)} className="btn-create">
              Tạo tài khoản mới
            </button>
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