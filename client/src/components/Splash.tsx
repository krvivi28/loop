import { Logo } from './Logo';

export function Splash({ message, action }: { message?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center gap-5 bg-bg px-6 text-center text-ink">
      <Logo size={56} spin={!message} />
      {message && <p className="max-w-sm text-muted">{message}</p>}
      {action && <button className="btn-accent px-6" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
