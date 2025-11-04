if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL must be set in your .env file');
}
export const API_BASE: string = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');

type Json = any;

// Check if we should use proxy (in browser + not production)
// Set NEXT_PUBLIC_USE_PROXY=false in .env to disable proxy and use direct API calls
const USE_PROXY = typeof window !== 'undefined' && 
                  process.env.NODE_ENV === 'development' &&
                  process.env.NEXT_PUBLIC_USE_PROXY !== 'false';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let url: string;
  
  if (USE_PROXY) {
    // Use Next.js API route as proxy to avoid CORS issues in development
    // Extract endpoint and query params from path
    const [endpoint, queryString] = path.split('?');
    const params = new URLSearchParams(queryString || '');
    params.set('endpoint', endpoint);
    url = `/api/proxy?${params.toString()}`;
  } else {
    // Direct API call (server-side or production)
    url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return fetch(url, { ...init, headers });
}

async function fetchJSON<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Tracks
export async function fetchTracks(): Promise<Array<{ id: number; title: string }>> {
  return fetchJSON('/tracks/');
}

export async function fetchTasks(trackId: number): Promise<Array<{ id: number; title: string; description: string; deadline: number | null; track_id: number; task_no: number; points: number }>> {
  try {
    return await fetchJSON(`/tracks/${trackId}/tasks`);
  } catch (error: any) {
    // Return empty array if track not found instead of crashing
    if (error.message?.includes('404') || error.message?.includes('Track not found')) {
      return [];
    }
    throw error;
  }
}

// Leaderboard
export async function fetchLeaderboard(trackId: number): Promise<{ leaderboard: Array<{ mentee_name: string; total_points: number }> }> {
  try {
    return await fetchJSON(`/leaderboard/${trackId}`);
  } catch (error: any) {
    // Return empty leaderboard if not found instead of crashing
    if (error.message?.includes('404')) {
      return { leaderboard: [] };
    }
    throw error;
  }
}

// Submissions
export async function fetchSubmissions(email: string, trackId: number): Promise<Array<any>> {
  try {
    const q = new URLSearchParams({ email, track_id: String(trackId) }).toString();
    return await fetchJSON(`/submissions/?${q}`);
  } catch (error: any) {
    // Return empty array if no submissions found instead of crashing
    if (error.message?.includes('404') || error.message?.includes('No submissions found')) {
      return [];
    }
    throw error;
  }
}

export async function submitTask(payload: { track_id: number; task_no: number; reference_link: string; start_date: string; mentee_email: string }): Promise<any> {
  return fetchJSON('/progress/submit-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function approveTask(payload: { submission_id: number; mentor_email: string; status: string; mentor_feedback: string }): Promise<any> {
  return fetchJSON('/progress/approve-task', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Auth and users
export async function sendOtp(email: string): Promise<any> {
  return fetchJSON(`/auth/send-otp/${encodeURIComponent(email)}`);
}

export async function verifyOtp(email: string, otp: string): Promise<any> {
  const q = new URLSearchParams({ otp }).toString();
  return fetchJSON(`/auth/verify-otp/${encodeURIComponent(email)}?${q}`);
}

export async function getUserByEmail(email: string): Promise<any> {
  return fetchJSON(`/auth/user/${encodeURIComponent(email)}`);
}

// Mentor mentees
export async function fetchMentorMentees(mentorEmail: string): Promise<{ mentees: Array<{ name: string; email: string }> }> {
  try {
    return await fetchJSON(`/mentors/${encodeURIComponent(mentorEmail)}/mentees`);
  } catch (error: any) {
    // Return empty mentees list if mentor not found instead of crashing
    if (error.message?.includes('404') || error.message?.includes('Mentor not found')) {
      return { mentees: [] };
    }
    throw error;
  }
}
