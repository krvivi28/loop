import { randomUUID } from 'node:crypto';
export const newId = () => randomUUID();
/** Client-generated ids (uuid or our fallback format). */
export const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
