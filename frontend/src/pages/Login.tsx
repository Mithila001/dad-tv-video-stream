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
    <main className="min-h-screen bg-linear-to-b from-bg via-surface/40 to-bg px-4 py-8 text-text sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center">
        <section className="grid w-full gap-0 overflow-hidden rounded-4xl border border-border bg-surface/90 shadow-panel lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 border-b border-border/70 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-text-muted">
                LobbyStream Secure Access
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text md:text-5xl">
                Sign in to continue
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted md:text-base">
                Use the development credentials below to enter the operator
                dashboard or the TV display.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-bg/70 p-5 text-sm text-text-muted">
              <p className="font-semibold text-text">Test accounts</p>
              <ul className="mt-3 space-y-2">
                <li>Admin: admin / admin123</li>
                <li>TV Viewer: tv-lobby / tv123</li>
              </ul>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  className="text-sm font-semibold text-text"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-bg/80 px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-text"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-bg/80 px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
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
