"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { showSuccess, showError } from "@/utils/toast";

const SignIn = () => {
  const navigate = useNavigate();
  const { signIn, signInWithOtp, resetPassword, isAuthenticated } = useWallet();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "password") {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        showError(error.message);
        setLoading(false);
      } else {
        showSuccess("Welcome back!");
        navigate("/");
      }
    } else {
      const { error } = await signInWithOtp(formData.email);
      if (error) {
        showError(error.message);
      } else {
        showSuccess("Magic link sent to your email!");
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      showError("Please enter your email first.");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(formData.email);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Password reset link sent!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)] mb-6">
            <Zap className="text-white fill-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 mt-2">
            {mode === "password"
              ? "Sign in with your credentials"
              : "Sign in with a magic link"}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="bg-black/40 border-white/10 pl-12 h-12 rounded-xl focus:ring-purple-500/20"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === "password" && (
                <motion.div
                  key="password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-purple-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={18}
                    />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-black/40 border-white/10 pl-12 h-12 rounded-xl focus:ring-purple-500/20"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={mode === "password"}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 font-bold rounded-xl shadow-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : mode === "password" ? (
                "Sign In"
              ) : (
                "Send Magic Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === "password" ? "otp" : "password")}
              className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 mx-auto"
            >
              <Key size={16} />
              {mode === "password"
                ? "Use Magic Link instead"
                : "Use Password instead"}
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-500 text-sm">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-purple-400 font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignIn;