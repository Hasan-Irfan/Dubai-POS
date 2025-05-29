import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSignupMutation } from '@/api/authApi';
import { useDispatch } from 'react-redux';
import { setUser, setError } from '@/services/userSlice';

const SignupPage = () => {
  const navigate = useNavigate();
const { toast } = useToast();
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [signup] = useSignupMutation();
const dispatch = useDispatch();

useEffect(() => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    navigate("/homepage");
  }
}, [navigate]);

const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!username || !email || !password) {
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: "All fields (username, email, password) are required.",
    });
    return;
  }

  if (!validateEmail(email)) {
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: "Please enter a valid email address.",
    });
    return;
  }

  if (password.length < 6) {
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: "Password must be at least 6 characters long.",
    });
    return;
  }

  if (password !== confirmPassword) {
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: "Passwords do not match.",
    });
    return;
  }

  setIsLoading(true);
  try {
    const user = await signup({ username, email, password }).unwrap();
    dispatch(setUser(user));
    navigate("/login");
  } catch (error) {
    dispatch(setError(error));
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: error.data?.message || error.message || "An error occurred.",
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <Card className="shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img alt="Company Logo" className="h-12 w-auto" src="https://images.unsplash.com/photo-1478876953436-998272dda917" />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Join us and manage your business efficiently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="YourUsername"
                  required
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity duration-300" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SignupPage;