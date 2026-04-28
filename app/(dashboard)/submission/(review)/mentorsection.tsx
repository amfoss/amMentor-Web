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
  <div className="w-full md:w-1/3 pt-6 md:pt-0 md:pl-8">
    {/* MENTOR NOTES SECTION */}
    <div className="mb-8">
      <h3 className="text-sm font-bold mb-4 text-white-text flex items-center gap-2">
        <span className="w-1 h-4 bg-primary-yellow"></span> MENTOR NOTES:
      </h3>

      <div className="bg-[#1a1c20] bg-opacity-50 rounded-xl p-4 md:p-6 border border-yellow-700 border-opacity-30">
        {isMentor ? (
          <>
            <textarea
              value={mentorNotes}
              onChange={(e) => setMentorNotes(e.target.value)}
              placeholder="Add your notes for the mentee here..."
              className="w-full bg-transparent text-sm md:text-base text-white-text mb-2 resize-none border-none outline-none placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
               Notes will save upon approval/rejection
            </p>
          </>
        ) : (
          <div className="text-sm md:text-base text-gray-500 leading-relaxed">
           {mentorNotes || 'Task is yet to be reviewed by mentor.'}
          </div>
        )}
      </div>
    </div>

    {/* RESOURCES SECTION */}
    <div className="mt-6 md:mt-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-white-text flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-yellow"></span> RESOURCES:
        </h3>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Resource Link */}
        <div onClick={() => window.open("https://amfoss-in.gitbook.io/anveshan/", "_blank")} className="bg-[#1a1c20] bg-opacity-50 rounded-xl p-3 flex items-center justify-between border border-gray-800 hover:border-gray-700 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="bg-primary-yellow bg-opacity-10 p-2 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-yellow">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-xs md:text-sm text-white-text">Task Guidelines</p>
              <p className="text-[10px] text-gray-500 uppercase">External URL</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>

     {/* MENTOR ACTIONS */}
     <div className="mt-8 pt-6 border-t border-gray-800">
      {isMentor && isSubmittedForReview(taskStatus) && (
        <div className="flex flex-col gap-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] text-center mb-1">
            Review Submission
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Reject Button */}
            <button 
            onClick={() => handleReviewAction('rejected')}
            className="group flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300
                     bg-red-500/5 border border-red-500/30 text-red-500 
                     hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_0_25px_rgba(239,68,68,0.6),0_0_10px_rgba(239,68,68,0.4)] hover:brightness-110 hover:border-red-400
                     active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Reject</span>
              </button>

            {/* Approve Button */}
            <button 
            onClick={() => handleReviewAction('approved')}
            className="group flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300
                     bg-green-500/5 border border-green-500/30 text-green-500 
                     hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-[0_0_25px_rgba(34,197,94,0.6),0_0_10px_rgba(34,197,94,0.4)] hover:brightness-110 hover:border-green-400
                     active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Approve</span>
              </button>
          </div>
          {/* Secondary Pause Action */}
          <button 
          onClick={() => handleReviewAction('paused')}
          className="mt-2 text-gray-500 hover:text-primary-yellow text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
            Pause Review
          </button>
        </div>
        )}
      </div>
    </div>
  </div>
);
};

export default MentorSection;
