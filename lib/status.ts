export const normalizeStatus = (status: string | undefined | null): string => {
  if (!status) return 'Not Started';
  const statusMap: Record<string, string> = {
    submitted: 'Submitted',
    approved: 'Reviewed',
    rejected: 'Reviewed',
    paused: 'Paused',
    'in progress': 'In Progress',
    'not started': 'Not Started',
  };
  const key = String(status).toLowerCase();
  return statusMap[key] || status;
};
