import { useState, useCallback, useEffect } from "react";
import type { MissionDTO, UserScoreDTO, LeaderboardResponse } from "@/lib/missions/types";

export interface SocialAuthStatus {
  x: { connected: boolean; username?: string | null };
  telegram: { connected: boolean; username?: string | null };
  trustScore: number;
}

/**
 * Hook to fetch and interact with Royal Missions
 */
export function useMissions(walletAddress?: string) {
  const [missions, setMissions] = useState<MissionDTO[]>([]);
  const [score, setScore] = useState<UserScoreDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = walletAddress ? `?wallet=${walletAddress}` : "";
      const res = await fetch(`/api/missions${params}`);
      const data = await res.json();
      if (res.ok) {
        setMissions(data.missions || []);
        setScore(data.score || null);
      }
    } catch (err) {
      console.error("Failed to fetch missions:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const submitMission = useCallback(async (missionId: string, proof?: string) => {
    if (!walletAddress) return { success: false, message: "Wallet not connected" };
    setSubmitting(missionId);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, missionId, proof }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMissions();
        return { success: true, message: data.message, points: data.points };
      }
      return { success: false, message: data.error || "Failed to submit" };
    } catch (err) {
      return { success: false, message: "Network error" };
    } finally {
      setSubmitting(null);
    }
  }, [walletAddress, fetchMissions]);

  /**
   * verifySocialMission — calls the real API verification endpoint.
   * For X/Telegram missions this triggers actual API checks instead of just saving PENDING.
   */
  const verifySocialMission = useCallback(async (missionId: string, fingerprint?: string) => {
    if (!walletAddress) return { success: false, message: "Wallet not connected" };
    setSubmitting(missionId);
    try {
      const res = await fetch("/api/missions/verify-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, missionId, fingerprint }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMissions();
        return {
          success: true,
          message: `+${data.points} pts earned! Rank: ${data.rank}`,
          points: data.points,
          code: undefined,
        };
      }
      return {
        success: false,
        message: data.error || "Verification failed",
        code: data.code as string | undefined,
      };
    } catch (err) {
      return { success: false, message: "Network error", code: undefined };
    } finally {
      setSubmitting(null);
    }
  }, [walletAddress, fetchMissions]);

  /**
   * verifyOnchainMission — calls /api/missions/verify-onchain.
   * Used for NFT mint, staking, spin game missions.
   * The backend queries the Lunes contracts directly to confirm the action.
   */
  const verifyOnchainMission = useCallback(async (missionId: string) => {
    if (!walletAddress) return { success: false, message: "Wallet not connected", code: undefined };
    setSubmitting(missionId);
    try {
      const res = await fetch("/api/missions/verify-onchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, missionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMissions();
        return {
          success: true,
          message: `+${data.points} pts earned! Rank: ${data.rank}`,
          points: data.points,
          code: undefined,
          count: undefined as number | undefined,
          required: undefined as number | undefined,
        };
      }
      return {
        success: false,
        message: data.error || "On-chain verification failed",
        code: data.code as string | undefined,
        count: data.meta?.count as number | undefined,
        required: data.meta?.required as number | undefined,
      };
    } catch (err) {
      return { success: false, message: "Network error", code: undefined };
    } finally {
      setSubmitting(null);
    }
  }, [walletAddress, fetchMissions]);

  /**
   * submitVideoMission — calls /api/missions/submit-video.
   * Used for TikTok and YouTube UGC missions.
   * Submission goes PENDING and admin has 7 days to review.
   */
  const submitVideoMission = useCallback(async (missionId: string, videoUrl: string) => {
    if (!walletAddress) return { success: false, message: "Wallet not connected", code: undefined };
    setSubmitting(missionId);
    try {
      const res = await fetch("/api/missions/submit-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, missionId, videoUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchMissions();
        return {
          success: true,
          message: data.message,
          code: undefined,
        };
      }
      return {
        success: false,
        message: data.error || "Submission failed",
        code: data.code as string | undefined,
      };
    } catch {
      return { success: false, message: "Network error", code: undefined };
    } finally {
      setSubmitting(null);
    }
  }, [walletAddress, fetchMissions]);

  return { missions, score, loading, submitting, fetchMissions, submitMission, verifySocialMission, verifyOnchainMission, submitVideoMission };
}

/**
 * Hook to check X / Telegram connection status for a wallet
 */
export function useSocialAuth(walletAddress?: string) {
  const [status, setStatus] = useState<SocialAuthStatus>({
    x: { connected: false },
    telegram: { connected: false },
    trustScore: 100,
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/twitter/status?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connectX = useCallback(() => {
    if (!walletAddress) return;
    window.location.href = `/api/auth/twitter?wallet=${walletAddress}`;
  }, [walletAddress]);

  return { status, loading, fetchStatus, connectX };
}

/**
 * Hook to fetch leaderboard data
 */
export function useLeaderboard(walletAddress?: string) {
  const [data, setData] = useState<LeaderboardResponse>({ top: [], currentUser: null, totalParticipants: 0 });
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async (limit: number = 100) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (walletAddress) params.set("wallet", walletAddress);
      params.set("limit", String(limit));
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  return { ...data, loading, fetchLeaderboard };
}
