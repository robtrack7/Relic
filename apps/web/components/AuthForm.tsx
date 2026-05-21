import Link from "next/link";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthForm({ mode, action, error }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="eyebrow">Relic account</div>
        <h1 className="display-title">{isSignUp ? "Create GM account" : "Sign in"}</h1>
        <p className="muted">
          Use email and password to enter The Sanctum. Supabase Auth owns the session.
        </p>
        {error ? <p className="danger-note">{error}</p> : null}
        <form className="form-stack" action={action}>
          <label className="field">
            <span>Email</span>
            <input className="input" name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" name="password" type="password" required autoComplete={isSignUp ? "new-password" : "current-password"} />
          </label>
          <button className="button" type="submit">{isSignUp ? "Create account" : "Sign in"}</button>
        </form>
        <p className="small muted">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}>
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </section>
    </main>
  );
}
