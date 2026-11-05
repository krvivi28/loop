import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  full?: boolean;
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, wide, full }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative flex w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-surface shadow-2xl md:rounded-[1.75rem] ${
              full ? 'h-[94dvh] md:h-[86vh]' : 'max-h-[92dvh] md:max-h-[86vh]'
            } ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
            {title !== undefined && (
              <div className="flex items-center gap-2 px-5 pb-2 pt-3">
                <h2 className="h-display flex-1 text-[26px]">{title}</h2>
                <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close">
                  <X size={22} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && (
              <div className="border-t border-line/70 bg-surface px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Confirm({
  open, onClose, title, body, confirmLabel, onConfirm, danger,
}: {
  open: boolean; onClose: () => void; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; danger?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <button className="btn-soft flex-1" onClick={onClose}>Cancel</button>
          <button
            className={`${danger ? 'btn bg-bad text-white hover:brightness-110' : 'btn-accent'} flex-1`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-[16px] leading-relaxed text-muted">{body}</div>
    </Sheet>
  );
}
