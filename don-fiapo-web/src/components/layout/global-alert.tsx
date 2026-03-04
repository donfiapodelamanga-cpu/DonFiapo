"use client";

import { useEffect, useState } from "react";
import { IcoWaitlistModal } from "@/components/modals/IcoWaitlistModal";

export function GlobalAlert() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Show modal on first visit (using session storage to persist across refreshes if desired, 
        // but user requested "every time", so we'll just show it on mount)

        // Small delay to ensure smooth hydration and animations
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <IcoWaitlistModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            autoOpen={true}
        />
    );
}
