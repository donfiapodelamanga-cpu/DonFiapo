"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[800px] h-[80vh] bg-zinc-950 border-golden/20 text-white">
                <DialogHeader>
                    <DialogTitle className="text-golden font-display tracking-widest uppercase">
                        Terms of Consent & Privacy Policy
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Official Decree of the Don Fiapo Organization
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-full pr-4 text-justify space-y-4 text-sm text-zinc-300">
                    <div className="space-y-4">
                        <p><strong>1. Acceptance of Terms</strong></p>
                        <p>By joining the "Royal Family" (the Waitlist), you agree to provide your email address to the Don Fiapo Organization.</p>

                        <p><strong>2. Data Usage</strong></p>
                        <p>We use your email exclusively for:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Notifying you about the Token Generation Event (TGE).</li>
                            <li>Sending updates about your Free Mining status.</li>
                            <li>Delivering special community rewards and airdrop information.</li>
                        </ul>

                        <p><strong>3. No Spam Policy</strong></p>
                        <p>The Don despises spam. We will never sell your data to third-party "peasants". Your loyalty stays within the Family.</p>

                        <p><strong>4. Unsubscription</strong></p>
                        <p>You can leave the Family at any time by clicking the "Unsubscribe" link in our emails, though this may result in loss of noble status.</p>
                    </div>
                </ScrollArea>

                <div className="flex justify-end pt-4 border-t border-zinc-800">
                    <Button onClick={onClose} variant="outline" className="border-golden/50 text-golden hover:bg-golden/10">
                        I Understand
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
