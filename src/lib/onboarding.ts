/** Per-account onboarding state. Kept in localStorage; every access is guarded. */

export const defaultUsername = (id: string) => `user_${id.replace(/-/g, '')}`;
export const hasDefaultUsername = (user: { id: string; username: string }) => user.username === defaultUsername(user.id);
/** Auto-generated handles (user_<32 hex>) are hidden from suggestions. */
export const isGeneratedUsername = (username: string) => /^user_[0-9a-f]{32}$/i.test(username);

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

const k = (name: string, id: string) => `lune_${name}_${id}`;

export const isOnboardingDone = (id: string) => read(k('onboarded', id)) === '1';
export const markOnboardingDone = (id: string) => write(k('onboarded', id), '1');

/** New accounts (still on the generated handle, never finished the flow) get the welcome flow. */
export const needsOnboarding = (user: { id: string; username: string }) => hasDefaultUsername(user) && !isOnboardingDone(user.id);
export const postAuthPath = (user: { id: string; username: string }) => (needsOnboarding(user) ? '/welcome' : '/');

export const getInterests = (id: string): string[] => {
  try { const value = JSON.parse(read(k('interests', id)) || '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []; } catch { return []; }
};
export const setInterests = (id: string, interests: string[]) => write(k('interests', id), JSON.stringify(interests));

export const isChecklistDismissed = (id: string) => read(k('checklist_dismissed', id)) === '1';
export const dismissChecklist = (id: string) => write(k('checklist_dismissed', id), '1');

export const hasPostedFirst = (id: string) => read(k('first_post', id)) === '1';
export const markPostedFirst = (id: string) => write(k('first_post', id), '1');

export const INTERESTS = ['Crypto', 'Trading', 'DeFi', 'NFTs', 'Memes', 'Dev', 'Design', 'AI', 'Gaming', 'Music', 'Art', 'Sports', 'News', 'Startups'];
