"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Vote, Clock, CheckCircle2, XCircle, Users, FileText, ThumbsUp, ThumbsDown, Loader2, Shield, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import { formatAddress } from "@/lib/utils/format";
import {
  useProposals,
  useGovernanceStats,
  useCanCreateProposal,
  formatVoteCount,
  getTimeRemaining,
  calculateVotePercentage,
  getProposalTypeLabel,
  getStatusColor,
} from "@/hooks/use-governance";
import type { Proposal, ProposalStatus, VoteType } from "@/lib/api/governance";
import { CreateProposalModal, VoteModal } from "@/components/governance";

export default function GovernancePage() {
  const [filter, setFilter] = useState<"all" | ProposalStatus>("all");
  const { lunesConnected, lunesAddress } = useWalletStore();
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedVoteType, setSelectedVoteType] = useState<VoteType | null>(null);
  
  // API Hooks
  const { proposals, loading: proposalsLoading, refetch } = useProposals({
    filter: filter === "all" ? undefined : filter,
    autoRefresh: true,
    refreshInterval: 30000,
  });
  const { stats } = useGovernanceStats({ autoRefresh: true });
  const { canCreate, reason: createReason } = useCanCreateProposal(lunesAddress);

  // Handle vote button click
  const handleVoteClick = (proposal: Proposal, voteType: VoteType) => {
    if (!lunesConnected) return;
    setSelectedProposal(proposal);
    setSelectedVoteType(voteType);
    setShowVoteModal(true);
  };

  // Handle modal success
  const handleProposalSuccess = () => {
    refetch();
  };

  const handleVoteSuccess = () => {
    refetch();
    setSelectedProposal(null);
    setSelectedVoteType(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active": return <Clock className="w-4 h-4 text-blue-400" />;
      case "Approved":
      case "Executed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "Rejected": return <XCircle className="w-4 h-4 text-red-500" />;
      case "Expired": return <Clock className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">⚖️ Royal Governance</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Shape the future of Don Fiapo. Vote on proposals and make your voice heard.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-golden" />
                <span className="text-sm text-muted-foreground">Total Proposals</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalProposals || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Vote className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-muted-foreground">Active Votes</span>
              </div>
              <p className="text-2xl font-bold">{stats?.activeProposals || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Voters</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalVoters.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Passed</span>
              </div>
              <p className="text-2xl font-bold">{stats?.passedProposals || 0}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filter & Create */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(["all", "Active", "Approved", "Rejected", "Executed"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={filter === f ? "bg-golden text-black" : ""}
              >
                {f === "all" ? "All" : f}
              </Button>
            ))}
          </div>
          <Button 
            disabled={!lunesConnected}
            onClick={() => setShowCreateModal(true)}
            title={!lunesConnected ? "Connect wallet first" : createReason || "Create a new proposal"}
            className="bg-golden text-black hover:bg-golden/90"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>

        {/* Proposals */}
        <div className="space-y-4">
          {proposalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-golden" />
            </div>
          ) : proposals.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No proposals found</p>
              </CardContent>
            </Card>
          ) : (
            proposals.map((proposal, i) => {
              const { forPercentage, againstPercentage } = calculateVotePercentage(
                proposal.votesFor,
                proposal.votesAgainst
              );

              return (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Card className="bg-card">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(proposal.status)}`}>
                              {getStatusIcon(proposal.status)}
                              <span className="ml-1">{proposal.status}</span>
                            </span>
                            <span className="text-xs text-muted-foreground">#{proposal.id}</span>
                            <span className="text-xs px-2 py-0.5 bg-muted rounded">
                              {getProposalTypeLabel(proposal.proposalType)}
                            </span>
                          </div>
                          <CardTitle className="text-xl">{proposal.title}</CardTitle>
                          <CardDescription className="mt-2">{proposal.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Vote Bar */}
                        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
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
                          <span className="text-green-500 flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {formatVoteCount(proposal.votesFor)} ({forPercentage.toFixed(1)}%)
                          </span>
                          <span className="text-red-500 flex items-center gap-1">
                            <ThumbsDown className="w-4 h-4" />
                            {formatVoteCount(proposal.votesAgainst)} ({againstPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        by {formatAddress(proposal.proposer, 4)} • {proposal.status === "Active" ? getTimeRemaining(proposal.votingEnd) : `ended`}
                      </div>
                      {proposal.status === "Active" && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={!lunesConnected}
                            onClick={() => handleVoteClick(proposal, "Against")}
                            className="border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
                          >
                            <ThumbsDown className="w-4 h-4 mr-1" /> Against
                          </Button>
                          <Button 
                            size="sm" 
                            disabled={!lunesConnected} 
                            onClick={() => handleVoteClick(proposal, "For")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" /> For
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Governance Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-r from-golden/5 to-purple-500/5 border-golden/30">
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold text-golden mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Governance Rules
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground">Voting Period</p>
                  <p className="font-bold">{stats?.votingPeriodDays || 7} days</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground">Quorum Required</p>
                  <p className="font-bold">{stats?.quorumPercentage || 60}%</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-muted-foreground">Timelock Period</p>
                  <p className="font-bold">{stats?.timelockPeriodDays || 2} days</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                💡 To create a proposal or vote, you need to have $FIAPO staked and meet the minimum payment requirements.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modals */}
      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProposalSuccess}
      />

      <VoteModal
        isOpen={showVoteModal}
        proposal={selectedProposal}
        voteType={selectedVoteType}
        onClose={() => {
          setShowVoteModal(false);
          setSelectedProposal(null);
          setSelectedVoteType(null);
        }}
        onSuccess={handleVoteSuccess}
      />
    </div>
  );
}
