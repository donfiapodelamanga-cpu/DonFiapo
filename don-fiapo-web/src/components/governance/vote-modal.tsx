"use client";

import { useState } from "react";
import { X, Loader2, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import type { Proposal, VoteType } from "@/lib/api/governance";
import { formatVoteCount, calculateVotePercentage } from "@/hooks/use-governance";

interface VoteModalProps {
  isOpen: boolean;
  proposal: Proposal | null;
  voteType: VoteType | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoteModal({ isOpen, proposal, voteType, onClose, onSuccess }: VoteModalProps) {
  const { lunesAddress } = useWalletStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVote = async () => {
    if (!lunesAddress || !proposal || !voteType) {
      setError("Invalid vote parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Voting requires payment - use the existing payment flow
      // 1. Create payment via Oracle (100 USDT for voting)
      // 2. User pays on Solana
      // 3. Oracle verifies and calls contract to register vote
      console.log("[Governance] Voting:", { proposalId: proposal.id, vote: voteType, voter: lunesAddress });

      // For now, call contract directly (payment will be handled by payment modal)
      const contract = await import('@/lib/api/contract');
      await contract.voteOnProposal(lunesAddress!, proposal.id, voteType === 'For');

      // Success
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("[Governance] Error voting:", err);
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen || !proposal || !voteType) return null;

  const { forPercentage, againstPercentage } = calculateVotePercentage(
    proposal.votesFor,
    proposal.votesAgainst
  );

  const isVoteFor = voteType === "For";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-card border-golden/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${isVoteFor ? "text-green-500" : "text-red-500"}`}>
            {isVoteFor ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
            Vote {voteType}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-bold text-green-500">Vote Submitted!</p>
              <p className="text-sm text-muted-foreground">Your vote has been recorded.</p>
            </div>
          ) : (
            <>
              {/* Proposal Info */}
              <div className="p-4 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Proposal #{proposal.id}</p>
                <p className="font-bold text-lg">{proposal.title}</p>
              </div>

              {/* Current Votes */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Votes</p>
                <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-2">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${forPercentage}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${againstPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">
                    👍 {formatVoteCount(proposal.votesFor)} ({forPercentage.toFixed(1)}%)
                  </span>
                  <span className="text-red-500">
                    👎 {formatVoteCount(proposal.votesAgainst)} ({againstPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Confirmation */}
              <div className={`p-4 rounded-lg border ${isVoteFor ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <p className="text-sm">
                  You are about to vote <strong className={isVoteFor ? "text-green-500" : "text-red-500"}>{voteType}</strong> on this proposal.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This action cannot be undone. Your vote will be recorded on the blockchain.
                </p>
              </div>

              {/* Requirements */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-500">
                  ⚠️ Voting requires a minimum payment of 10 USDT/LUSDT or equivalent in FIAPO,
                  plus having at least 100 FIAPO staked.
                </p>
              </div>
            </>
          )}
        </CardContent>

        {!success && (
          <CardFooter className="flex justify-between gap-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={loading}
              className={isVoteFor
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  {isVoteFor ? <ThumbsUp className="w-4 h-4 mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                  Confirm Vote
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
