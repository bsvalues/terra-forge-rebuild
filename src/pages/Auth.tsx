import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuthContext();
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

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
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
          <h1 className="text-2xl font-light text-gradient-sovereign">TerraFusion OS</h1>
          <p className="text-sm text-muted-foreground mt-1">Sovereign Valuation Intelligence</p>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-8">
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
