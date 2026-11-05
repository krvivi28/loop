import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, CircleCheckBig, Layers, PartyPopper, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { celebrate } from '../lib/feedback';
import { useApp } from '../state/AppContext';
import { Sheet } from './Sheet';

interface Step {
  icon: ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { icon: <CircleCheckBig size={32} />, title: 'Your daily checklist', body: 'See every dose due today, tap to mark it taken, and build your streak.' },
  { icon: <UtensilsCrossed size={32} />, title: 'Log meals in seconds', body: 'Snap a photo of your plate — AI estimates calories and macros instantly.' },
  { icon: <Layers size={32} />, title: 'Manage your stack', body: 'Add supplements and medicines once. Loop remembers the schedule, dose and stock.' },
  { icon: <BarChart3 size={32} />, title: 'Track your progress', body: 'Adherence, nutrition and weight charts, all in one place.' },
  { icon: <Sparkles size={32} />, title: 'Your personal coach', body: 'Get weekly insights and ask about your doses, meals and training.' },
];

export function Tour({ open }: { open: boolean }) {
  const { actions, data } = useApp();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length;

  const finish = () => {
    if (last) celebrate(data.settings.accentColor);
    actions.completeTour();
    setStep(0);
  };

  return (
    <Sheet
      open={open}
      onClose={finish}
      footer={
        <div className="flex gap-3">
          {!last && <button className="btn-ghost flex-1" onClick={finish}>Skip</button>}
          <button
            className="btn-accent h-14 flex-1 text-[17px]"
            onClick={() => (last || step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
          >
            {last ? 'Start using Loop' : step === STEPS.length - 1 ? "Let's go" : 'Next'}
          </button>
        </div>
      }
    >
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-2 pb-2 pt-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={last ? 'done' : step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center"
          >
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-accent">
              {last ? <PartyPopper size={34} /> : STEPS[step].icon}
            </span>
            <h2 className="h-display text-[30px]">{last ? "You're all set!" : STEPS[step].title}</h2>
            <p className="mt-2 max-w-xs text-[16px] text-muted">
              {last ? 'Start building your stack and logging your day.' : STEPS[step].body}
            </p>
          </motion.div>
        </AnimatePresence>

        {!last && (
          <div className="mt-8 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-line'}`} />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
