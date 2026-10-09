import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";

// Brand icons rendered inline so we don't pull an icon package for two glyphs.
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.57.38-2.29V6.62H1.29a11.86 11.86 0 0 0 0 10.76l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path fill="#F25022" d="M1 1h10.4v10.4H1z" />
    <path fill="#7FBA00" d="M12.6 1H23v10.4H12.6z" />
    <path fill="#00A4EF" d="M1 12.6h10.4V23H1z" />
    <path fill="#FFB900" d="M12.6 12.6H23V23H12.6z" />
  </svg>
);

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuthContext();
  const [searchParams] = useSearchParams();
  // Validated once; preserves e.g. the MCP consent URL through every login method.
  const nextPath = oauthReturnPath(searchParams.get("next"));
  const absoluteNext = new URL(nextPath, window.location.origin).href;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center shadow-sovereign"
        >
          <span className="text-tf-substrate font-bold text-xl">TF</span>
        </motion.div>
      </div>
    );
  }

  if (user) return <Navigate to={nextPath} replace />;

  const handleSocialSignIn = async (provider: "google" | "microsoft") => {
    // Full-page OAuth redirects must land on a public callback route that
    // stores the returned session — never on a protected route, where the
    // tokens would sit in the URL unconsumed and the user lands signed out.
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: callbackUrl,
    });
    if (result.error) {
      toast({ title: "Sign in failed", description: result.error.message, variant: "destructive" });
    }
    // When result.redirected is true the browser is heading to the provider — nothing to do.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName, absoluteNext);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent a confirmation link to verify your account." });
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center shadow-sovereign mb-4"
          >
            <span className="text-tf-substrate font-bold text-xl">TF</span>
          </motion.div>
          <h1 className="text-2xl font-light text-[hsl(var(--tf-transcend-cyan))]">TerraFusion OS</h1>
          <p className="text-sm text-muted-foreground mt-1">Sovereign Valuation Intelligence</p>
        </div>

        {/* Form */}
        <div className="material-bento rounded-2xl p-8">
          <h2 className="text-lg font-medium text-foreground mb-6">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm text-muted-foreground">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-muted/50 border-border/50 focus:border-tf-cyan/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@county.gov"
                required
                className="bg-muted/50 border-border/50 focus:border-tf-cyan/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-muted/50 border-border/50 focus:border-tf-cyan/50"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full btn-sovereign rounded-xl h-11"
            >
              {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleSocialSignIn("google")}
              className="rounded-xl h-11 bg-muted/50 border-border/50 hover:border-tf-cyan/50"
            >
              <GoogleIcon />
              <span className="ml-2">Google</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => handleSocialSignIn("microsoft")}
              className="rounded-xl h-11 bg-muted/50 border-border/50 hover:border-tf-cyan/50"
            >
              <MicrosoftIcon />
              <span className="ml-2">Microsoft</span>
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-tf-cyan transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
