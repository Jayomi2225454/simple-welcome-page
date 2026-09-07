import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Phone, Gamepad2, ArrowLeft } from 'lucide-react';

const Auth = forwardRef<HTMLDivElement>((_, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ emailOrPhone: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', name: '', inGameName: '', phoneNumber: '' });
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordInput, setForgotPasswordInput] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('reset=true') || window.location.pathname === '/reset-password';

    if (isRecovery) {
      setIsRecoveryMode(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && !isRecoveryMode) {
      navigate('/');
    }
  }, [user, isRecoveryMode, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email = loginData.emailOrPhone.trim();
      
      const isPhone = /^[\d+\-\s()]+$/.test(email) && email.replace(/\D/g, '').length >= 7;
      if (isPhone) {
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_phone', { phone: email });
        
        if (lookupError || !foundEmail) {
          toast({
            title: "Login Failed",
            description: "No account found with this phone number.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        email = foundEmail;
      }

      const { error } = await signIn(email, loginData.password);
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!signupData.phoneNumber.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter your phone number.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(signupData.email, signupData.password, signupData.name, signupData.inGameName);
      
      if (!error) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.from('profiles').update({ 
            phone_number: signupData.phoneNumber,
            in_game_name: signupData.inGameName,
          }).eq('user_id', newUser.id);
        }
      }
      
      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Welcome to Battle Mitra! You're now logged in.",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter your email or phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let email = forgotPasswordInput.trim();
      const isPhone = /^[\d+\-\s()]+$/.test(email) && email.replace(/\D/g, '').length >= 7;

      if (isPhone) {
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_phone', { phone: email });

        if (lookupError || !foundEmail) {
          toast({
            title: "Account Not Found",
            description: "No account found with this phone number.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        email = foundEmail;
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetSubmitted(true);
        toast({
          title: "Reset Link Sent",
          description: "Check your email for the password reset link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated!",
          description: "Your password has been changed successfully.",
        });
        setIsRecoveryMode(false);
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 mt-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/b263082d-907f-4305-88f6-cda9b8e2ecac.png" 
              alt="Battle Mitra Logo" 
              className="w-36 h-36 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Battle Mitra</h1>
          <p className="text-gray-400">Join the ultimate esports platform</p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            {isRecoveryMode ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">Set New Password</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Create a strong new password for your Battle Mitra account.
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-white">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password (min 6 characters)"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </form>
              </div>
            ) : isForgotPassword ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSubmitted(false);
                    }}
                    className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
                  </button>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">Reset Password</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Enter your registered email or phone number to receive a password reset link.
                  </p>
                </div>

                {resetSubmitted ? (
                  <div className="space-y-4 py-2">
                    <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg text-sm text-purple-200">
                      If an account exists with the provided details, a password reset link has been sent to the registered email address. Please check your inbox and spam folder.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setResetSubmitted(false);
                      }}
                      className="w-full border-gray-600 text-white hover:bg-gray-700"
                    >
                      Return to Login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-white">Email / Phone Number</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="forgot-email"
                          type="text"
                          placeholder="Enter your email or phone number"
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                          value={forgotPasswordInput}
                          onChange={(e) => setForgotPasswordInput(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white">Email / Phone Number</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="Enter your email or phone number"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={loginData.emailOrPhone}
                        onChange={(e) => setLoginData({ ...loginData, emailOrPhone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-white">Password</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setResetSubmitted(false);
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone" className="text-white">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={signupData.phoneNumber}
                        onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-white">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="in-game-name" className="text-white">In Game Name</Label>
                    <div className="relative">
                      <Gamepad2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="in-game-name"
                        type="text"
                        placeholder="Ex - battlemitra@"
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                        value={signupData.inGameName}
                        onChange={(e) => setSignupData({ ...signupData, inGameName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

Auth.displayName = 'Auth';

export default Auth;
