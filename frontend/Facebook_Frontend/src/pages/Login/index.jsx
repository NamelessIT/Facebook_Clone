import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import api from "../../services/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";

const getApiErrorMessage = (error, fallback) => {
  if (!error.response) {
    return "Không kết nối được API. Kiểm tra backend có đang chạy ở localhost:5286 không.";
  }

  const status = error.response.status;
  const data = error.response.data;
  const serverMessage = data?.message || data?.title || data?.error || data?.errorCode;

  if (status === 401) return serverMessage || "Email hoặc mật khẩu không đúng.";
  if (status === 403) return serverMessage || "Tài khoản không có quyền truy cập hoặc đã bị chặn.";
  if (status >= 500) return serverMessage || "Backend đang lỗi 500. Xem terminal backend để biết chi tiết.";
  return serverMessage || fallback;
};

const LoginPage = () => {
  const [email, setEmail] = useState("alice@fbclone.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      const message = "Vui lòng nhập email và mật khẩu.";
      setError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading("Đang đăng nhập...");
    setIsLoggingIn(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { accessToken, refreshToken } = response.data.data;
      await login(accessToken, refreshToken);

      toast.success("Đăng nhập thành công.", { id: loadingToast });
      navigate("/");
    } catch (err) {
      const message = getApiErrorMessage(err, "Đăng nhập thất bại. Kiểm tra lại thông tin.");
      setError(message);
      toast.error(message, { id: loadingToast, duration: 6000 });
      console.error("Login failed:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setRegError("");

    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword) {
      const message = "Vui lòng điền đầy đủ thông tin.";
      setRegError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading("Đang tạo tài khoản...");
    setIsRegistering(true);

    try {
      await api.post("/auth/register", {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });

      toast.success("Đăng ký thành công. Bạn có thể đăng nhập ngay.", { id: loadingToast });
      setEmail(regEmail.trim());
      setPassword(regPassword);
      setIsRegisterOpen(false);
      setRegFirstName("");
      setRegLastName("");
      setRegEmail("");
      setRegPassword("");
    } catch (err) {
      const message = getApiErrorMessage(err, "Đăng ký thất bại. Email có thể đã tồn tại.");
      setRegError(message);
      toast.error(message, { id: loadingToast, duration: 6000 });
      console.error("Register failed:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="login-container">
      {isRegisterOpen && (
        <div className="register-overlay" onMouseDown={() => setIsRegisterOpen(false)}>
          <div className="register-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="register-header">
              <h2>Đăng ký</h2>
              <p>Nhanh chóng và dễ dàng.</p>
              <button onClick={() => setIsRegisterOpen(false)} className="close-register-btn" type="button">
                <X size={24} />
              </button>
            </div>

            <div className="register-body">
              {regError && <div className="login-error">{regError}</div>}

              <form onSubmit={handleRegisterSubmit}>
                <div className="name-row">
                  <input
                    type="text"
                    placeholder="Họ"
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regLastName}
                    onChange={(event) => setRegLastName(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Tên"
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regFirstName}
                    onChange={(event) => setRegFirstName(event.target.value)}
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email hoặc số di động"
                  className="reg-input"
                  value={regEmail}
                  onChange={(event) => setRegEmail(event.target.value)}
                />
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  className="reg-input"
                  value={regPassword}
                  onChange={(event) => setRegPassword(event.target.value)}
                />

                <p className="register-policy-text">
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

      <div className="login-content">
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

        <div className="login-right">
          <div className="login-card">
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleLoginSubmit}>
              <input
                type="email"
                placeholder="Email hoặc số điện thoại"
                className="login-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                type="password"
                placeholder="Mật khẩu"
                className="login-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit" className="btn-login" disabled={isLoggingIn}>
                {isLoggingIn ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <a href="#" className="forgot-link">Quên mật khẩu?</a>
            <div className="divider" />

            <button onClick={() => setIsRegisterOpen(true)} className="btn-create" type="button">
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
