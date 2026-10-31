export interface PasswordCheckResult {
  hasLength: boolean; // more than 8 chars (>= 9)
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordCheckResult {
  const hasLength = (password || '').length > 8;
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasLowercase = /[a-z]/.test(password || '');
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password || '');

  return {
    hasLength,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    isValid: hasLength && hasUppercase && hasLowercase && hasSpecialChar,
  };
}

