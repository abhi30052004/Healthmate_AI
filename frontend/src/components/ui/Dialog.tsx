import React, { createContext, useContext, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface DialogContextValue {
  isOpen: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export interface DialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  isOpen: isOpenProp,
  open: openProp,
  onClose: onCloseProp,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = "md",
}: DialogProps) {
  const activeOpen = openProp !== undefined ? openProp : !!isOpenProp;
  const activeClose = () => {
    if (onCloseProp) onCloseProp();
    if (onOpenChange) onOpenChange(false);
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (activeOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          activeClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [activeOpen]);

  const maxWidthClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <DialogContext.Provider value={{ isOpen: activeOpen, onClose: activeClose }}>
      <AnimatePresence>
        {activeOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "dialog-title" : undefined}
            aria-describedby={description ? "dialog-desc" : undefined}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={activeClose}
              aria-hidden="true"
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Dialog Container */}
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-xl border border-[var(--border)] shadow-2 overflow-hidden z-10`}
            >
              {title ? (
                <>
                  {/* Default Header */}
                  <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
                    <div>
                      <h2 id="dialog-title" className="text-lg font-display font-semibold text-[var(--text)]">
                        {title}
                      </h2>
                      {description && (
                        <p id="dialog-desc" className="text-xs text-[var(--muted)] mt-1">
                          {description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={activeClose}
                      aria-label="Close dialog"
                      className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus)]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {/* Content */}
                  <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
                </>
              ) : (
                children
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`relative max-h-[85vh] overflow-y-auto ${className}`}>{children}</div>;
}

export function DialogHeader({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(DialogContext);

  return (
    <div className={`flex items-start justify-between p-5 border-b border-[var(--border)] ${className}`}>
      <div className="flex-1">{children}</div>
      {ctx && (
        <button
          type="button"
          onClick={ctx.onClose}
          aria-label="Close dialog"
          className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors ml-3"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className={`text-lg font-display font-semibold text-[var(--text)] ${className}`}>
      {children}
    </h2>
  );
}
