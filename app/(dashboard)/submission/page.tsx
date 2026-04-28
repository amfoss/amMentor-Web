'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import TasksViewer from "./(tasks)/submissionitems";
import { useAuth } from "@/app/context/authcontext";
import { useMentee } from "@/app/context/menteeContext";
import { useRouter } from 'next/navigation';
import { fetchTasks as apiFetchTasks, fetchSubmissions, fetchTracks as apiFetchTracks } from '@/lib/api';
import { normalizeStatus } from '@/lib/status';
import { ChevronDown } from "lucide-react";

import SubmissionReview from "./(review)/review";

interface Task {
    track_id: number;
    task_no: number;
    title: string;
    description: string;
    points: number;
    deadline: number | null;
    id: number;
}

interface Submission {
    task_id: number;
    status: string;
}

// use shared normalizeStatus

// Main component that uses search params - must be wrapped in Suspense
const TasksPageContent = () => {
    const { userRole, isLoggedIn, isInitialized } = useAuth();
    const {
        selectedMentee,
        selectedMenteeEmail,
        isLoading: menteesLoading,
        mentees,
        setSelectedMentee,
    } = useMentee();
    const router = useRouter();

    const [toggles, setToggles] = useState([true, false, false]);
    const [showReview, setShowReview] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [menteeSubmissions, setMenteeSubmissions] = useState<Record<string, Record<number, string>>>({});
    const [mySubmissions, setMySubmissions] = useState<Record<number, string>>({});
    const [currentTrack, setCurrentTrack] = useState<{id: number; name: string} | null>(null);
    const [toggledTasks, setToggledTasks] = useState<string[][]>([]);

    // FIX: hooks must be declared before any early returns — moved here from bottom of file
    const [menteeDropdownOpen, setMenteeDropdownOpen] = useState(false);
    const menteeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menteeDropdownRef.current && !menteeDropdownRef.current.contains(e.target as Node)) {
                setMenteeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getUserEmail = (): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('email');
        }
        return null;
    };

    const ismentor = userRole === 'Mentor';

    const isTaskUnlocked = useCallback((_taskId: number): boolean => {
        if (ismentor) return true;
        return true;
    }, [ismentor]);

    const fetchTasks = useCallback(async (trackId?: number): Promise<Task[]> => {
        let finalTrackId = trackId;

        if (!finalTrackId) {
            if (userRole === 'Mentor') {
                // Get mentor's selected track from session storage
                if (typeof window !== 'undefined') {
                    const mentorTrack = sessionStorage.getItem('mentorCurrentTrack');
                    if (mentorTrack) {
                        finalTrackId = JSON.parse(mentorTrack).id;
                    } else {
                        // No track selected - fetch available tracks and use first one
                        try {
                            const tracks = await apiFetchTracks();
                            if (tracks.length > 0) {
                                finalTrackId = tracks[0].id;
                                sessionStorage.setItem('mentorCurrentTrack', JSON.stringify({ id: tracks[0].id, name: tracks[0].title }));
                            } else {
                                console.error('No tracks available');
                                return [];
                            }
                        } catch (error) {
                            console.error('Error fetching tracks:', error);
                            return [];
                        }
                    }
                } else {
                    return [];
                }
            } else {
                if (typeof window !== 'undefined') {
                    const sessionTrack = sessionStorage.getItem('currentTrack');
                    if (!sessionTrack) {
                        // Wait for auth to initialize before redirecting to prevent loop
                        if (!isInitialized) return [];
                        router.push('/track');
                        return [];
                    }
                    finalTrackId = JSON.parse(sessionTrack).id;
                } else return [];
            }
        }

        if (!finalTrackId) return [];

        try {
            const data = await apiFetchTasks(finalTrackId);
            setTasks(data);
            return data;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }, [userRole, router, isInitialized]);

    const fetchSelectedMenteeSubmissions = useCallback(async (trackId: number, tasksList: Task[]) => {
        if (!selectedMentee || !selectedMenteeEmail) return;

        const results: Record<string, Record<number, string>> = {};
        results[selectedMentee] = {};

        try {
            const submissions: Submission[] = await fetchSubmissions(selectedMenteeEmail, trackId);
            for (const task of tasksList) {
                const taskSubmission = submissions.find((s: Submission) => s.task_id === task.id);
                results[selectedMentee][task.task_no] = normalizeStatus(taskSubmission?.status || 'Not Started');
            }
        } catch {
            for (const task of tasksList) {
                results[selectedMentee][task.task_no] = 'Not Started';
            }
        }

        setMenteeSubmissions(results);
    }, [selectedMentee, selectedMenteeEmail]);

    const fetchMySubmissions = useCallback(async (trackId: number, tasksList: Task[]) => {
        const userEmail = getUserEmail();
        if (!userEmail) return;

        const results: Record<number, string> = {};

        try {
            const submissions: Submission[] = await fetchSubmissions(userEmail, trackId);
            for (const task of tasksList) {
                const taskSubmission = submissions.find((s: Submission) => s.task_id === task.id);
                results[task.task_no] = normalizeStatus(taskSubmission?.status || 'Not Started');
            }
        } catch {
            for (const task of tasksList) {
                results[task.task_no] = 'Not Started';
            }
        }

        setMySubmissions(results);
    }, []);

    const getFilteredTasks = useCallback((): Task[] => {
        const activeToggleIndex = toggles.findIndex(toggle => toggle);

        return tasks.filter((task) => {
            let status: string;

            if (ismentor && selectedMentee && menteeSubmissions[selectedMentee]) {
                status = menteeSubmissions[selectedMentee][task.task_no] || 'Not Started';
            } else if (!ismentor && Object.keys(mySubmissions).length > 0) {
                status = mySubmissions[task.task_no] || 'Not Started';
            } else {
                status = 'Not Started';
            }

            switch (activeToggleIndex) {
                case 0: return true;
                case 1: return ismentor ? status === 'Reviewed' : status === 'Submitted';
                case 2: return ismentor ? status === 'Submitted' : status === 'Reviewed';
                default: return true;
            }
        });
    }, [tasks, toggles, ismentor, selectedMentee, menteeSubmissions, mySubmissions]);

    const getFormattedTasks = useCallback((): string[][] => {
        return getFilteredTasks().map((task) => {
            if (ismentor && selectedMentee && menteeSubmissions[selectedMentee]) {
                const status = menteeSubmissions[selectedMentee][task.task_no] || 'Not Started';
                return [(task.task_no + 1).toString(), task.title, status, task.id.toString()];
            } else if (!ismentor && Object.keys(mySubmissions).length > 0) {
                const status = mySubmissions[task.task_no] || 'Not Started';
                const unlocked = isTaskUnlocked(task.task_no);
                let displayStatus = status;
                if (unlocked) {
                    displayStatus = task.deadline === null || task.deadline === 0
                        ? `${status} ⚡ (No deadline)`
                        : `${status} (${task.deadline} days)`;
                }
                return [(task.task_no + 1).toString(), task.title, displayStatus, task.id.toString()];
            } else {
                return [(task.task_no + 1).toString(), task.title, "", task.id.toString()];
            }
        });
    }, [getFilteredTasks, ismentor, selectedMentee, menteeSubmissions, mySubmissions, isTaskUnlocked]);

    // Primary init effect
    useEffect(() => {
        if (!isInitialized) return;
        if (!isLoggedIn) { router.push('/'); return; }

        const init = async () => {
            try {
                let trackId: number | undefined;

                if (userRole === 'Mentor') {
                    const mentorTrack = sessionStorage.getItem('mentorCurrentTrack');
                    if (mentorTrack) {
                        const trackData = JSON.parse(mentorTrack);
                        trackId = trackData.id;
                        setCurrentTrack(trackData);
                    } else {
                        const tracks = await apiFetchTracks();
                        if (tracks.length > 0) {
                            trackId = tracks[0].id;
                            const defaultTrack = { id: tracks[0].id, name: tracks[0].title };
                            setCurrentTrack(defaultTrack);
                            sessionStorage.setItem('mentorCurrentTrack', JSON.stringify(defaultTrack));
                        } else { setLoading(false); return; }
                    }
                } else {
                    const sessionTrack = sessionStorage.getItem('currentTrack');
                    if (sessionTrack) {
                        const trackData = JSON.parse(sessionTrack);
                        trackId = trackData.id;
                        setCurrentTrack(trackData);
                    }
                }

                const fetchedTasks = await fetchTasks(trackId);
                if (fetchedTasks.length === 0) { setLoading(false); return; }

                if (ismentor) {
                    if (!menteesLoading && selectedMentee && selectedMenteeEmail && trackId) {
                        await fetchSelectedMenteeSubmissions(trackId, fetchedTasks);
                    }
                } else if (trackId) {
                    await fetchMySubmissions(trackId, fetchedTasks);
                }

                // Handle ?page= deep link
                if (typeof window !== 'undefined') {
                    const pageParam = new URLSearchParams(window.location.search).get('page');
                    if (pageParam) {
                        setSelectedTaskId(pageParam);
                        setSelectedMenteeId(selectedMenteeEmail);
                        setShowReview(true);
                    }
                }

                setLoading(false);
            } catch (error) {
                console.error('Error initializing:', error);
                setLoading(false);
            }
        };

        init();
    }, [isInitialized, isLoggedIn, router, userRole, ismentor, fetchTasks, fetchSelectedMenteeSubmissions, fetchMySubmissions, menteesLoading, selectedMentee, selectedMenteeEmail]);

    // Re-fetch submissions when selected mentee changes
    useEffect(() => {
        if (ismentor && !menteesLoading && selectedMentee && selectedMenteeEmail && tasks.length > 0) {
            const mentorTrack = sessionStorage.getItem('mentorCurrentTrack');
            const trackId = mentorTrack ? JSON.parse(mentorTrack).id : 1;
            fetchSelectedMenteeSubmissions(trackId, tasks);
        }
    }, [selectedMentee, selectedMenteeEmail, menteesLoading, ismentor, tasks, fetchSelectedMenteeSubmissions]);

    // Update formatted task list
    useEffect(() => {
        if (tasks.length > 0) {
            setToggledTasks(getFormattedTasks());
        }
    }, [tasks, getFormattedTasks, mySubmissions, toggles]);

    const getFilteredMentees = useCallback((): string[][][] => {
        if (!ismentor || tasks.length === 0 || !selectedMentee) return [];

        return toggledTasks.map(([taskNoStr, , , taskIdStr]) => {
            const taskId = parseInt(taskIdStr);
            const task = tasks.find(t => t.id === taskId);
            const taskNo = task ? task.task_no : parseInt(taskNoStr) - 1;
            const status = menteeSubmissions[selectedMentee]?.[taskNo] || 'Not Started';
            return [[selectedMentee, selectedMenteeEmail || '', "-", status]];
        });
    }, [ismentor, selectedMentee, selectedMenteeEmail, toggledTasks, menteeSubmissions, tasks]);

    function toggleState(index: number): void {
        const newToggles: boolean[] = [false, false, false];
        newToggles[index] = true;
        setToggles(newToggles);
    }

    const handleTaskClick = (taskId: string) => {
        if (ismentor) {
            setSelectedTaskId(taskId);
            setSelectedMenteeId(selectedMenteeEmail);
            setShowReview(true);
        } else {
            const task = tasks.find(t => t.id === parseInt(taskId));
            if (!task) { alert('Task not found'); return; }

            if (!isTaskUnlocked(task.task_no)) {
                const previousTask = tasks.find(t => t.task_no === task.task_no - 1);
                if (previousTask?.deadline === null || previousTask?.deadline === 0) {
                    alert(`Task ${task.task_no} ("${previousTask?.title}") has no deadline and should automatically unlock this task. Please refresh or contact support.`);
                } else {
                    alert(`You must complete Task ${task.task_no} ("${previousTask?.title ?? task.task_no}") before accessing this task.`);
                }
                return;
            }

            setSelectedTaskId(taskId);
            setShowReview(true);
        }
    };

    const handleMenteeClick = (taskId: string, menteeEmail: string) => {
        setSelectedTaskId(taskId);
        setSelectedMenteeId(menteeEmail);
        setShowReview(true);
    };

    const handleCloseReview = async () => {
        setShowReview(false);
        if (ismentor && selectedMentee && selectedMenteeEmail && currentTrack) {
            await fetchSelectedMenteeSubmissions(currentTrack.id, tasks);
        } else if (!ismentor && currentTrack) {
            await fetchMySubmissions(currentTrack.id, tasks);
        }
    };

    const handleChangeTrack = () => {
        if (typeof window !== 'undefined') sessionStorage.removeItem('currentTrack');
        router.push('/track');
    };

    // --- Early returns (all hooks are above, so this is safe) ---

    if (!isLoggedIn) return null;

    if (loading || (ismentor && menteesLoading)) {
        return (
            <div className="text-white flex flex-col gap-2 justify-center items-center h-screen">
                <div className="loader"></div>
            </div>
        );
    }

    // FIX: removed router.push('/dashboard') — instead show inline mentee picker
    // so the mentor never gets bounced out of the submissions page
    if (ismentor && !selectedMentee) {
        return (
            <div className="text-white flex flex-col justify-center items-center h-screen gap-4">
                <p className="text-sm uppercase tracking-widest text-gray-500">No mentee selected</p>
                <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-64">
                    <p className="text-[9px] uppercase tracking-widest text-gray-600 px-4 pt-3 pb-2 border-b border-white/5">
                        Select a Mentee
                    </p>
                    <div className="max-h-64 overflow-y-auto">
                        {mentees.map((mentee, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedMentee(mentee.name)}
                                className="w-full text-left px-4 py-3 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            >
                                {mentee.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="text-white flex justify-center items-center h-screen gap-4">
                <div className="text-xl">
                    {userRole === 'Mentee'
                        ? 'No tasks found for this track. Please select a different track.'
                        : 'No tasks found.'}
                </div>
                {userRole === 'Mentee' && (
                    <button
                        onClick={handleChangeTrack}
                        className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500"
                    >
                        Select Track
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="text-white min-h-screen pt-10">
            {showReview ? (
                <SubmissionReview
                    isMentor={ismentor}
                    taskId={selectedTaskId}
                    menteeId={selectedMenteeId}
                    onClose={handleCloseReview}
                    trackId={currentTrack?.id}
                    allSubmissions={mySubmissions}
                    tasks={tasks}
                />
            ) : (
                <div className="max-w-full mx-auto px-6 md:px-12">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-10 text-center">
                        {ismentor && selectedMentee ? (
                            <>
                                <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] text-gray-500 font-bold mb-2">
                                    Viewing submissions for
                                </h2>
                                <h1 className="text-2xl md:text-4xl text-white font-black tracking-tight mb-4">
                                    {selectedMentee}
                                </h1>
                                <div className="relative" ref={menteeDropdownRef}>
                                    <button
                                        onClick={() => setMenteeDropdownOpen(prev => !prev)}
                                        className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-all border-b border-gray-800 hover:border-white pb-0.5"
                                    >
                                        Change Mentee
                                        <ChevronDown
                                            size={10}
                                            className={`transition-transform duration-200 ${menteeDropdownOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                    {menteeDropdownOpen && (
                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-2xl w-52">
                                            <p className="text-[9px] uppercase tracking-widest text-gray-600 px-4 pt-3 pb-2 border-b border-white/5">
                                                Select Mentee
                                            </p>
                                            <div className="max-h-52 overflow-y-auto scrollbar-hide">
                                                {mentees.map((mentee, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            setSelectedMentee(mentee.name);
                                                            setMenteeDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 text-xs transition-colors border-b border-white/5 last:border-0
                                                            ${selectedMentee === mentee.name
                                                                ? "text-[#FFC107] bg-[#FFC107]/10"
                                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                                            }`}
                                                    >
                                                        <span className="block truncate">{mentee.name}</span>
                                                        {selectedMentee === mentee.name && (
                                                            <span className="text-[9px] text-[#FFC107]/60 uppercase tracking-widest">current</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white mb-4">
                                    {currentTrack?.name}
                                </h2>
                                <button
                                    onClick={handleChangeTrack}
                                    className="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all border-b border-gray-800 hover:border-white pb-0.5"
                                >
                                    Switch Track
                                </button>
                            </>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="bg-[#141414] border border-white/5 p-1.5 rounded-2xl w-full max-w-lg mx-auto mb-12 flex justify-between shadow-xl">
                        {["All Tasks", ismentor ? "Reviewed" : "Submitted", ismentor ? "Submitted" : "Reviewed"].map((label, i) => (
                            <button
                                key={i}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ease-out
                                    ${toggles[i]
                                        ? "bg-[#FFC107] text-black shadow-[0_10px_20px_rgba(255,193,7,0.3)] scale-[1.05] z-10"
                                        : "text-gray-500 hover:text-white hover:bg-white/5 hover:scale-[1.02]"}`}
                                onClick={() => toggleState(i)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Tasks List */}
                    <div className="w-full max-w-[75%] mx-auto h-[65vh] overflow-y-auto scrollbar-hide px-2">
                        <TasksViewer
                            isMentor={ismentor}
                            highted_task={0}
                            tasks={toggledTasks}
                            mentees={getFilteredMentees()}
                            onTaskClick={handleTaskClick}
                            onMenteeClick={handleMenteeClick}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPageContent;