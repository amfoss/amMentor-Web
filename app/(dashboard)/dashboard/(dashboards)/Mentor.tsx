'use client';

import { ReviewedTask, FeedbackProvided, UpcomingTask } from "../(tasks)/ListViews";
import CurrentTask from "../(tasks)/CurrentTask";
import Badges from "../(user)/Badges";
import PlayerProgress from "../(user)/PlayerProgress";
import PlayerStats from "../(user)/PlayerStats";
import { JSX, useEffect, useMemo, useState, useCallback } from 'react';
import { useMentee } from "@/app/context/menteeContext";
import { fetchTracks as apiFetchTracks, fetchTasks as apiFetchTasks, fetchSubmissions, fetchLeaderboard } from '@/lib/api';
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

interface TrackData {
    id: number;
    title: string;
}

interface MenteeDetails {
    tasks_completed: number;
    mentee_name: string;
    total_points: number;
    position: number;
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
    // Add other submission properties as needed
}

// use shared normalizeStatus from lib/status

const MentorDashboard = () => {
    const { 
        selectedMentee, 
        mentees, 
        setSelectedMentee, 
        isLoading: menteesLoading 
    } = useMentee();
    const [loading, setLoading] = useState(true);
    const [menteeDetails, setMenteeDetails] = useState<MenteeDetails>({
        mentee_name: "temp",
        total_points: 0,
        tasks_completed: 0,
        position: 0
    });
    const [tasks, setTasks] = useState<Task[]>([]);
    const [totaltask, settotaltask] = useState(0);
    const [menteeSubmissions, setMenteeSubmissions] = useState<Record<string, Record<number, string>>>({});
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [currentTrack, setCurrentTrack] = useState<{id: number; name: string} | null>(null);
    const [tracks, setTracks] = useState<{id: number; name: string}[]>([]);

    // Generate mentee options from context
    const menteeOptions = useMemo<JSX.Element[]>(() => {
        if (!mentees || mentees.length === 0) {
            return [<option key="no-mentees" value="">No mentees available</option>];
        }
        
        return mentees.map((mentee, index) => (
            <option key={index} value={mentee.name}>{mentee.name}</option>
        ));
    }, [mentees]);

    // Fetch available tracks
    const fetchTracks = useCallback(async () => {
        try {
            const tracksData: TrackData[] = await apiFetchTracks();
            const formattedTracks = tracksData.map((track: TrackData) => ({ id: track.id, name: track.title }));
            setTracks(formattedTracks);
            
            // Set initial track from session storage or default to first available track
            const savedTrack = sessionStorage.getItem('mentorCurrentTrack');
            if (savedTrack) {
                const parsed = JSON.parse(savedTrack);
                // Verify saved track still exists
                const trackExists = formattedTracks.some(t => t.id === parsed.id);
                if (trackExists) {
                    setCurrentTrack(parsed);
                } else {
                    // Saved track doesn't exist, use first available
                    const firstTrack = formattedTracks[0];
                    setCurrentTrack(firstTrack);
                    sessionStorage.setItem('mentorCurrentTrack', JSON.stringify(firstTrack));
                }
            } else if (formattedTracks.length > 0) {
                // No saved track, use first available
                const firstTrack = formattedTracks[0];
                setCurrentTrack(firstTrack);
                sessionStorage.setItem('mentorCurrentTrack', JSON.stringify(firstTrack));
            }
        } catch (error) {
            console.error('Error fetching tracks:', error);
        }
    }, []);

    // Handle track change
    const handleTrackChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const trackId = parseInt(event.target.value);
        const selectedTrack = tracks.find(track => track.id === trackId);
        if (selectedTrack) {
            setCurrentTrack(selectedTrack);
            sessionStorage.setItem('mentorCurrentTrack', JSON.stringify(selectedTrack));
            // Reset current task when track changes
            setCurrentTask(null);
            // Trigger refetch of tasks and submissions
            setLoading(true);
        }
    }, [tracks]);    // Calculate submitted tasks count for a mentee
    const getSubmittedTasksCount = useCallback((menteeName: string): number => {
        if (!menteeSubmissions[menteeName]) return 0;
        
        const submissions = menteeSubmissions[menteeName];
        return Object.values(submissions).filter(status => 
            status === 'Submitted' || status === 'Reviewed'
        ).length;
    }, [menteeSubmissions]);

    const getCurrentTaskForMentee = useCallback((menteeName: string): Task | null => {
        if (!tasks.length || !menteeSubmissions[menteeName]) return null;
        
        // Find submitted tasks for this mentee
        const submittedTasks = tasks.filter(task => {
            const status = menteeSubmissions[menteeName][task.id];
            return status === 'Submitted';
        });
        
        // Return the earliest (lowest ID) submitted task
        return submittedTasks.length > 0 ? submittedTasks[0] : null;
    }, [tasks, menteeSubmissions]);

    const getFormattedTasksForMentee = (menteeName: string): string[][] => {
        if (!menteeSubmissions[menteeName]) return [];
        
        return tasks.map((task) => {
            const status = menteeSubmissions[menteeName][task.id] || 'Not Started';
            return [(task.task_no + 1).toString(), task.title, status];
        });
    };

    const getUpcomingMentorTasks = (): string[][] => {
        if (!selectedMentee) return [];
        
        const formattedTasks = getFormattedTasksForMentee(selectedMentee);
        return formattedTasks.filter(task => {
            const status = task[2];
            return status === 'Not Started' || status === 'In Progress' || status === 'Paused';
        });
    };
    
    const getReviewedMentorTasks = (): string[][] => {
        if (!selectedMentee) return [];
        
        const formattedTasks = getFormattedTasksForMentee(selectedMentee);
        return formattedTasks.filter(task => task[2] === 'Reviewed');
    };

    const [menteeFullSubmissions, setMenteeFullSubmissions] = useState<Record<string, SubmissionData[]>>({});

    // Update the fetchMenteeSubmissions function to store full submission data
    const fetchMenteeSubmissions = useCallback(async (menteesList: { name: string; email: string }[], tasksList: Task[]) => {
        const statusResults: Record<string, Record<number, string>> = {};
        const fullSubmissionsResults: Record<string, SubmissionData[]> = {};
        
        // Group tasks by track_id to minimize API calls
        const tasksByTrack: Record<number, Task[]> = {};
        tasksList.forEach(task => {
            if (!tasksByTrack[task.track_id]) {
                tasksByTrack[task.track_id] = [];
            }
            tasksByTrack[task.track_id].push(task);
        });

        for (const mentee of menteesList) {
            statusResults[mentee.name] = {};
            fullSubmissionsResults[mentee.name] = [];
            
            // Fetch submissions per track instead of per task
            for (const [trackId, tasksInTrack] of Object.entries(tasksByTrack)) {
                try {
                    const submissions: SubmissionData[] = await fetchSubmissions(mentee.email, Number(trackId));
                        
                        // Store full submissions for feedback
                        fullSubmissionsResults[mentee.name].push(...submissions);
                        
                        // Process all tasks for this track for status
                        tasksInTrack.forEach(task => {
                            const taskSubmission = submissions.find((s: SubmissionData) => s.task_id === task.id);
                            const rawStatus = taskSubmission?.status || 'Not Started';
                            const normalizedStatus = normalizeStatus(rawStatus);
                            statusResults[mentee.name][task.id] = normalizedStatus;
                        });
                } catch (error) {
                    console.error(`Error fetching submissions for ${mentee.name}, track ${trackId}:`, error);
                    // Set all tasks in this track as 'Not Started' on error
                    tasksInTrack.forEach(task => {
                        statusResults[mentee.name][task.id] = 'Not Started';
                    });
                }
            }
        }
        
        setMenteeSubmissions(statusResults);
        setMenteeFullSubmissions(fullSubmissionsResults);
    }, []);

    const fetchMenteeDetails = async (menteeName: string) => {
        try {
            if (!currentTrack) {
                return;
            }
            
            const response = await fetchLeaderboard(currentTrack.id);
            const leaderboard = response['leaderboard'] as Array<MenteeDetails>;
            
            // Find the mentee's position in the leaderboard
            const menteeIndex = leaderboard.findIndex(element => element.mentee_name === menteeName);
            const menteeDetail = leaderboard[menteeIndex];
            
            if (menteeDetail && menteeIndex !== -1) {
                setMenteeDetails({
                    ...menteeDetail,
                    position: menteeIndex + 1 // Add 1 because array is 0-indexed but rank starts from 1
                });
            } else {
                // Set default values if mentee not found in leaderboard
                setMenteeDetails({
                    mentee_name: menteeName,
                    total_points: 0,
                    tasks_completed: 0,
                    position: 0 // Default position when not found
                });
            }
        } catch (error) {
            console.error('Error fetching mentee details:', error);
            // Set default values on error
            setMenteeDetails({
                mentee_name: menteeName,
                total_points: 0,
                tasks_completed: 0,
                position: 0 // Default position on error
            });
        }
    };

    const fetchTasks = useCallback(async () => {
        try {
            if (!currentTrack?.id) {
                return [];
            }
            
            const tasksData: Task[] = await apiFetchTasks(currentTrack.id);
            setTasks(tasksData);
            settotaltask(tasksData.length);
            
            return tasksData;
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    }, [currentTrack]);

    // Initialize tracks when component mounts
    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    // Fetch tasks and submissions when mentees are loaded or track changes
    useEffect(() => {
        const initData = async () => {
            if (!menteesLoading && mentees.length > 0 && currentTrack) {
                const fetchedTasks = await fetchTasks();
                if (fetchedTasks.length > 0) {
                    await fetchMenteeSubmissions(mentees, fetchedTasks);
                }
                setLoading(false);
            }
        };
        setLoading(true);
        initData();
    }, [menteesLoading, mentees, currentTrack, fetchTasks, fetchMenteeSubmissions]);

    // Fetch mentee details when selected mentee changes
    useEffect(() => {
        if (selectedMentee) {
            fetchMenteeDetails(selectedMentee);
        }
    }, [selectedMentee]);

    // Update current task when selected mentee or submissions change
    useEffect(() => {
        if (tasks.length > 0 && Object.keys(menteeSubmissions).length > 0 && selectedMentee) {
            const current = getCurrentTaskForMentee(selectedMentee);
            setCurrentTask(current);
        }
    }, [tasks, menteeSubmissions, selectedMentee, getCurrentTaskForMentee]);

    // Calculate submitted tasks count for the selected mentee
    const submittedTasksCount = selectedMentee ? getSubmittedTasksCount(selectedMentee) : 0;

    if (menteesLoading) {
        return (
            <div className="text-white flex justify-center items-center h-screen">
                <div className="loader"></div>
                <div className="text-xl">Loading mentees...</div>
            </div>
        );
    }

    return (
        <div className="text-white p-4 md:p-2 lg:p-0">
            <div className="h-full w-full m-auto scrollbar-hide max-w-[80rem]">
                <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center mb-4 sm:mb-0">
                        <div className="flex text-xl sm:text-2xl md:text-3xl gap-1">
                            <h1>Welcome, </h1>
                            <h1 className="text-primary-yellow">Mentor</h1>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <select 
                            className="bg-deeper-grey rounded-lg text-primary-yellow px-3 py-2 sm:px-4 md:px-6 md:py-3 w-full sm:w-auto mb-3 sm:mb-0"
                            value={currentTrack?.id || 1}
                            onChange={handleTrackChange}
                        >
                            {tracks.map(track => (
                                <option key={track.id} value={track.id}>{track.name}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-deeper-grey rounded-lg text-primary-yellow px-3 py-2 sm:px-4 md:px-6 md:py-3 w-full sm:w-auto mb-6 sm:mb-0"
                            value={selectedMentee || ''}
                            onChange={(e) => setSelectedMentee(e.target.value)}
                        >
                            {menteeOptions}
                        </select>
                    </div>
                </div>
                <div className="flex justify-between mt-4 sm:mt-6 md:mt-10">
                    <CurrentTask
                        isLoading = {loading} 
                        mentor={true} 
                        task={currentTask}
                        status={currentTask && selectedMentee ? menteeSubmissions[selectedMentee]?.[currentTask.id] : undefined}
                    />
                </div>
                <div className="flex flex-col lg:flex-row justify-between mt-4 sm:mt-6 md:mt-10 gap-6 lg:gap-0">
                    <div className="flex flex-col gap-2 w-full lg:w-[46%]">
                        <PlayerStats rank={menteeDetails.position} points={menteeDetails.total_points} />
                        <Badges />
                        {/* Updated to use submitted tasks count instead of completed tasks */}
                        <PlayerProgress tasks={submittedTasksCount} totaltasks={totaltask} />
                    </div>
                    <div className="flex flex-col gap-4 w-full lg:w-[50%]">
                        <div className="flex flex-col sm:flex-row gap-5 justify-between">
                            <div className="w-full sm:w-1/2">
                                <UpcomingTask isLoading={loading} upcoming_tasks={getUpcomingMentorTasks()} />
                            </div>
                            <div className="w-1/2">
                                <ReviewedTask isLoading={loading} reviewed_tasks={getReviewedMentorTasks()} />
                            </div>
                        </div>
                        <FeedbackProvided 
                            selectedMentee={selectedMentee}
                            menteeSubmissions={menteeFullSubmissions}
                            tasks={tasks}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;