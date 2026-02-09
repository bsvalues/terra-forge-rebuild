import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();

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

  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}
