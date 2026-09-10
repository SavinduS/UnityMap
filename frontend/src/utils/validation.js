/**
 * validation.js
 * Centralized professional input validation utilities for UnityMap
 * 
 * Enforces strict standards:
 * - Email: Only letters, numbers, and allowed punctuation (@, ., _, -, +). No spaces or illegal symbols.
 * - Names: Only letters, spaces, hyphens, and apostrophes.
 * - Phone: International and local formatting (digits, spaces, hyphens, leading +).
 * - Password: Length enforcement and strength calculation (Weak, Fair, Strong).
 * - Match validation for Confirm Password.
 */

// Disallowed email symbols regex: any character that is not alphanumeric, @, ., _, -, or +
const EMAIL_INVALID_CHARS_REGEX = /[^a-zA-Z0-9.@_+-]/;

// Standard strict email RFC 5322 compliant simplified regex with valid TLD of at least 2 chars
const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Name regex: letters, spaces, hyphens, apostrophes
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

// Phone characters allowed: digits, spaces, hyphens, plus
const PHONE_ALLOWED_CHARS_REGEX = /^[0-9+\s-]+$/;

/**
 * Validate an email address
 * @param {string} email 
 * @param {boolean} isRequired 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateEmail = (email = '', isRequired = true) => {
  const trimmed = (email || '').trim();

  if (!trimmed) {
    return {
      isValid: !isRequired,
      error: isRequired ? 'Email address is required.' : null,
    };
  }

  // 1. Check for spaces anywhere in email
  if (/\s/.test(email)) {
    return {
      isValid: false,
      error: 'Email address cannot contain spaces.',
    };
  }

  // 2. Strict character check: Only allow letters, numbers, @, ., _, -, +
  if (EMAIL_INVALID_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Email can only contain letters, numbers, '@', and '.' symbols.",
    };
  }

  // 3. Count @ symbols
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount === 0) {
    return {
      isValid: false,
      error: "Email address must include an '@' symbol.",
    };
  }
  if (atCount > 1) {
    return {
      isValid: false,
      error: "Email address can only contain a single '@' symbol.",
    };
  }

  const [localPart, domainPart] = trimmed.split('@');

  // 4. Validate local part (before @)
  if (!localPart) {
    return {
      isValid: false,
      error: "Please enter the username portion before the '@'.",
    };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      error: "Email cannot start or end with a dot ('.').",
    };
  }
  if (localPart.includes('..')) {
    return {
      isValid: false,
      error: "Email cannot contain consecutive dots ('..').",
    };
  }

  // 5. Validate domain part (after @)
  if (!domainPart) {
    return {
      isValid: false,
      error: "Please enter the domain after '@' (e.g. example.com).",
    };
  }
  if (!domainPart.includes('.')) {
    return {
      isValid: false,
      error: "Domain must include a '.' and extension (e.g. .com, .lk).",
    };
  }
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return {
      isValid: false,
      error: "Domain cannot start or end with a dot ('.').",
    };
  }
  if (domainPart.includes('..')) {
    return {
      isValid: false,
      error: "Domain cannot contain consecutive dots ('..').",
    };
  }

  // 6. Comprehensive regex check
  if (!EMAIL_FORMAT_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g. kasun@example.com).',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate a first or last name
 * @param {string} name 
 * @param {string} fieldName 
 * @param {boolean} isRequired 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateName = (name = '', fieldName = 'Name', isRequired = true) => {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return {
      isValid: !isRequired,
      error: isRequired ? `${fieldName} is required.` : null,
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 2 characters.`,
    };
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed 50 characters.`,
    };
  }

  if (!NAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, spaces, and hyphens.`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate phone number
 * @param {string} phone 
 * @param {boolean} isRequired 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validatePhone = (phone = '', isRequired = false) => {
  const trimmed = (phone || '').trim();

  if (!trimmed) {
    return {
      isValid: !isRequired,
      error: isRequired ? 'Phone number is required.' : null,
    };
  }

  // Check allowed characters: digits, spaces, hyphens, optional leading +
  if (!PHONE_ALLOWED_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Phone number can only contain digits, spaces, and '+'.",
    };
  }

  // Extract pure digits
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 9) {
    return {
      isValid: false,
      error: 'Phone number must contain at least 9 digits.',
    };
  }
  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Phone number cannot exceed 15 digits.',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Calculate password strength and recommendations
 * @param {string} password 
 * @returns {{ score: 'weak'|'medium'|'strong', label: string, percent: number, color: string, hints: string[] }}
 */
