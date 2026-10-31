/**
 * Password Policy:
 * - More than 8 characters (i.e. length >= 9)
 * - At least one uppercase letter ([A-Z])
 * - At least one lowercase letter ([a-z])
 * - At least one special character ([^a-zA-Z0-9])
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length <= 8) {
    return { isValid: false, message: 'Password must be more than 8 characters (at least 9 characters long)' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g. !@#$%^&*)' };
  }

  return { isValid: true };
}

