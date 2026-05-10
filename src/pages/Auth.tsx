"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return showError("Please enter email and password");
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showSuccess("Logged in successfully!");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showSuccess("Account created successfully!");
      }
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="bg-[#111] w-8 h-8 rounded-lg flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
            <rect x="2" y="2" width="5" height="5" rx="1"/>
            <rect x="9" y="2" width="5" height="5" rx="1"/>
            <rect x="2" y="9" width="5" height="5" rx="1"/>
            <rect x="9" y="9" width="5" height="5" rx="1"/>
          </svg>
        </div>
        <span className="text-[15px] font-medium text-[#111] tracking-tight">Remotion Studio</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-[#e8e8e6] rounded-2xl p-8 shadow-sm">
        <div className="mb-7">
          <h2 className="text-xl font-medium text-[#111] tracking-tight">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-sm text-[#888] mt-1">
            {isLogin ? 'Sign in to your workspace.' : 'Start generating videos today.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 bg-white border-[#e8e8e6] text-[#111] text-sm focus:border-[#111] focus:ring-0 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 bg-white border-[#e8e8e6] text-[#111] text-sm focus:border-[#111] focus:ring-0 rounded-lg"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-[#111] hover:bg-[#333] text-white text-sm font-medium rounded-lg mt-2 border-none"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isLogin ? 'Sign in' : 'Create account')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[#888]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#111] font-medium hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
