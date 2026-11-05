import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastOpts {
  action?: { label: string; onClick: () => void };
  duration?: number;
  tone?: 'default' | 'error';
}
interface ToastItem extends ToastOpts {
  id: number;
  message: string;
}

const Ctx = createContext<(message: string, opts?: ToastOpts) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const n = useRef(0);
  const dismiss = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));
  const show = useCallback((message: string, opts: ToastOpts = {}) => {
    const id = ++n.current;
    setItems((xs) => [...xs.slice(-2), { id, message, ...opts }]);
    window.setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 5000 : 2800));
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              role="status"
              className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${
                t.tone === 'error' ? 'border-bad/40 bg-raised text-ink' : 'border-line bg-raised text-ink'
              }`}
            >
              <span className="flex-1 text-[15px] font-medium">{t.message}</span>
              {t.action && (
                <button
                  className="rounded-lg px-3 py-1.5 font-display text-base font-bold tracking-wide text-accent hover:bg-accent/10"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
