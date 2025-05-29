import React from 'react';
    import { motion } from 'framer-motion';
    import { useTheme } from '@/contexts/ThemeContext';
    import { Sun, Moon } from 'lucide-react';
    import { Button } from '@/components/ui/button';

    const AuthLayout = ({ children }) => {
      const { theme, toggleTheme } = useTheme();

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4 relative overflow-hidden">
          <div className="absolute top-4 right-4 z-10">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary">
              {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </Button>
          </div>
          
          <motion.div 
            className="absolute inset-0 opacity-20 dark:opacity-10"
            animate={{
              backgroundImage: [
                "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 40%)",
                "radial-gradient(circle at 80% 30%, hsl(var(--accent)) 0%, transparent 40%)",
                "radial-gradient(circle at 30% 80%, hsl(var(--secondary)) 0%, transparent 40%)",
                "radial-gradient(circle at 70% 70%, hsl(var(--primary)) 0%, transparent 40%)",
              ],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "mirror",
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center w-full">
            {children}
          </div>

          <footer className="absolute bottom-4 text-center w-full text-muted-foreground text-sm z-10">
            <p>&copy; {new Date().getFullYear()} POS Pro. All rights reserved.</p>
            <p>Streamlining Your Business, One Transaction at a Time.</p>
          </footer>
        </div>
      );
    };

    export default AuthLayout;