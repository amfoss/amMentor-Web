'use client';

import { LeaderboardEntry } from './(items)/leaderboarditems';
import { fetchPlayerdata, fetchtrack } from './(api)/ApiCalls';
import { useAuth } from "@/app/context/authcontext";
import { useRouter } from 'next/navigation';
import { JSX, useEffect, useState, useCallback } from 'react';

interface Track {
  id: number;
  name: string;
}

interface OverallEntry {
  position: number;
  name: string;
  points: number;
  participatedTracks: number;
  trackScores: { [trackName: string]: number }
}

const LeaderBoardPage = () => {
  const [trackId, setTrackId] = useState<number | 'overall'>('overall');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [overallData, setOverallData] = useState<OverallEntry[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  
  const { isLoggedIn, isInitialized } = useAuth();
  const router = useRouter();

  const generateTrackOptions = (): JSX.Element[] => {
    return tracks.map((track) => (
      <option 
        key={track.id} 
        value={track.id}  
        className="bg-deep-grey text-white"
      >
        {track.name}
      </option>
    ));
  };

  const fetchLeaderboardData = useCallback(async (currentTrackId: number) => {
    try {
      const data = await fetchPlayerdata(currentTrackId);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOverallLeaderboard = useCallback(async () => {
    try {
      const promises = tracks.map(track => fetchPlayerdata(track.id));
      const allTrackData = await Promise.all(promises);
      const aggregatedData: { [key: string]: OverallEntry } = {};      
      allTrackData.forEach((trackData, index) => {
        const trackName = tracks[index].name;       
        trackData.forEach(participant => {
          const key = participant.name;
          if (!aggregatedData[key]) {
            aggregatedData[key] = {
              position: 0,
              name: participant.name,
              points: 0,
              participatedTracks: 0,
              trackScores: {},
            };
          }
          aggregatedData[key].points += Number(participant.points) || 0;
          aggregatedData[key].trackScores[trackName] = Number(participant.points) || 0;
          aggregatedData[key].participatedTracks += 1;
        });
      });

      const sortedData = Object.values(aggregatedData)
        .map(participant => ({
          ...participant,
        }))
        .sort((a, b) => b.points - a.points)
        .map((participant, index) => ({
          ...participant,
          position: index + 1
        }));

      setOverallData(sortedData);
    } catch (error) {
      console.error('Error fetching overall leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [tracks]);

  const fetchTracksData = useCallback(async () => {
    const data = await fetchtrack();
    setTracks(data);
  }, []);

  const handleTrackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'overall') {
      setTrackId('overall');
    } else {
      setTrackId(parseInt(value));
    }
  };

  useEffect(() => {
    if (!isInitialized || hasRedirected) return;
    
    if (!isLoggedIn) {
      setHasRedirected(true);
      router.push('/');
      return;
    }
    
    const runFetch = () => {
      if (trackId === 'overall') {
        if (tracks.length > 0) {
          fetchOverallLeaderboard();
        }
      } else {
        fetchLeaderboardData(trackId as number);
      }
    };
    
    setLoading(true);
    runFetch();
    
    const interval = setInterval(() => {
      runFetch();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn, isInitialized, router, trackId, tracks, fetchOverallLeaderboard, fetchLeaderboardData, hasRedirected]);

  useEffect(() => {
    fetchTracksData();
  }, [fetchTracksData]);

  if (!isLoggedIn) {
    return null;
  }

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return { bg: 'bg-yellow-500', text: 'text-yellow-100', icon: '' };
      case 2:
        return { bg: 'bg-gray-400', text: 'text-white', icon: '' };
      case 3:
        return { bg: 'bg-orange-500', text: 'text-white', icon: '' };
      default:
        return { bg: 'bg-gray-700', text: 'text-white', icon: '' };
    }
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry) => {
    const rankStyle = getRankColor(entry.position);
    const initials = entry.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 1); 

    return (
      <div
        key={entry.position}
        className={`flex justify-between items-center py-3 px-16 text-white font-medium text-l bg-charcoal
          transition-all duration-300 ease-in-out hover:bg-gray-700 hover:shadow-xl hover:scale-[1.02] cursor-pointer
          relative overflow-hidden group
          ${entry.position === 1 ? 'border-l-4 border-yellow-500' : entry.position === 2 ? 'border-l-4 border-gray-400' : entry.position === 3 ? 'border-l-4 border-orange-500' : ''}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-yellow/5 to-transparent 
          transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        
        <div className="w-1/6 text-left transition-all duration-300 hover:scale-110 font-bold relative z-10">
          {entry.position}
        </div>
        
        <div className="w-3/6 flex items-center group relative z-10">
          <div className={`w-8 h-8 rounded-full ${rankStyle.bg} flex items-center justify-center mr-3 
            transition-all duration-300 group-hover:w-10 group-hover:h-10 group-hover:shadow-lg 
            group-hover:rotate-12 group-hover:scale-110`}>
            <span className={`text-sm font-bold ${rankStyle.text} transition-all duration-300 
              group-hover:text-base group-hover:animate-pulse`}>{initials}</span>
          </div>
          
          <div className="flex flex-col overflow-hidden">
            <div className="transition-all duration-300 group-hover:text-primary-yellow 
              group-hover:translate-x-1 group-hover:font-semibold flex items-center">
              <span className="mr-2 transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">
                {rankStyle.icon}
              </span>
              <span className="relative">
                {entry.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-yellow 
                  transition-all duration-300 group-hover:w-full"></span>
              </span>
            </div>
            
            <div className="text-xs text-gray-400 transition-all duration-300 group-hover:text-gray-300 
              group-hover:translate-x-1 flex items-center space-x-2">
            </div>
          </div>
        </div>
        
        <div className="w-2/6 text-right font-extrabold text-xl transition-all duration-300 
          hover:text-primary-yellow hover:scale-110 hover:drop-shadow-lg relative z-10 
          group-hover:animate-pulse">
          {entry.points}
        </div>
      </div>
    );
  };

  const renderOverallEntry = (entry: OverallEntry) => {
    const rankStyle = getRankColor(entry.position);
    const initials = entry.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 1); 

    return (
      <div
        key={entry.position}
        className={`flex justify-between items-center py-3 px-16 text-white font-medium text-l bg-charcoal
          transition-all duration-300 ease-in-out hover:bg-gray-700 hover:shadow-xl hover:scale-[1.02] cursor-pointer
          relative overflow-hidden group
          ${entry.position === 1 ? 'border-l-4 border-yellow-500' : entry.position === 2 ? 'border-l-4 border-gray-400' : entry.position === 3 ? 'border-l-4 border-orange-500' : ''}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-yellow/5 to-transparent 
          transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        
        <div className="w-1/6 text-left transition-all duration-300 hover:scale-110 font-bold relative z-10">
          {entry.position}
        </div>
        
        <div className="w-3/6 flex items-center group relative z-10">
          <div className={`w-8 h-8 rounded-full ${rankStyle.bg} flex items-center justify-center mr-3 
            transition-all duration-300 group-hover:w-10 group-hover:h-10 group-hover:shadow-lg 
            group-hover:rotate-12 group-hover:scale-110`}>
            <span className={`text-sm font-bold ${rankStyle.text} transition-all duration-300 
              group-hover:text-base group-hover:animate-pulse`}>{initials}</span>
          </div>
          
          <div className="flex flex-col overflow-hidden">
            <div className="transition-all duration-300 group-hover:text-primary-yellow 
              group-hover:translate-x-1 group-hover:font-semibold flex items-center">
              <span className="mr-2 transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">
                {rankStyle.icon}
              </span>
              <span className="relative">
                {entry.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-yellow 
                  transition-all duration-300 group-hover:w-full"></span>
              </span>
            </div>
            
            <div className="text-xs text-gray-400 transition-all duration-300 group-hover:text-gray-300 
              group-hover:translate-x-1 flex items-center space-x-2">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                {entry.participatedTracks} track{entry.participatedTracks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        <div className="w-2/6 text-right font-extrabold text-xl transition-all duration-300 
          hover:text-primary-yellow hover:scale-110 hover:drop-shadow-lg relative z-10 
          group-hover:animate-pulse">
          {entry.points}
        </div>
      </div>
    );
  };

  const getDisplayTitle = () => {
    if (trackId === 'overall') {
      return 'Overall Leaderboard';
    }
    const currentTrack = tracks.find(track => track.id === trackId);
    return currentTrack ? `${currentTrack.name}  Leaderboard` : 'Task Leaderboard';
  };

  return (
    <div className="max-h-screen">
      <div className="rounded-lg max-w-[90rem] mx-auto">
        <div className="bg-container-grey bg-opacity-50 rounded-3xl p-6 min-h-[800px] w-full">
          <div className="mb-6 px-12 py-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-[70%]">
                <h2 className="text-2xl font-bold text-white-text">{getDisplayTitle()}</h2>
              </div>
              
              <select 
                value={trackId} 
                onChange={handleTrackChange}
                className="bg-primary-yellow p-2 px-7 rounded-xl active:rounded-b-none"
              >
                <option value="overall" className="bg-deep-grey text-white">
                  Overall
                </option>
                {generateTrackOptions()}
              </select>
            </div>
          </div>
          
          {loading && (
            <div className="flex h-full w-full inset-0 absolute justify-center items-center">
              <div className="loader"></div>
            </div>
          )}
          
          {!loading && (
            <div className="mt-4">
              <div className="flex justify-between items-center py-2 text-grey text-l font-medium px-16">
                <div className="w-1/6 text-left">RANK</div>
                <div className="w-3/6 text-left">NAME</div>
                <div className="w-2/6 text-right">POINTS</div>
              </div>
              <div className="border-t border-grey mb-1"></div>
              {trackId === 'overall' 
                ? overallData.map(renderOverallEntry)
                : leaderboardData.map(renderLeaderboardEntry)
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderBoardPage;