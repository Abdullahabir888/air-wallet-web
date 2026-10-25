/** Name returned by Apple on first sign-in (Apple never sends it again). In-memory only. */
let pending: string | null = null;
export const setPendingName = (n: string) => {
  pending = n;
};
export const getPendingName = () => pending;
