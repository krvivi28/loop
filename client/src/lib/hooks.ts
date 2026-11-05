import { useEffect, useRef, useState } from 'react';

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Long-press handlers (for touch + mouse). */
export function useLongPress(onLongPress: () => void, ms = 600) {
  const t = useRef<number>();
  const start = () => {
    t.current = window.setTimeout(onLongPress, ms);
  };
  const cancel = () => window.clearTimeout(t.current);
  return { onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel };
}