export const calculatePasswordStrength = (password = '') => {
  if (!password) {
    return {
      score: 'weak',
      label: 'Too Short',
      percent: 0,
      color: '#9CA3AF',
      hints: ['At least 6 characters required'],
    };
  }

  const length = password.length;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const hints = [];
  if (length < 6) hints.push('Must be at least 6 characters');
  if (!hasLetters) hints.push('Include letters');
  if (!hasNumbers) hints.push('Include at least one number');
  if (length >= 6 && (!hasUpper || !hasLower)) hints.push('Use mixed case for better security');

  if (length < 6) {
    return {
      score: 'weak',
      label: 'Weak (Min 6 Chars)',
      percent: 25,
      color: '#EF4444',
      hints,
    };
  }

  // Score evaluation
  let passedCriteria = 0;
  if (length >= 8) passedCriteria++;
  if (hasLetters && hasNumbers) passedCriteria++;
  if (hasUpper && hasLower) passedCriteria++;
  if (hasSpecial) passedCriteria++;

  if (passedCriteria >= 3 && length >= 8) {
    return {
      score: 'strong',
      label: 'Strong Password',
      percent: 100,
      color: '#10B981',
      hints: ['Great! Secure password.'],
    };
  }

  if (hasLetters && hasNumbers) {
    return {
      score: 'medium',
      label: 'Fair (Good)',
      percent: 65,
      color: '#F59E0B',
      hints,
    };
  }

  return {
    score: 'weak',
    label: 'Weak',
    percent: 35,
    color: '#EF4444',
    hints,
  };
};

/**
 * Validate password
 * @param {string} password 
 * @param {boolean} isRequired 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validatePassword = (password = '', isRequired = true) => {
  if (!password) {
    return {
      isValid: !isRequired,
      error: isRequired ? 'Password is required.' : null,
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters long.',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate confirm password against original password
 * @param {string} password 
 * @param {string} confirmPassword 
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateConfirmPassword = (password = '', confirmPassword = '') => {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'Please confirm your password.',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match.',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate complete login form
 * @param {string} email 
 * @param {string} password 
 * @returns {{ isValid: boolean, errors: { email?: string, password?: string } }}
 */
export const validateLoginForm = (email, password) => {
  const emailRes = validateEmail(email, true);
  const passwordRes = validatePassword(password, true);

  const errors = {};
  if (!emailRes.isValid) errors.email = emailRes.error;
  if (!passwordRes.isValid) errors.password = passwordRes.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate complete registration form
 * @param {{ firstName: string, lastName?: string, email: string, phone?: string, password: string, confirmPassword?: string }} form
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export const validateRegisterForm = ({
  firstName = '',
  lastName = '',
  email = '',
  phone = '',
  password = '',
  confirmPassword = '',
}) => {
  const errors = {};

  const fnRes = validateName(firstName, 'First name', true);
  if (!fnRes.isValid) errors.firstName = fnRes.error;

  const lnRes = validateName(lastName, 'Last name', false);
  if (!lnRes.isValid) errors.lastName = lnRes.error;

  const emailRes = validateEmail(email, true);
  if (!emailRes.isValid) errors.email = emailRes.error;

  const phoneRes = validatePhone(phone, false);
  if (!phoneRes.isValid) errors.phone = phoneRes.error;

  const passRes = validatePassword(password, true);
  if (!passRes.isValid) errors.password = passRes.error;

  const confirmRes = validateConfirmPassword(password, confirmPassword);
  if (!confirmRes.isValid) errors.confirmPassword = confirmRes.error;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateEmail,
  validateName,
  validatePhone,
  validatePassword,
  calculatePasswordStrength,
  validateConfirmPassword,
  validateLoginForm,
  validateRegisterForm,
};
