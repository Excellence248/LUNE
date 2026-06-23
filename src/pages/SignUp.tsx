"use client";

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, User, Lock, ShieldCheck, Loader2, RefreshCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, resendVerificationEmail } = useWallet();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const passwordRequirements = useMemo(() => [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'At least one special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ], []);

  const isPasswordValid = passwordRequirements.every(req => req.test(formData.password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      showError("Please meet all password requirements.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.username);
    
    if (error) {
      showError(error.message);
      setLoading(false);
    } else {
      setIsVerifying(true);
      showSuccess("Account created! Please verify your email.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await resendVerificationEmail(formData.email);
    
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Verification email resent!");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {!isVerifying ? (
          <motion.div 
            key="signup-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)] mb-6">
                <Zap className="text-white fill-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
              <p className="text-gray-500 mt-2">Join the future of social finance</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <Input 
                      id="username" 
                      placeholder="solana_legend" 
                      className="bg-black/40 border-white/10 pl-12 h-12 rounded-xl focus:ring-purple-500/20"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="bg-black/40 border-white/10 pl-12 h-12 rounded-xl focus:ring-purple-500/20"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-black/40 border-white/10 pl-12 h-12 rounded-xl focus:ring-purple-500/20"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                  
                  {/* Password Strength Indicator */}
                  <div className="pt-2 space-y-1.5">
                    {passwordRequirements.map((req, i) => {
                      const isMet = req.test(formData.password);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                            isMet ? "bg-green-500/20 text-green-500" : "bg-white/5 text-gray-600"
                          )}>
                            {isMet ? <Check size={10} /> : <X size={10} />}
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium transition-colors",
                            isMet ? "text-green-500/70" : "text-gray-500"
                          )}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || !isPasswordValid} 
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
                </Button>
              </form>
            </div>

            <p className="text-center mt-8 text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/signin" className="text-purple-400 font-bold hover:underline">Sign In</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="verification-screen"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md relative z-10 text-center"
          >
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
              <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Mail className="text-purple-400 w-10 h-10" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                We've sent a verification link to <span className="text-white font-bold">{formData.email}</span>.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={handleResend} 
                  disabled={resending}
                  variant="outline" 
                  className="w-full border-white/10 hover:bg-white/5 flex items-center justify-center gap-2"
                >
                  {resending ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                  Resend Email
                </Button>
                
                <Button onClick={() => navigate('/signin')} className="w-full bg-white text-black hover:bg-gray-200">
                  Back to Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignUp;