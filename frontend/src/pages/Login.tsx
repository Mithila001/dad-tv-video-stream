import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";
import { loginUser } from "../services/api";

function getDashboardPath(role: UserRole) {
  return role === "Viewer" ? "/tv" : "/dashboard";
}

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Enter your username and password to continue.");
      return;
    }

    void loginUser(username.trim(), password)
      .then((currentUser) => {
        login(currentUser);
        navigate(getDashboardPath(currentUser.role), { replace: true });
      })
      .catch(() => {
        setError("Invalid credentials. Use admin/admin123 or tv-lobby/tv123.");
      });
  };

  return (
    <main className="login-main">
      <div className="login-container">
        <section className="login-card">
          <div className="login-info">
            <div>
              <p className="login-subtitle-tag">
                LobbyStream Secure Access
              </p>
              <h1 className="login-title">
                Sign in to continue
              </h1>
              <p className="login-description">
                Use the development credentials below to enter the operator
                dashboard or the TV display.
              </p>
            </div>

            <div className="login-test-accounts-box">
              <p className="login-test-accounts-title">Test accounts</p>
              <ul className="login-test-accounts-list">
                <li>Admin: admin / admin123</li>
                <li>TV Viewer: tv-lobby / tv123</li>
              </ul>
            </div>
          </div>

          <div className="login-form-side">
            <form className="login-form" onSubmit={handleSubmit}>
              <div>
                <label
                  className="form-label"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="form-input"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label
                  className="form-label"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="form-input"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <p className="form-error">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="form-submit-btn"
              >
                Sign in
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
