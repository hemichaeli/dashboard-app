'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(provider);
    setError('');
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-12f2.up.railway.app';
      window.location.href = `${backendUrl}/api/auth/${provider.toLowerCase()}`;
    } catch (err) {
      setError(`${provider} login is not configured yet. Please use email login.`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#101622] flex flex-col text-white font-display antialiased">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#135bec] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto relative z-10">
        {/* Header Section */}
        <div className="w-full flex flex-col items-center text-center mb-8">
          {/* Logo Icon */}
          <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-[#135bec] to-blue-700 flex items-center justify-center shadow-lg shadow-[#135bec]/20">
            <span className="material-symbols-outlined text-white text-3xl">graphic_eq</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-[#92a4c9] text-base font-normal leading-relaxed">
            Sign in to access your tactical meeting intelligence.
          </p>
        </div>

        {/* Login Form */}
        <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="w-full">
            <label className="block text-white text-sm font-medium mb-2 ml-1" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#92a4c9] text-[20px]">mail</span>
              </div>
              <input 
                id="email" 
                type="email" 
                autoComplete="email" 
                {...register('email')} 
                className="block w-full rounded-lg border border-[#324467] bg-[#192233] text-white focus:border-[#135bec] focus:ring-[#135bec] h-14 pl-11 pr-4 text-base placeholder:text-[#92a4c9] transition-colors duration-200 outline-none"
                placeholder="name@company.com" 
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-400 ml-1">{errors.email.message}</p>}
          </div>

          {/* Password Field */}
          <div className="w-full">
            <label className="block text-white text-sm font-medium mb-2 ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <span className="material-symbols-outlined text-[#92a4c9] text-[20px]">lock</span>
              </div>
              <input 
                id="password" 
                type={showPassword ? 'text' : 'password'} 
                autoComplete="current-password" 
                {...register('password')} 
                className="block w-full rounded-lg border border-[#324467] bg-[#192233] text-white focus:border-[#135bec] focus:ring-[#135bec] h-14 pl-11 pr-12 text-base placeholder:text-[#92a4c9] transition-colors duration-200 outline-none"
                placeholder="••••••••" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#92a4c9] hover:text-white transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-400 ml-1">{errors.password.message}</p>}
            
            {/* Forgot Password Link */}
            <div className="flex justify-end mt-2">
              <a className="text-sm font-medium text-[#135bec] hover:text-blue-400 transition-colors" href="#">
                Forgot Password?
              </a>
            </div>
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-2 w-full bg-[#135bec] hover:bg-blue-600 active:bg-blue-700 text-white font-semibold h-14 rounded-lg shadow-lg shadow-[#135bec]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Log In</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#324467]"></div>
            <span className="flex-shrink-0 mx-4 text-[#92a4c9] text-xs font-medium uppercase tracking-wider">Or continue with</span>
            <div className="flex-grow border-t border-[#324467]"></div>
          </div>

          {/* Social/Biometric Login */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => handleSocialLogin('Google')}
              disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2 h-12 bg-[#192233] border border-[#324467] rounded-lg hover:bg-opacity-80 transition-colors text-white font-medium text-sm disabled:opacity-50"
            >
              {socialLoading === 'Google' ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <GoogleIcon />
              )}
              Google
            </button>
            <button 
              type="button"
              className="flex items-center justify-center gap-2 h-12 bg-[#192233] border border-[#324467] rounded-lg hover:bg-opacity-80 transition-colors text-white font-medium text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">face</span>
              Face ID
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-[#92a4c9] text-sm">
          Don't have an account?
          <Link href="/auth/register" className="text-[#135bec] font-semibold hover:text-blue-400 transition-colors ml-1">
            Register Now
          </Link>
        </p>

        {/* Demo Account Info */}
        <div className="mt-6 p-4 bg-[#192233] border border-[#324467] rounded-lg w-full">
          <p className="text-sm text-[#92a4c9] font-medium mb-2">Demo Account:</p>
          <p className="text-sm text-white">Email: test@example.com</p>
          <p className="text-sm text-white">Password: password123</p>
        </div>
      </main>
    </div>
  );
}
