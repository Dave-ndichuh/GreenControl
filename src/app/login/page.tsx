'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Leaf, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center justify-center mb-8 text-emerald-400">
          <div className="h-16 w-16 bg-emerald-950/50 rounded-full flex items-center justify-center border border-emerald-500/30 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">GreenControl</h1>
          <p className="text-emerald-500/80 font-medium tracking-widest uppercase text-sm mt-1">Farmhouse Access</p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600" />
          
          <CardHeader className="space-y-1 pt-8 pb-4 text-center">
            <CardTitle className="text-2xl text-white">
              {isLogin ? 'Secure Login' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isLogin ? 'Enter your credentials to access telemetry.' : 'Register a new admin account.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-3 py-2 rounded-md flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md shadow-lg shadow-emerald-900/50 transition-all mt-6"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Access Dashboard' : 'Create Account')}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col border-t border-slate-800 bg-slate-900/50 py-4 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </CardFooter>
        </Card>
        
      </div>
    </div>
  );
}
