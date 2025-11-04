'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FaGithub,
  FaGitlab,
  FaTwitter,
  FaAt,
  FaArrowRight,
  FaSignOutAlt,
} from 'react-icons/fa';
import { useAuth } from '@/app/context/authcontext';
import { getUserByEmail } from '@/lib/api';

const ProfilePage = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<{ name: string; email: string; role: string; id: number } | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { isInitialized, isLoggedIn } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      // Wait for auth to be initialized to avoid reading stale localStorage
      if (!isInitialized) return;
      
      if (hasRedirected) return;

      if (!isLoggedIn) {
        setHasRedirected(true);
        router.push('/login');
        return;
      }

      const cachedProfile = sessionStorage.getItem("cache_profile");
      if (cachedProfile) {
        setUser(JSON.parse(cachedProfile));
        return;
      }

      const email = localStorage.getItem('email');
      
      if (!email) {
        alert('Profile data missing. Please log in again.');
        setHasRedirected(true);
        router.push('/login');
        return;
      }

      try {
        const data = await getUserByEmail(email);
        setUser(data);
        sessionStorage.setItem("cache_profile", JSON.stringify(data));
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setHasRedirected(true);
        router.push('/login');
      }
    };

    fetchUser();
  }, [logout, router, isInitialized, isLoggedIn, hasRedirected]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1E1E1E]">
        <div className="loader"></div>
      </div>
    );

  const isMentor = user.role === 'mentor';

  return (
    <div className="bg-[#1E1E1E] text-white px-6 py-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row items-center md:items-start bg-[#2a2a2a] rounded-lg p-8 md:p-10 gap-10 w-full shadow-md">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-36 h-36 rounded-full border-4 border-yellow-400 flex items-center justify-center text-lg font-semibold text-white">
              
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-300">{user.email}</p>
            <p className="text-sm text-gray-400">
              {isMentor ? 'Mentor' : 'Mentee'} @ amFOSS
            </p>

            <div className="flex gap-4 mt-4 text-gray-400">
              <Link href="#"><FaGithub className="text-2xl hover:text-white transition" /></Link>
              <Link href="#"><FaGitlab className="text-2xl hover:text-white transition" /></Link>
              <Link href="#"><FaTwitter className="text-2xl hover:text-white transition" /></Link>
              <Link href="#"><FaAt className="text-2xl hover:text-white transition" /></Link>
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleLogout}
              className="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-yellow-500 transition"
            >
              Logout <FaSignOutAlt size={12} />
            </button>
          </div>
        </div>

        <div className="w-full space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold tracking-wide">BADGES EARNED</h2>
            <Link href="#" className="text-yellow-400 text-sm flex items-center gap-1 hover:underline">
              See all <FaArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-[#2e2e2e] p-6 rounded-lg flex gap-6 overflow-x-auto">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="w-28 h-28 bg-[#4B4B4B] rounded-full flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;