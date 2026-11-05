import { Logo } from './Logo';

export function Splash({ message, action }: { message?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <div className={message ? '' : 'animate-pulse'}>
        <Logo size={56} />
      </div>
      {message && <p className="max-w-sm text-muted">{message}</p>}
      {action && <button className="btn-accent px-6" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
