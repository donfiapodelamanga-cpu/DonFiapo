"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto remove after 8 seconds (longer for better visibility)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  const getIcon = (type: ToastType) => {
    const iconClass = "w-8 h-8";
    switch (type) {
      case "success": return <CheckCircle2 className={`${iconClass} text-green-400`} />;
      case "error": return <XCircle className={`${iconClass} text-red-400`} />;
      case "warning": return <AlertTriangle className={`${iconClass} text-yellow-400`} />;
      case "info": return <Loader2 className={`${iconClass} text-golden animate-spin`} />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-950/95 border-green-500",
          shadow: "shadow-[0_0_30px_rgba(34,197,94,0.4)]",
          glow: "ring-2 ring-green-500/30"
        };
      case "error":
        return {
          bg: "bg-red-950/95 border-red-500",
          shadow: "shadow-[0_0_30px_rgba(239,68,68,0.4)]",
          glow: "ring-2 ring-red-500/30"
        };
      case "warning":
        return {
          bg: "bg-yellow-950/95 border-yellow-500",
          shadow: "shadow-[0_0_30px_rgba(234,179,8,0.4)]",
          glow: "ring-2 ring-yellow-500/30"
        };
      case "info":
        return {
          bg: "bg-amber-950/95 border-golden",
          shadow: "shadow-[0_0_40px_rgba(255,215,0,0.5)]",
          glow: "ring-2 ring-golden/40"
        };
    }
  };

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-4 w-full max-w-md px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles = getStyles(toast.type);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`${styles.bg} ${styles.shadow} ${styles.glow} border-2 rounded-2xl backdrop-blur-md p-5`}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {getIcon(toast.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-white">{toast.title}</p>
                  {toast.message && (
                    <p className="text-sm text-white/80 mt-1">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {toast.type === "info" && (
                <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-golden"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 8, ease: "linear" }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

