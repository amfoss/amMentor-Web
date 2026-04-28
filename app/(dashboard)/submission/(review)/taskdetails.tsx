import React, {useState, useEffect} from 'react';
import { fetchTasks as apiFetchTasks, submitTask as apiSubmitTask } from '@/lib/api';

interface TaskDetailsProps {
  isMentor: boolean;
  taskId?: string;
  menteeId?: string | null;
  taskStatus: string;
  submissionText: string;
  setSubmissionText: (text: string) => void;
  isAlreadySubmitted: boolean;
  trackId?: string | number;
  onSubmitTask: () => void;
  // New props for sequential task logic
  allSubmissions?: Record<number, string>;
  tasks?: Task[];
}

interface Task {
  id: number;
  title: string;
  description: string;
  deadline?: number | null;
  track_id: number;
  task_no: number;
  points: number;
}

interface TaskApiResponse {
  id: number;
  title: string;
  description: string;
  track_id: number;
  task_no: number;
  points: number;
  deadline: number | null;
}

const TaskDetails = ({
  isMentor,
  taskId,
  menteeId,
  taskStatus,
  submissionText,
  setSubmissionText,
  isAlreadySubmitted,
  trackId,
  onSubmitTask,
  allSubmissions = {},
  tasks = [],
}: TaskDetailsProps) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(''); // User-entered start date

  // Use the same logic as the main page for task unlocking
  const isCurrentTaskUnlocked = (currentTaskId: string): boolean => {
    if (isMentor) return true; // Mentors can access any task
    return true;
    // const currentId = parseInt(currentTaskId);
    // // Find the current task to get its task_no
    // const currentTask = tasks.find(task => task.id === currentId);
    // // If task metadata isn't loaded yet, allow by default to avoid false locks
    // if (!currentTask) return true;

    // if (currentTask.task_no <= 0) return true; // First task is always unlocked
    
    // // Find the previous task by task_no
    // const previousTaskNo = currentTask.task_no - 1;
    // const previousTask = tasks.find(task => task.task_no === previousTaskNo);
    
    // // If previous task doesn't exist, don't unlock
    // if (!previousTask) {
    //   return false;
    // }
    
    // // CRITICAL FIX: If previous task has null deadline, current task is automatically unlocked
    // if (previousTask.deadline === null || previousTask.deadline === 0) {
    //   return true;
    // }
    
    // // Otherwise, check if previous task is completed using task_no
    // const previousTaskStatus = allSubmissions[previousTaskNo];
    // return previousTaskStatus === 'Submitted' || previousTaskStatus === 'Reviewed';
  };

  const getBlockedTaskMessage = (currentTaskId: string): string => {
    const currentId = parseInt(currentTaskId);
    // Find the current task to get its task_no
    const currentTask = tasks.find(task => task.id === currentId);
    if (!currentTask) return 'Previous task must be completed first.';
    
    const previousTaskNo = currentTask.task_no - 1;
    const previousTask = tasks.find(task => task.task_no === previousTaskNo);
    
    if (previousTask && previousTask.deadline === null || previousTask && previousTask.deadline === 0) {
      return `Task ${previousTaskNo + 1} ("${previousTask.title}") has no deadline and should automatically unlock this task. If you're seeing this error, please refresh the page or contact support.`;
    }
    
    const previousTaskTitle = previousTask ? `"${previousTask.title}"` : (previousTaskNo + 1).toString();
    return `You must submit Task ${previousTaskNo + 1} (${previousTaskTitle}) before you can start this task.`;
  };

  // Submit task with user-provided start date
  const handleSubmitTask = async () => {
    const email = localStorage.getItem('email');
    if (!email) {
      alert('Email not found. Please log in again.');
      return;
    }

    // Get the correct trackId for submission
    let currentTrackId = trackId;
    if (!currentTrackId) {
      const sessionTrack = sessionStorage.getItem('currentTrack');
      if (sessionTrack) {
        const trackData = JSON.parse(sessionTrack);
        currentTrackId = trackData.id;
      } else {
        alert('Track information not found. Please select a track.');
        return;
      }
    }

    if (!currentTrackId || !taskId || !submissionText.trim()) {
      alert('Missing track, task ID, or work submission');
      return;
    }

    if (!startDate.trim()) {
      alert('Please enter the start date for this task');
      return;
    }

    // Ensure task is unlocked before submitting
    if (!isCurrentTaskUnlocked(taskId)) {
      alert('You must complete the previous task before submitting this one.');
      return;
    }

    const body = {
      track_id: Number(currentTrackId),
      task_no: task ? task.task_no : 0,
      reference_link: submissionText.trim(),
      start_date: startDate, // Use the user-entered start date
      mentee_email: email,
    };

    try {
      await apiSubmitTask(body);

      alert('Task submitted successfully!');
      // Call the original onSubmitTask to update parent component
      onSubmitTask();
    } catch (err) {
      console.error('Submission error:', err);
      alert('An error occurred while submitting the task.');
    }
  };

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Use the track ID from props if available, otherwise default to 1
  const fetchTrackId = Number(trackId || 1);
  const tasks: TaskApiResponse[] = await apiFetchTasks(fetchTrackId);
        const foundTask = tasks.find((t: TaskApiResponse) => String(t.id) === String(taskId));
        if (foundTask) {
          setTask({
            id: foundTask.id,
            title: foundTask.title,
            description: foundTask.description,
            deadline: foundTask.deadline,
            track_id: foundTask.track_id,
            task_no: foundTask.task_no,
            points: foundTask.points,
          });
        } else {
          setTask(null);
        }
      } catch (error) {
        console.error('Error fetching task:', error);
        setTask(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [trackId, taskId]);

  // Use the corrected unlock logic
  const taskUnlocked = taskId ? isCurrentTaskUnlocked(taskId) : true;
  const showLockedMessage = !isMentor && !taskUnlocked && taskStatus === 'Not Started';
  
  // Update canEdit logic to use the corrected unlock status
  const canEditTask = !isMentor && taskUnlocked && (taskStatus === 'In Progress' || taskStatus === 'Not Started');

  if (loading) {
    return <div className="text-white">Loading task details...</div>;
  }

  return (
  <div className="w-full md:w-2/3 md:pr-8 mb-6 md:mb-0">
    <div className="mb-4 md:mb-6 px-4 md:px-0 py-2 md:py-4">
      <div className="flex-1 max-w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-white-text uppercase tracking-tight">
          {task?.title || 'TASK NAME'}
        </h2>
        <p className="text-primary-yellow text-sm font-bold flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-primary-yellow"></span>
          TASK - {task ? (task.task_no + 1) : 'XX'}
        </p>
        
        <p className="text-xs md:text-sm text-gray-300 mt-4 leading-relaxed">
          <span className="font-bold">TASK DETAILS</span> {task?.description}
        </p>

        <p className="text-xs md:text-sm text-gray-300 mt-4 leading-relaxed">
        <span className="text-primary-yellow">Starting Date: </span>
        <span className="ml-2">{startDate ? new Date(startDate).toLocaleDateString() : 'Not provided'}</span>   
        </p>     

        <div className="border-t border-gray-700 mb-6 mt-6"></div>

        {/* PROGRESS SECTION */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-white-text mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary-yellow"></span> PROGRESS
          </h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between text-xs text-gray-400">
              <span>25 Days</span>
              <span className="text-primary-yellow font-bold uppercase">5 Days Left</span>
              <span>DEADLINE</span>
            </div>
            <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-gray-700">
              <div style={{ width: "83%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-yellow relative">
                 <div className="absolute right-0 w-3 h-3 bg-white border-2 border-primary-yellow rounded-full -mr-1"></div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Start</span>
              <span>30 Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mb-8 md:mb-10">
      <h3 className="text-sm font-bold mb-4 text-white-text flex items-center gap-2">
        <span className="w-1 h-4 bg-primary-yellow"></span> WORK SUBMISSION
      </h3>
      
      <div className="bg-[#1a1c20] bg-opacity-50 rounded-xl p-6 border border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gray-700 bg-opacity-20 rounded-bl-full"></div>
        
        {!isMentor ? (
          <>
            {canEditTask ? (
              <>
                <div className="mb-4">
                  <label htmlFor="startDate" className="block text-xs font-bold text-gray-400 uppercase mb-2">
                    Task Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-white-text border-b border-gray-600 focus:border-primary-yellow outline-none pb-1"
                  />
                </div>

                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="w-full bg-transparent text-sm md:text-base text-gray-300 mb-6 resize-none border-none outline-none leading-relaxed"
                  placeholder="Enter your submission details..."
                />
                
                <div className="flex justify-center">
                  <button 
                    disabled={!submissionText.trim() || !startDate.trim()}
                    onClick={handleSubmitTask}
                    className="px-8 py-2 rounded-full text-xs font-bold bg-primary-yellow text-dark-bg hover:brightness-110 transition-all uppercase tracking-wider"
                  >
                    SUBMIT TASK
                  </button>
                </div>
              </>
            ) : (
              <>
              <div className="text-sm text-gray-300 leading-relaxed mb-8">
                {submissionText ? (submissionText.startsWith('http') ? (
                  <a 
                  href={submissionText} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary-yellow hover:underline break-all transition-all">
                    {submissionText}
                  </a>
                ) : (
                <p>{submissionText}</p>
              )
            ) : (
            <p>No submission yet</p>
            )}
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-8 py-2 rounded-full text-xs font-bold border border-primary-yellow border-opacity-30 bg-primary-yellow bg-opacity-10 text-primary-yellow uppercase tracking-widest">
                <span className="text-[10px]">✔</span> SUBMITTED
              </div>
            </div>
            </>
          )}
          </>
          ) : (
            <div className="text-sm text-gray-300 leading-relaxed">
              {submissionText && submissionText.startsWith('http') ? (
                <a 
                href={submissionText} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-yellow hover:underline break-all transition-all">
                  {submissionText}
                </a>
                ) : (
                  submissionText || "No submission from mentee yet"
                )}
            </div>
         )} 
      </div>
    </div>
    {/* BADGES SECTION */}
    <div className="mt-8">
      <h3 className="text-sm font-bold text-white-text mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-primary-yellow"></span> BADGES EARNED
      </h3>
      <div className="bg-[#1a1c20] bg-opacity-50 rounded-xl p-4 border border-gray-800 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 opacity-50">🔒</div>
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 opacity-50">🔒</div>
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 opacity-50">🔒</div>
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 opacity-50">🔒</div>
      </div>
    </div>
  </div>
);
};

export default TaskDetails;