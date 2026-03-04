"use client";

import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const toastStyles = {
  success: "bg-green-500/10 border-green-500/50 text-green-500",
  error: "bg-red-500/10 border-red-500/50 text-red-500",
  warning: "bg-yellow-500/10 border-yellow-500/50 text-yellow-500",
  info: "bg-blue-500/10 border-blue-500/50 text-blue-500",
};

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border min-w-[300px] animate-in slide-in-from-right duration-300",
              toastStyles[toast.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
