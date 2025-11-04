'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/authcontext';
import { sendOtp, verifyOtp } from '@/lib/api';

export default function LoginPage() {
  type UserRole = 'mentee' | 'mentor';
  const [role, setRole] = useState<UserRole>('mentee');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  const router = useRouter();
  const { login, isLoggedIn, isInitialized } = useAuth();

  // API base is configured via NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!isInitialized || hasRedirected) return; // wait until auth is hydrated and prevent duplicate redirects

    const emailInStorage = localStorage.getItem('email');
    if (isLoggedIn && emailInStorage) {
      const userRole = localStorage.getItem('userRole');
      setHasRedirected(true);
      // Temporary: send all logged-in users to /dashboard to avoid redirect loops when sessionTrack is missing
      if (userRole === 'Mentor') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, isInitialized, router, hasRedirected]);

  const handleGenerateOtp = async () => {
    if (!email.includes('@') || !email.includes('.')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
  await sendOtp(email);
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP. Please try again.');
    }
  };

  const handleLogin = async () => {
    try {
      const user = await verifyOtp(email, otp);
      if (user.role !== role) {
        alert(`Registered as ${user.role}, not ${role}`);
        return;
      }

  // Write auth state atomically
  const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1) as 'Mentee' | 'Mentor';
  localStorage.setItem('email', user.email);
  localStorage.setItem('name', user.name);
  localStorage.setItem('userRole', capitalizedRole);
  localStorage.setItem('isLoggedIn', 'true');
  login(capitalizedRole);
      
      // Ensure mentees have a currentTrack to avoid immediate redirect to /track (hotfix)
      if (capitalizedRole === 'Mentee') {
        if (typeof window !== 'undefined') {
          const existing = sessionStorage.getItem('currentTrack');
          if (!existing) {
            // set a sensible default so pages that expect a currentTrack do not redirect
            sessionStorage.setItem('currentTrack', JSON.stringify({ id: 1, name: 'Track 1' }));
          }
        }
      }

      // Temporary: send all logged-in users to /dashboard to avoid redirect loops
      router.push('/dashboard');
    } catch (error) {
      console.error("Login failed", error);
      alert("Something went wrong during login.");
    }
  };

  if (loading) return <div className="loader"></div>;

  return (
    <div className="py-6 w-full max-w-lg relative z-10 mx-auto">
      <div className="space-y-6">
        <div className="relative w-full">
          <button
            onClick={() => setOpen(!open)}
            className="bg-yellow-400 text-black font-medium w-full py-2 px-4 rounded-2xl flex justify-between items-center focus:outline-none transition-all"
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 text-black mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{role}</span>
            </div>
            <svg className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute mt-2 w-full rounded-lg bg-[#1E1E1E] shadow-lg z-10">
              {['mentee', 'mentor'].map((r) => (
                <div
                  key={r}
                  onClick={() => {
                    setRole(r as UserRole);
                    setOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-yellow-500 cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Input */}
        <div className="flex items-center bg-[#444444] rounded-2xl px-4 py-2 w-full border border-white/40">
          <svg className="h-6 w-6 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#444444] text-white focus:outline-none w-full"
          />
        </div>

        {/* OTP Flow */}
        {!otpSent ? (
          <button
            onClick={handleGenerateOtp}
            disabled={!email.includes('@') || !email.includes('.')}
            className={`block mx-auto py-3 px-6 rounded-3xl font-semibold transition duration-300 mt-4 ${
              email.includes('@') && email.includes('.')
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Generate OTP
          </button>
        ) : (
          <>
            <div className="flex items-center bg-[#444444] rounded-2xl px-4 py-2 w-full border border-white/40">
              <svg className="h-6 w-6 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-[#444444] text-white focus:outline-none w-full"
              />
            </div>
            <button
              onClick={handleLogin}
              className="block mx-auto w-1/2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-6 rounded-3xl transition duration-300 mt-4"
            >
              LOGIN
            </button>
          </>
        )}
      </div>
    </div>
  );
}