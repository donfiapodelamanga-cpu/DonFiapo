"use client";

import { useState } from "react";
import { X, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useWalletStore } from "@/lib/stores";
import type { ProposalType } from "@/lib/api/governance";

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROPOSAL_TYPES: { value: ProposalType; label: string; description: string }[] = [
  { value: "ConfigChange", label: "⚙️ Configuration Change", description: "Change system parameters like fees, APY rates, etc." },
  { value: "AcceleratedBurn", label: "🔥 Accelerated Burn", description: "Increase burn rate for a limited time" },
  { value: "ExchangeListing", label: "📈 Exchange Listing", description: "Propose listing on a new exchange" },
  { value: "InfluencerMarketing", label: "📢 Influencer Marketing", description: "Marketing campaign with influencers" },
  { value: "ListingDonation", label: "💰 Listing Donation", description: "Donate funds for exchange listing" },
  { value: "MarketingDonation", label: "📣 Marketing Donation", description: "Donate funds for marketing" },
];

export function CreateProposalModal({ isOpen, onClose, onSuccess }: CreateProposalModalProps) {
  const { lunesAddress } = useWalletStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    type: "ConfigChange" as ProposalType,
    title: "",
    description: "",
  });

  const handleSubmit = async () => {
    if (!lunesAddress) {
      setError("Wallet not connected");
      return;
    }

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Submit proposal via direct contract call
      console.log("[Governance] Creating proposal:", formData);

      const contract = await import('@/lib/api/contract');
      await contract.createProposal(
        lunesAddress!,
        formData.type,
        formData.title,
        formData.description
      );

      // Success
      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      console.error("[Governance] Error creating proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "ConfigChange",
      title: "",
      description: "",
    });
    setStep(1);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg mx-4 bg-card border-golden/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-golden">
            <FileText className="w-5 h-5" />
            Create Proposal
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
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`flex-1 h-1 rounded ${step >= 1 ? "bg-golden" : "bg-muted"}`} />
            <div className={`flex-1 h-1 rounded ${step >= 2 ? "bg-golden" : "bg-muted"}`} />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Select the type of proposal you want to create:</p>
              <div className="grid gap-2">
                {PROPOSAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 rounded-lg border text-left transition-all ${formData.type === type.value
                      ? "border-golden bg-golden/10"
                      : "border-border hover:border-golden/50"
                      }`}
                  >
                    <p className="font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Proposal Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter a clear, concise title"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-golden"
                  maxLength={100}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your proposal in detail. Include the rationale, expected benefits, and any relevant data."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-golden resize-none h-32"
                  maxLength={1000}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/1000</p>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-500">
                  ⚠️ Creating a proposal requires a minimum payment of 100 USDT/LUSDT or equivalent in FIAPO,
                  plus having at least 1,000 FIAPO staked.
                </p>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-4">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} className="bg-golden text-black hover:bg-golden/90">
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.title.trim() || !formData.description.trim()}
                className="bg-golden text-black hover:bg-golden/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Proposal"
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
