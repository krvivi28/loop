export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}
export const badRequest = (msg: string, code = 'bad_request') => new HttpError(400, code, msg);
export const unauthorized = (msg = 'Please log in again.') => new HttpError(401, 'unauthorized', msg);
export const notFound = (what = 'Item') => new HttpError(404, 'not_found', `${what} not found.`);
export const tooMany = (msg: string) => new HttpError(429, 'rate_limited', msg);
