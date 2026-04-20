export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8)
    return { valid: false, error: 'הסיסמה חייבת להכיל לפחות 8 תווים' };
  if (!/[A-Z]/.test(password))
    return { valid: false, error: 'הסיסמה חייבת להכיל לפחות אות גדולה אחת' };
  if (!/[0-9]/.test(password))
    return { valid: false, error: 'הסיסמה חייבת להכיל לפחות ספרה אחת' };
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return { valid: false, error: 'כתובת אימייל לא תקינה' };
  return { valid: true };
}

export function validateName(name: string): ValidationResult {
  if (name.trim().length < 2)
    return { valid: false, error: 'השם חייב להכיל לפחות 2 תווים' };
  return { valid: true };
}
