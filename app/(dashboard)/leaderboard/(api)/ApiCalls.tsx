import { fetchLeaderboard, fetchTracks } from '@/lib/api';

export interface LeaderboardEntry {
    position: number;
    name: string;
    points: string;
}

export async function fetchPlayerdata(trackid: number) {
    const response = await fetchLeaderboard(trackid);
    const players: LeaderboardEntry[] = response["leaderboard"].map((element: { mentee_name: string; total_points: number }, index: number) => ({
        position: index + 1,
        name: element.mentee_name,
        points: String(element.total_points),
    }));
    return players;
}

export async function fetchtrack() {
    const response: { id: number; title: string }[] = await fetchTracks();    
    const tracks: { id: number; name: string }[] = response.map((element) => ({
        id: element.id,
        name: element.title,
    }));
    return tracks;
}