'use client';

import { useAuth } from "@/app/context/authcontext";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MenteeDashboard from "./(dashboards)/Mentee";
import MentorDashboard from "./(dashboards)/Mentor";

const DashboardPage = () => {
    const { userRole, isLoggedIn, isInitialized } = useAuth();
    const router = useRouter();
    const [hasRedirected, setHasRedirected] = useState(false);
    const ismentor = userRole === 'Mentor';

    useEffect(() => {
        // CRITICAL: Wait for auth to initialize before checking login status
        if (!isInitialized || hasRedirected) return;
        
        if (!isLoggedIn) {
            setHasRedirected(true);
            router.push('/');
            return;
        }
    }, [isLoggedIn, isInitialized, router, hasRedirected]);

    // Show loading while auth initializes
    if (!isInitialized) {
        return <div className="flex items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    if (!isLoggedIn) {
        return null; 
    }

    return ismentor ? <MentorDashboard /> : <MenteeDashboard />;
};

export default DashboardPage;