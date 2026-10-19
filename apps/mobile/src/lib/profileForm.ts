/** Client-side checks for Account → Personal details (the API validates again). */
export interface ProfileDraft {
  fullName: string;
  email: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft, 'invalid'>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = draft.fullName.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errors.fullName = 'invalid';
  const email = draft.email.trim();
  if (email && !EMAIL.test(email)) errors.email = 'invalid';
  return errors;
}
