"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

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
    <div className="min-h-screen bg-[#1e1e1e] flex flex-col items-center justify-center p-4 text-[#cccccc]">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-[#2d8ceb] p-2 rounded-xl shadow-lg">
          <Video className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#ffffff] tracking-tight">Remotion Studio</h1>
      </div>

      <Card className="w-full max-w-md p-6 bg-[#232323] border-[#444444] shadow-2xl rounded-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[#ffffff]">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-sm text-[#888888] mt-1">
            {isLogin ? 'Sign in to access your video projects.' : 'Sign up to start generating videos.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">Email Address</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              className="bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb] h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">Password</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb] h-10"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#2d8ceb] hover:bg-[#2576c7] text-white h-10 font-bold rounded-xl mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[#888888]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-[#2d8ceb] hover:text-[#5fa8f0] font-bold transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;