/** Photos are stored in MongoDB and served by the API (only to their owner). */
import { API_BASE, api } from './api';

export const photoUrl = (id?: string) => (id ? `${API_BASE}/photos/${encodeURIComponent(id)}` : undefined);

export async function savePhoto(dataUrl: string): Promise<string> {
  const { id } = await api.post<{ id: string }>('/photos', { dataUrl });
  return id;
}

export const usePhoto = (id?: string) => photoUrl(id);
