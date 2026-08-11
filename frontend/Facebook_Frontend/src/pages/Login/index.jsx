import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from '../../shared/appToast';
import api from "../../services/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
import { translateCatalogKey } from '../../shared/localizationRuntime';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const getApiErrorMessage = (error, fallback) => {
  if (!error.response) {
    return translateCatalogKey('auth.apiUnavailable');
  }

  const status = error.response.status;
  const data = error.response.data;
  const serverMessage = data?.message || data?.title || data?.error || data?.errorCode;

  if (status === 401) return translateCatalogKey('auth.invalidCredentials');
  if (status === 403) return serverMessage || translateCatalogKey('auth.accessDenied');
  if (status >= 500) return serverMessage || translateCatalogKey('auth.serverError');
  return serverMessage || fallback;
};

const LoginPage = ({ mode = "user" }) => {
  const isAdminLogin = mode === "admin";
  const [email, setEmail] = useState(isAdminLogin ? "" : "alice@fbclone.com");
  const [password, setPassword] = useState(isAdminLogin ? "" : "123456");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminLogin || !isAuthenticated) return;

    if (user?.isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }

    logout();
  }, [isAdminLogin, isAuthenticated, user, logout, navigate]);

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
      const loggedInUser = await login(accessToken, refreshToken);

      if (isAdminLogin && !loggedInUser?.isAdmin) {
        await logout();
        const message = translateCatalogKey('auth.adminAccessRequired');
        setError(message);
        toast.error(message, { id: loadingToast, duration: 6000 });
        return;
      }

      toast.success(translateCatalogKey('ui.pages.login.index.ang-nhap-thanh-cong.90a07943'), { id: loadingToast });
      navigate((isAdminLogin || loggedInUser?.isAdmin) ? "/admin" : "/");
    } catch (err) {
      const message = getApiErrorMessage(err, translateCatalogKey('ui.pages.login.index.ang-nhap-that-bai-kiem-tra-lai-thong.b27685a6'));
      setError(message);
      toast.apiError(err, message, { id: loadingToast, duration: 8000, context: isAdminLogin ? "auth.admin.login" : "auth.user.login" });
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
      toast.apiError(err, message, { id: loadingToast, duration: 8000, context: "auth.register" });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={`login-container${isAdminLogin ? " admin-login-container" : ""}`}>
      {!isAdminLogin && (
        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogContent className="register-modal sm:max-w-md">
            <DialogHeader className="register-header">
              <DialogTitle>{translateCatalogKey('ui.pages.login.index.ang-ky.0794f093')}</DialogTitle>
              <DialogDescription>{translateCatalogKey('ui.pages.login.index.nhanh-chong-va-de-dang.83ceb7e4')}</DialogDescription>
            </DialogHeader>

            <div className="register-body">
              {regError && <div className="login-error">{regError}</div>}

              <form onSubmit={handleRegisterSubmit}>
                <div className="name-row">
                  <Input
                    type="text"
                    placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.ho.10d03a7e')}
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regLastName}
                    onChange={(event) => setRegLastName(event.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder={translateCatalogKey('ui.components.profile.editprofilemodal.ten.918728cd')}
                    className="reg-input"
                    style={{ marginBottom: 0 }}
                    value={regFirstName}
                    onChange={(event) => setRegFirstName(event.target.value)}
                  />
                </div>

                <Input
                  type="email"
                  placeholder={translateCatalogKey('ui.pages.login.index.email-hoac-so-di-ong.873c016b')}
                  className="reg-input"
                  value={regEmail}
                  onChange={(event) => setRegEmail(event.target.value)}
                />
                <Input
                  type="password"
                  placeholder={translateCatalogKey('ui.pages.login.index.mat-khau-moi.db7f0bbe')}
                  className="reg-input"
                  value={regPassword}
                  onChange={(event) => setRegPassword(event.target.value)}
                />

                <p className="register-policy-text">
                  {translateCatalogKey('ui.pages.login.index.bang-cach-nhap-vao-ang-ky-ban-ong-y-.c11f3c6a')}
                </p>

                <Button type="submit" className="btn-register-submit" disabled={isRegistering}>
                  {isRegistering ? translateCatalogKey('common.processing') : translateCatalogKey('ui.pages.login.index.ang-ky.0794f093')}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="login-content">
        <div className="login-left">
          {isAdminLogin ? (
            <div className="admin-login-brand">
              <span>Admin Panel</span>
              <h1>{translateCatalogKey('ui.pages.login.index.facebook-clone-admin.db931840')}</h1>
                <p>{translateCatalogKey('auth.adminLoginDescription')}</p>
            </div>
          ) : (
            <>
              <img
                src="https://static.xx.fbcdn.net/rsrc.php/y1/r/4lCu2zih0ca.svg"
                alt="Facebook"
                className="fb-logo"
              />
              <h2 className="login-slogan">
                {translateCatalogKey('ui.pages.login.index.facebook-giup-ban-ket-noi-va-chia-se.ce7608bc')}
              </h2>
            </>
          )}
        </div>

        <div className="login-right">
          <Card className={`login-card${isAdminLogin ? " admin-login-card" : ""}`}>
            <CardContent className="login-card-content">
            {isAdminLogin && (
              <div className="admin-login-card-header">
                <h2>{translateCatalogKey('auth.adminLoginTitle')}</h2>
                <p>{translateCatalogKey('auth.adminLoginHint')}</p>
              </div>
            )}
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleLoginSubmit}>
              <Input
                type="email"
                placeholder={translateCatalogKey('ui.pages.login.index.email-hoac-so-ien-thoai.2cdce0dc')}
                className="login-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                type="password"
                placeholder={translateCatalogKey('ui.pages.login.index.mat-khau.79f20c1e')}
                className="login-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button type="submit" className="btn-login" disabled={isLoggingIn}>
                {isLoggingIn ? translateCatalogKey('ui.pages.login.index.ang-ang-nhap.06e78dfd') : translateCatalogKey('ui.pages.login.index.ang-nhap.ab7a3f30')}
              </Button>
            </form>

            {!isAdminLogin && (
              <>
                <a href="#" className="forgot-link">{translateCatalogKey('ui.pages.login.index.quen-mat-khau.7e084716')}</a>
                <div className="divider" />

                <Button onClick={() => setIsRegisterOpen(true)} className="btn-create" type="button">
                  {translateCatalogKey('ui.pages.login.index.tao-tai-khoan-moi.70069e6d')}
                </Button>
              </>
            )}
            </CardContent>
          </Card>

          {!isAdminLogin && (
            <p className="create-page-text">
              <b>{translateCatalogKey('ui.pages.login.index.tao-trang.db011044')}</b> {translateCatalogKey('ui.pages.login.index.danh-cho-nguoi-noi-tieng-thuong-hieu.52d55447')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
