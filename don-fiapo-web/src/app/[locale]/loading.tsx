import { Crown } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-golden/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Crown className="w-8 h-8 text-golden animate-bounce" />
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
