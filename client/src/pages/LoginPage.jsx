import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useLoginMutation } from '@/api/authApi';
import { useDispatch } from 'react-redux';
import { setUser, setError } from '@/services/userSlice';

const LoginPage = () => {
  // const navigate = useNavigate();
  // const location = useLocation();
  // const { toast } = useToast();
  // const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  // const [login] = useLoginMutation();
  // const dispatch = useDispatch();

  // const from = location.state?.from?.pathname || "/";

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   try {
  //     const user = await login({ email, password }).unwrap();
  //     dispatch(setUser(user));
  //     navigate(from, { replace: true });
  //   } catch (error) {
  //     dispatch(setError(error));
  //     toast({
  //       title: "Login Failed",
  //       description: error.message,
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); 
  const dispatch = useDispatch();
  const { toast } = useToast();
  
  const [login, { isLoading }] = useLoginMutation(); 
  
  useEffect(() => {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    if (username && role) {
      navigate("/");
    }
  }, [navigate]);
  
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!email || !password) {
      toast({
        title: "Login Failed",
        description: "All fields (email, password) are required.",
        variant: "destructive",
      });
      return;
    }
  
    if (!validateEmail(email)) {
      toast({
        title: "Login Failed",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      const response = await login({ email, password }).unwrap();
      const { success, user } = response;
      const { id, username, role } = user;
  
      console.log(response);
  
      localStorage.setItem("email", email);
      localStorage.setItem("username", username);
      localStorage.setItem("role", role);
      localStorage.setItem("userID", id);
      if (success) {
        dispatch(setUser({ username, userID: id, role ,email}));
        toast({
          title: "Login Successful",
          description: response.message,
          variant: "default",
        });
        setTimeout(() => {
          navigate("/");
        }, 500);
      }
    } catch (err) {
      toast({
        title: "Login Failed",
        description: "Error please try again: " + (err?.data?.message || err.message),
        variant: "destructive",
      });
      console.log("Error :", err?.data?.message);
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
            <img alt="Company Logo" className="h-12 w-auto" src="https://images.unsplash.com/photo-1661229978118-fc02b873bdaf" />
          </div>
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            Welcome Back!
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your POS dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/reset-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
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
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity duration-300" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default LoginPage;