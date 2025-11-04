'use client';

import Link from "next/link";
import { ReviewedTask, UpcomingTask, FeedbackProvided } from "../(tasks)/ListViews";
import CurrentTask from "../(tasks)/CurrentTask";
import PlayerStats from "../(user)/PlayerStats";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { fetchLeaderboard, fetchSubmissions, fetchTasks as apiFetchTasks } from '@/lib/api';
import { normalizeStatus } from '@/lib/status';

interface Task {
    track_id: number;
    task_no: number;
    title: string;
    description: string;
    points: number;
    deadline: number | null;
    id: number;
}

interface MenteeDetails {
    position: number;
    mentee_name: string;
    total_points: number;
}

interface SubmissionData {
    id: number;
    task_id: number;
    task_no: number;
    task_name: string;
    status: string;
    mentor_feedback?: string;
    feedback?: string;
    submitted_at?: string;
    reviewed_at?: string;
    approved_at?: string;
}

const MenteeDashboard = () => {
    const router = useRouter();
    const [menteeDetails, setMenteeDetails] = useState<MenteeDetails>({
        position: 0,
        mentee_name: "temp",
        total_points: 0,
    });

    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mySubmissions, setMySubmissions] = useState<Record<number, string>>({});
    const [myFullSubmissions, setMyFullSubmissions] = useState<SubmissionData[]>([]);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);

    const getUserEmail = (): string | null => {
        return localStorage.getItem('email');
    };

    const isTaskUnlocked = useCallback((taskId: number): boolean => {
        if (taskId <= 0) return true;
        
        const previousTaskId = taskId - 1;
        const previousTask = tasks.find(task => task.task_no === previousTaskId);
        
        if (!previousTask) return false;
        
        if (previousTask.deadline === null) return true;
        
        const previousTaskStatus = mySubmissions[previousTaskId];
        return previousTaskStatus === 'Submitted' || previousTaskStatus === 'Reviewed';
    }, [tasks, mySubmissions]);

    const getCurrentTask = useCallback((): Task | null => {
        // Find the first unlocked task that hasn't been submitted yet
        const unlockedTasks = tasks.filter(task => isTaskUnlocked(task.task_no));
        const pendingTasks = unlockedTasks.filter(task => {
            const status = mySubmissions[task.task_no] || 'Not Started';
            return status !== 'Submitted' && status !== 'Reviewed';
        });
        
        // Return the first (lowest task_no) pending task
        return pendingTasks.length > 0 ? pendingTasks[0] : null;
    }, [tasks, mySubmissions, isTaskUnlocked]);

    const getFormattedTasks = (): string[][] => {
        return tasks.map((task) => {
            const status = mySubmissions[task.task_no] || 'Not Started';
            const unlocked = isTaskUnlocked(task.task_no);
            
            let displayStatus = status;
            if (!unlocked) {
                displayStatus = `🔒 ${status}`;
            }
            
            return [(task.task_no + 1).toString(), task.title, displayStatus];
        });
    };

    const getUpcomingTasks = (): string[][] => {
        const formattedTasks = getFormattedTasks();
        return formattedTasks.filter(task => {
            const status = task[2];
            // Show only locked tasks and not started/in progress unlocked tasks (exclude submitted and reviewed)
            return status.includes('🔒') || (status === 'Not Started' || status === 'In Progress' || status === 'Paused');
        });
    };
    
    const getReviewedTasks = (): string[][] => {
        const formattedTasks = getFormattedTasks();
        return formattedTasks.filter(task => task[2] === 'Reviewed');
    };

    const fetchMySubmissions = useCallback(async (tasksList: Task[], trackId: number) => {
        const userEmail = getUserEmail();
        if (!userEmail) return;
        
        const results: Record<number, string> = {};
        let allSubmissions: SubmissionData[] = [];
        
        try {
            const submissions: SubmissionData[] = await fetchSubmissions(userEmail, trackId);
                allSubmissions = submissions;
                
                for (const task of tasksList) {
                    const taskSubmission = submissions.find((s: SubmissionData) => s.task_id === task.id);
                    
                    if (taskSubmission) {
                        const rawStatus = taskSubmission.status;
                        const normalizedStatus = normalizeStatus(rawStatus);
                        results[task.task_no] = normalizedStatus;
                    } else {
                        results[task.task_no] = 'Not Started';
                    }
                }
        } catch (error) {
            console.error(`Error fetching submissions:`, error);
            for (const task of tasksList) {
                results[task.task_no] = 'Not Started';
            }
        }
        
        setMySubmissions(results);
        setMyFullSubmissions(allSubmissions);
    }, []);

    useEffect(() => {
        const fetchMenteeDetails = async () => {
             try {
                const currentTrack = sessionStorage.getItem("currentTrack");
                const track: { id: number; name: string } = currentTrack ? JSON.parse(currentTrack) : { id: 0, name: "" };
        
                const response = await fetchLeaderboard(track.id);
                const leaderboard = response['leaderboard'] as Array<{ mentee_name: string; total_points: number }>;

                const currentUserName = localStorage.getItem("name");
                const currentUserIndex = leaderboard.findIndex(
                  (element) => element.mentee_name === currentUserName
                );
                if (currentUserIndex !== -1) {
                    setMenteeDetails({
                        ...leaderboard[currentUserIndex],
                        position: currentUserIndex + 1
                    });
                } else {
                    setMenteeDetails(prev => ({
                        ...prev,
                    position: 0 
                    }));
                }
            } catch (error) {
                console.error('Error fetching mentee details:', error);
            }
        };

        const fetchTasks = async () => {
            try {
                const sessionTrack = sessionStorage.getItem('currentTrack');
                
                if (!sessionTrack) {
                    // If sessionTrack is missing or corrupted, clear possible stale keys and redirect once
                    sessionStorage.removeItem('currentTrack');
                    router.push('/track');
                    return;
                }
                
                const trackData = JSON.parse(sessionTrack);
                const trackId = trackData.id;
                
                const tasksData: Task[] = await apiFetchTasks(trackId);
                setTasks(tasksData);
                
                await fetchMySubmissions(tasksData, trackId);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                router.push('/track');
            }
        };
        setLoading(true);
        fetchMenteeDetails();
        fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // Update current task when submissions change
    useEffect(() => {
        if (tasks.length > 0 && Object.keys(mySubmissions).length > 0) {
            const current = getCurrentTask();
            setCurrentTask(current);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, mySubmissions]);

    return (
        <div className="text-white p-4 md:p-2 lg:p-0">
            <div className="h-full w-full m-auto py-4 md:py-7 scrollbar-hide max-w-[80rem]">
                <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex text-xl sm:text-2xl md:text-3xl gap-1 mb-4 sm:mb-0">
                        <h1>Welcome, </h1>
                        <h1 className="text-primary-yellow">Mentee</h1>
                    </div>
                    <Link href="/track" className="text-primary-yellow underline mb-6 sm:mb-0">
                        Change Track
                    </Link>
                </div>
                <div className="flex justify-between mt-4 sm:mt-6 md:mt-10">
                    <CurrentTask 
                        isLoading={loading}
                        task={currentTask}
                        status={currentTask ? mySubmissions[currentTask.task_no] : undefined}
                    />
                </div>
                <div className="flex flex-col lg:flex-row justify-between mt-4 sm:mt-6 md:mt-10 gap-6 lg:gap-0">
                    <div className="flex flex-col gap-6 md:gap-12 w-full lg:w-[48%]">
                        <PlayerStats rank={menteeDetails.position} points={menteeDetails.total_points} />
                        <ReviewedTask isLoading={loading} reviewed_tasks={getReviewedTasks()}  />
                    </div>
                    <div className="flex flex-col gap-2 w-full lg:w-[46%]">
                        <UpcomingTask isLoading={loading} upcoming_tasks={getUpcomingTasks()} />
                        <FeedbackProvided 
                            selectedMentee={localStorage.getItem('name') || ''}
                            menteeSubmissions={{ [localStorage.getItem('name') || '']: myFullSubmissions }}
                            tasks={tasks}
                        />
                        {/* <Badges /> */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenteeDashboard;