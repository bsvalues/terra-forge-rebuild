import { motion } from "framer-motion";
import { Search, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/contexts/AuthContext";

interface SovereignHeaderProps {
  moduleTitle: string;
  moduleDescription?: string;
}

export function SovereignHeader({ moduleTitle, moduleDescription }: SovereignHeaderProps) {
  const { profile } = useAuthContext();

  return (
    <header className="sticky top-0 z-30 material-shell border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={moduleTitle}
            className="flex items-center gap-3"
          >
            <div className="w-2 h-8 bg-gradient-to-b from-tf-cyan to-tf-green rounded-full" />
            <div>
              <h2 className="text-xl font-light text-foreground">{moduleTitle}</h2>
              {moduleDescription && (
                <p className="text-xs text-muted-foreground">{moduleDescription}</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search properties, models, data..."
              className="pl-10 bg-muted/50 border-border/50 focus:border-tf-cyan/50"
            />
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* AI Status */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tf-green/10 border border-tf-green/30"
          >
            <Zap className="w-3.5 h-3.5 text-tf-green" />
            <span className="text-xs font-medium text-tf-green">AI Active</span>
          </motion.div>

          {/* User */}
          <Button variant="ghost" size="icon" className="rounded-full" title={profile?.display_name || "User"}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tf-cyan to-tf-green flex items-center justify-center">
              <User className="w-4 h-4 text-tf-substrate" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
