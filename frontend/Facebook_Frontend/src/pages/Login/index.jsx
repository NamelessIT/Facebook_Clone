import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import api from "../../services/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
import { translateCatalogKey } from '../../shared/localizationRuntime';

const getApiErrorMessage = (error, fallback) => {
  if (!error.response) {
    return translateCatalogKey('auth.apiUnavailable');
  }

  const status = error.response.status;
  const data = error.response.data;
  const serverMessage = data?.message || data?.title || data?.error || data?.errorCode;

  if (status === 401) return serverMessage || translateCatalogKey('auth.invalidCredentials');
  if (status === 403) return serverMessage || translateCatalogKey('auth.accessDenied');
  if (status >= 500) return serverMessage || translateCatalogKey('auth.serverError');
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
      const message = translateCatalogKey('auth.credentialsRequired');
      setError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading(translateCatalogKey('ui.pages.login.index.ang-ang-nhap.06e78dfd'));
    setIsLoggingIn(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { accessToken, refreshToken } = response.data.data;
      await login(accessToken, refreshToken);

      toast.success(translateCatalogKey('ui.pages.login.index.ang-nhap-thanh-cong.90a07943'), { id: loadingToast });
      navigate("/");
    } catch (err) {
      const message = getApiErrorMessage(err, translateCatalogKey('ui.pages.login.index.ang-nhap-that-bai-kiem-tra-lai-thong.b27685a6'));
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
      const message = translateCatalogKey('auth.registrationFieldsRequired');
      setRegError(message);
      toast.error(message);
      return;
    }

    const loadingToast = toast.loading(translateCatalogKey('ui.pages.login.index.ang-tao-tai-khoan.5c7501cb'));
    setIsRegistering(true);

    try {
      await api.post("/auth/register", {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });

      toast.success(translateCatalogKey('ui.pages.login.index.ang-ky-thanh-cong-ban-co-the-ang-nha.e0565649'), { id: loadingToast });
      setEmail(regEmail.trim());
      setPassword(regPassword);
      setIsRegisterOpen(false);
      setRegFirstName("");
      setRegLastName("");
      setRegEmail("");
      setRegPassword("");
    } catch (err) {
      const message = getApiErrorMessage(err, translateCatalogKey('ui.pages.login.index.ang-ky-that-bai-email-co-the-a-ton-t.409f0ce9'));
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
              <h2>{translateCatalogKey('ui.pages.login.index.ang-ky.0794f093')}</h2>
              <p>{translateCatalogKey('ui.pages.login.index.nhanh-chong-va-de-dang.83ceb7e4')}</p>
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
                    placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.ho.10d03a7e')}
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regLastName}
                    onChange={(event) => setRegLastName(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.ten.918728cd')}
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regFirstName}
                    onChange={(event) => setRegFirstName(event.target.value)}
                  />
                </div>

                <input
                  type="email"
                  placeholder={translateCatalogKey('ui.pages.login.index.email-hoac-so-di-ong.873c016b')}
                  className="reg-input"
                  value={regEmail}
                  onChange={(event) => setRegEmail(event.target.value)}
                />
                <input
                  type="password"
                  placeholder={translateCatalogKey('ui.pages.login.index.mat-khau-moi.db7f0bbe')}
                  className="reg-input"
                  value={regPassword}
                  onChange={(event) => setRegPassword(event.target.value)}
                />

                <p className="register-policy-text">
                  {translateCatalogKey('ui.pages.login.index.bang-cach-nhap-vao-ang-ky-ban-ong-y-.c11f3c6a')}
                </p>

                <button type="submit" className="btn-register-submit" disabled={isRegistering}>
                  {isRegistering ? translateCatalogKey('common.processing') : translateCatalogKey('ui.pages.login.index.ang-ky.0794f093')}
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
            {translateCatalogKey('ui.pages.login.index.facebook-giup-ban-ket-noi-va-chia-se.ce7608bc')}
          </h2>
        </div>

        <div className="login-right">
          <div className="login-card">
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleLoginSubmit}>
              <input
                type="email"
                placeholder={translateCatalogKey('ui.pages.login.index.email-hoac-so-ien-thoai.2cdce0dc')}
                className="login-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                type="password"
                placeholder={translateCatalogKey('ui.pages.login.index.mat-khau.79f20c1e')}
                className="login-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="submit" className="btn-login" disabled={isLoggingIn}>
                {isLoggingIn ? translateCatalogKey('ui.pages.login.index.ang-ang-nhap.06e78dfd') : translateCatalogKey('ui.pages.login.index.ang-nhap.ab7a3f30')}
              </button>
            </form>

            <a href="#" className="forgot-link">{translateCatalogKey('ui.pages.login.index.quen-mat-khau.7e084716')}</a>
            <div className="divider" />

            <button onClick={() => setIsRegisterOpen(true)} className="btn-create" type="button">
              {translateCatalogKey('ui.pages.login.index.tao-tai-khoan-moi.70069e6d')}
            </button>
          </div>

          <p className="create-page-text">
            <b>{translateCatalogKey('ui.pages.login.index.tao-trang.db011044')}</b> {translateCatalogKey('ui.pages.login.index.danh-cho-nguoi-noi-tieng-thuong-hieu.52d55447')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
