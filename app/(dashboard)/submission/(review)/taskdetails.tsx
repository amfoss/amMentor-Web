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
    
    const currentId = parseInt(currentTaskId);
    // Find the current task to get its task_no
    const currentTask = tasks.find(task => task.id === currentId);
    // If task metadata isn't loaded yet, allow by default to avoid false locks
    if (!currentTask) return true;

    if (currentTask.task_no <= 0) return true; // First task is always unlocked
    
    // Find the previous task by task_no
    const previousTaskNo = currentTask.task_no - 1;
    const previousTask = tasks.find(task => task.task_no === previousTaskNo);
    
    // If previous task doesn't exist, don't unlock
    if (!previousTask) {
      return false;
    }
    
    // CRITICAL FIX: If previous task has null deadline, current task is automatically unlocked
    if (previousTask.deadline === null) {
      return true;
    }
    
    // Otherwise, check if previous task is completed using task_no
    const previousTaskStatus = allSubmissions[previousTaskNo];
    return previousTaskStatus === 'Submitted' || previousTaskStatus === 'Reviewed';
  };

  const getBlockedTaskMessage = (currentTaskId: string): string => {
    const currentId = parseInt(currentTaskId);
    // Find the current task to get its task_no
    const currentTask = tasks.find(task => task.id === currentId);
    if (!currentTask) return 'Previous task must be completed first.';
    
    const previousTaskNo = currentTask.task_no - 1;
    const previousTask = tasks.find(task => task.task_no === previousTaskNo);
    
    if (previousTask && previousTask.deadline === null) {
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
        <div className="flex-1 max-w-full md:max-w-[70%]">
          <h2 className="text-xl md:text-2xl font-bold text-white-text">
            {task?.title || 'TASK NAME'}
          </h2>
          <p className="text-gray-400">TASK - {task ? (task.task_no + 1) : 'XX'}</p>
          {task?.deadline === null && (
            <p className="text-green-400 text-sm">📅 No deadline - Next task automatically unlocked</p>
          )}
          {task?.deadline !== null && task?.deadline && (
            <p className="text-yellow-400 text-sm">📅 Deadline: {task.deadline} days</p>
          )}
          {startDate && (
            <p className="text-blue-400 text-sm">🚀 Started: {new Date(startDate).toLocaleDateString()}</p>
          )}
          {isMentor && menteeId && (
            <p className="text-primary-yellow font-semibold mt-2">Mentee: {menteeId}</p>
          )}
          <p className="text-xs md:text-sm text-gray-300">
            {task?.description || 'TASK DETAILS ...'}
          </p>
          
          {/* Task Status and Lock Message */}
          <div className="mt-3">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              taskStatus === 'Reviewed' ? 'bg-green-600 text-white' :
              taskStatus === 'Submitted' ? 'bg-primary-yellow text-black' :
              taskStatus === 'In Progress' ? 'bg-blue-600 text-white' :
              showLockedMessage ? 'bg-red-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              Status: {showLockedMessage ? 'Locked' : taskStatus}
            </span>
          </div>
          
          {/* Locked Task Message */}
          {showLockedMessage && (
            <div className="mt-3 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-md">
              <p className="text-red-300 text-sm">
                🔒 {getBlockedTaskMessage(taskId || '1')}
              </p>
            </div>
          )}
          
          <div className="border-t border-white mb-2 md:mb-4 mt-4"></div>
        </div>
      </div>

      {isMentor && (
        <div className="mb-8 md:mb-10">
          <div className="flex flex-col gap-2">
            <div className="flex">
              <span className="text-primary-yellow font-semibold">Starting Date: </span>
              <span className="ml-2">{startDate ? new Date(startDate).toLocaleDateString() : 'Not provided'}</span>
            </div>
            {isAlreadySubmitted && (
              <div className="flex">
                <span className="text-primary-yellow font-semibold">Submitted Date: </span>
                <span className="ml-2">04/05/2025</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-8 md:mb-10">
        <h2 className="font-bold mb-3 md:mb-4 text-white-text">WORK SUBMISSION</h2>
        
        {!isMentor ? (
          <>
            {/* Use corrected canEdit logic and task unlock status */}
            {canEditTask ? (
              <>
                {/* Start Date Input */}
                <div className="mb-4">
                  <label htmlFor="startDate" className="block text-sm font-semibold text-gray-300 mb-2">
                    Task Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-dark-grey rounded-md p-3 text-sm md:text-base text-white-text border border-gray-600 outline-none focus:border-primary-yellow"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Enter the date when you started working on this task
                  </p>
                </div>

                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Submit your work link or description here... (e.g. https://github.com/yourname/task-solution)"
                  className="w-full bg-dark-grey rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-white-text mb-4 md:mb-6 resize-none border-none outline-none placeholder-gray-500"
                />
                
                <div className="flex justify-center">
                  <button 
                    type="submit"
                    disabled={!submissionText.trim() || !startDate.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      if (submissionText.trim() && startDate.trim()) {
                        handleSubmitTask();
                      }
                    }}
                    className={`px-6 md:px-10 py-2 rounded-full text-sm md:text-md font-bold shadow-md ${
                      !submissionText.trim() || !startDate.trim()
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-primary-yellow text-dark-bg hover:shadow-xl transition-shadow"
                    }`}
                  >
                    SUBMIT TASK
                  </button>
                </div>
              </>
            ) : showLockedMessage ? (
              // Show locked submission area
              <div className="bg-gray-800 rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-gray-500 mb-4 md:mb-6 border border-gray-600 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🔒</div>
                    <p className="text-gray-400">Complete previous task to unlock</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-dark-grey rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-gray-300 mb-4 md:mb-6 border border-gray-600">
                  {submissionText || "No submission yet"}
                </div>
                
                {taskStatus === 'Submitted' && (
                  <div className="text-center">
                    <p className="text-primary-yellow font-semibold">
                      ✅ Task submitted! Waiting for review.
                    </p>
                  </div>
                )}
                
                {taskStatus === 'Reviewed' && (
                  <div className="text-center">
                    <p className="text-green-400 font-semibold">
                      🎉 Task completed and reviewed!
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          // Mentor view
          <div className="bg-dark-grey rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-white-text mb-4 md:mb-6">
            {submissionText || "No submission from mentee yet"}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;