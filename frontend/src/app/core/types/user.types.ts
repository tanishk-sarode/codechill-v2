export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  codeforcesUsername?: string;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  githubStats?: GitHubStats;
  leetcodeStats?: LeetCodeStats;
  codeforcesStats?: CodeforcesStats;
}

export interface GitHubStats {
  publicRepos: number;
  followers: number;
  following: number;
  totalStars: number;
  totalCommits: number;
  contributionsLastYear: number;
}

export interface LeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  reputation: number;
}

export interface CodeforcesStats {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  contestsParticipated: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}