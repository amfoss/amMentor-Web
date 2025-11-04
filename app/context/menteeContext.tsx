// app/context/menteecontext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchMentorMentees } from '@/lib/api';

interface Mentee {
    name: string;
    email: string;
}

interface MenteeContextType {
    selectedMentee: string | null;
    selectedMenteeEmail: string | null;
    mentees: Mentee[];
    setSelectedMentee: (name: string) => void;
    setMentees: (mentees: Mentee[]) => void;
    isLoading: boolean;
}

const MenteeContext = createContext<MenteeContextType | undefined>(undefined);

export const useMentee = () => {
    const context = useContext(MenteeContext);
    if (context === undefined) {
        throw new Error('useMentee must be used within a MenteeProvider');
    }
    return context;
};

interface MenteeProviderProps {
    children: ReactNode;
}

export const MenteeProvider = ({ children }: MenteeProviderProps) => {
    const [selectedMentee, setSelectedMenteeState] = useState<string | null>(() => {
        // Initialize from sessionStorage if available
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('selectedMentee');
        }
        return null;
    });
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get selected mentee's email
    const selectedMenteeEmail = selectedMentee 
        ? mentees.find(m => m.name === selectedMentee)?.email || null
        : null;

    // Fetch mentees when component mounts
    useEffect(() => {
        const fetchMentees = async () => {
            try {
                const mentorEmail = localStorage.getItem("email") || 'atharvanair04@gmail.com';
                const response = await fetchMentorMentees(mentorEmail);
                setMentees(response.mentees);
                
                // Set first mentee as selected if no selection
                if (response.mentees.length > 0 && !selectedMentee) {
                    const firstMentee = response.mentees[0].name;
                    setSelectedMenteeState(firstMentee);
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('selectedMentee', firstMentee);
                    }
                }
            } catch (error) {
                console.error('Error fetching mentees:', error);
                setMentees([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMentees();
    }, [selectedMentee]);

    const setSelectedMentee = (name: string) => {
        setSelectedMenteeState(name);
        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('selectedMentee', name);
        }
    };

    return (
        <MenteeContext.Provider 
            value={{
                selectedMentee,
                selectedMenteeEmail,
                mentees,
                setSelectedMentee,
                setMentees,
                isLoading
            }}
        >
            {children}
        </MenteeContext.Provider>
    );
};