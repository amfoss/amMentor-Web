import React from 'react';
import { approveTask } from '@/lib/api';

interface MentorSectionProps {
  isMentor: boolean;
  mentorNotes: string;
  setMentorNotes: (notes: string) => void;
  taskStatus: string;
  reviewStatus: string;
  setReviewStatus: (status: string) => void;
  setTaskStatus: (status: string) => void;
  submissionId?: number;
}

const MentorSection = ({
  isMentor,
  mentorNotes,
  setMentorNotes,
  taskStatus,
  setReviewStatus,
  setTaskStatus,
  submissionId,
}: MentorSectionProps) => {
  const isSubmittedForReview = (status: string): boolean => {
    const submittedStatuses = ['submitted', 'Submitted'];
    return submittedStatuses.includes(status);
  };

  const isReviewed = (status: string): boolean => {
    const reviewedStatuses = ['reviewed', 'Reviewed', 'approved', 'Approved', 'rejected', 'Rejected', 'paused', 'Paused'];
    return reviewedStatuses.includes(status);
  };

  const isWaitingForSubmission = (status: string): boolean => {
    const waitingStatuses = ['in progress', 'In Progress', 'not started', 'Not Started'];
    return waitingStatuses.includes(status);
  };

  const handleReviewAction = async (action: string) => {
    if (!submissionId) {
      alert('No submission found to review');
      return;
    }

    const mentorEmail = localStorage.getItem('email');
    if (!mentorEmail) {
      alert('Mentor email not found. Please log in again.');
      return;
    }

    if (!mentorNotes.trim()) {
      alert('Please provide mentor feedback before submitting a review.');
      return;
    }

    let status = '';
    switch (action) {
      case 'approved':
        status = 'Approved';
        break;
      case 'rejected':
        status = 'Rejected';
        break;
      case 'paused':
        status = 'Paused';
        break;
      case 'unpaused':
        status = 'In Progress';
        break;
      default:
        status = 'Pending';
    }

    const body = {
      submission_id: submissionId,
      mentor_email: mentorEmail,
      status: status,
      mentor_feedback: mentorNotes.trim(),
    };

    try {
      const data = await approveTask(body);

      setReviewStatus(action);
      setTaskStatus(action === 'unpaused' ? 'In Progress' : 'Reviewed');

      let message = '';
      switch (action) {
        case 'approved':
          message = 'Task approved successfully!';
          break;
        case 'rejected':
          message = 'Task rejected successfully!';
          break;
        case 'paused':
          message = 'Task paused successfully!';
          break;
        case 'unpaused':
          message = 'Task unpaused successfully!';
          break;
      }
      alert(message);
    } catch (error) {
      console.error('Review error:', error);
      alert('An error occurred while reviewing the task.');
    }
  };

  return (
    <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-gray-700 pt-6 md:pt-0 md:pl-8">
      <div className="mb-6">
        <h2 className="font-bold mb-3 md:mb-4 text-white-text">MENTOR NOTES:</h2>

        {isMentor ? (
          <>
            <textarea
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              placeholder="Add your notes for the mentee here..."
              className="w-full bg-dark-grey rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-white-text mb-2 resize-none border-none outline-none"
            />
            <p className="text-xs text-gray-400 mb-4">
              ✏️ These notes will be saved when you approve or reject the task.
            </p>
          </>
        ) : (
          <div className="bg-dark-grey rounded-md p-3 md:p-4 min-h-[100px] md:min-h-[120px] text-sm md:text-base text-white-text mb-4 md:mb-6">
            {mentorNotes || 'No mentor notes provided yet.'}
          </div>
        )}
      </div>

      {/* ✅ Resources Section */}
      <div className="mt-6 md:mt-10">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="font-bold text-white-text">Resources:</h2>
          <button className="bg-dark-bg rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="bg-dark-grey rounded-md p-2 md:p-3 flex items-center mb-8">
          <div className="mr-3 md:mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm md:text-base text-white-text">Task Guidelines.pdf</p>
            <p className="text-xs text-gray-400">Download</p>
          </div>
        </div>

        {/* Review Action Buttons */}
        {isMentor && isSubmittedForReview(taskStatus) && (
          <div className="flex justify-between gap-2">
            <button 
              onClick={() => handleReviewAction('rejected')}
              className="flex-1 bg-red hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
            <button 
              onClick={() => handleReviewAction('approved')}
              className="flex-1 bg-dark-green hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
            <button 
              onClick={() => handleReviewAction('paused')}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md font-medium"
            >
              Pause
            </button>
          </div>
        )}

        {isMentor && isReviewed(taskStatus) && (
          taskStatus.toLowerCase() === 'paused' ? (
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => handleReviewAction('unpaused')}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
              >
                Unpause
              </button>
            </div>
          ) : (
            <div className="text-center text-green-400 text-sm">
              This task has been reviewed
            </div>
          )
        )}

        {isMentor && isWaitingForSubmission(taskStatus) && (
          <div className="text-center text-gray-400 text-sm">
            Waiting for mentee submission
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorSection;
