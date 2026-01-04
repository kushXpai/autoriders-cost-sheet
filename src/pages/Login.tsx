import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Sparkles, Lock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/assets/logos/autoriders.webp';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Login error',
        description: 'Something went wrong while signing in.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title with Animation */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center mb-4 transform transition-transform hover:scale-110 duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <img
                src={Logo}
                alt="Autoriders"
                className="h-20 w-auto object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          <div className="space-y-2 animate-fade-in">
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Cost Sheet Management
            </h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Sign in to manage cost sheets and approvals
            </p>
          </div>
        </div>

        {/* Login Card with Enhanced Design */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transform transition-all duration-300 hover:shadow-blue-500/20 hover:shadow-3xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-display bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                    emailFocused ? 'text-blue-500' : 'text-muted-foreground'
                  }`} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@carrental.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    autoComplete="email"
                    className={`h-12 pl-11 pr-4 transition-all duration-200 ${
                      emailFocused 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'border-border hover:border-blue-300'
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                    passwordFocused ? 'text-blue-500' : 'text-muted-foreground'
                  }`} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoComplete="current-password"
                    className={`h-12 pl-11 pr-12 transition-all duration-200 ${
                      passwordFocused 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'border-border hover:border-blue-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-blue-500 transition-all duration-200 hover:scale-110"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Sign In Securely
                  </div>
                )}
              </Button>
            </form>

            {/* Additional Info */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Your credentials are encrypted and secure
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>© 2024 Autoriders. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}