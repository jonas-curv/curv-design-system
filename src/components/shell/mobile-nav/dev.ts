declare const process: { env: { NODE_ENV?: string } };

/**
 * True outside production builds. Written as the bare `process.env.NODE_ENV` expression so a bundler
 * can replace it; where nothing does and there is no `process`, the lookup throws and answers false.
 */
export const isDevelopment = () => {
  try { return process.env.NODE_ENV !== "production"; } catch { return false; }
};
