/**
 * adminAuthService.js
 * Municipal Admin Authentication & Session Management Service
 * 
 * Ticket: SPT-010
 */

import { MUNICIPAL_ROLES, MUNICIPAL_WARDS } from '../utils/wardJurisdictions';

// Default mock municipal staff account for demo & offline inspection
const DEFAULT_STAFF_USER = {
  id: 'STAFF-CMC-882',
  name: 'Eng. K. Perera',
  email: 'k.perera@cmc.gov.lk',
  badgeNumber: 'CMC-ENG-882',
  role: 'CHIEF_ENGINEER',
  assignedWardId: 'CMC-W01', // Fort & Pettah
  department: 'Urban Accessibility & Civil Works Division',
  token: 'mock-jwt-token-cmc-882-verified',
  sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
};

class AdminAuthService {
  constructor() {
    this.currentUser = { ...DEFAULT_STAFF_USER };
    this.listeners = [];
  }

  /**
   * Subscribe to auth state updates
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.token;
  }

  /**
   * Mock staff login with ward jurisdiction selection
   */
  async login({ email, password, wardId, role = 'CHIEF_ENGINEER' }) {
    // Simulating authentication delay
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!email || !password) {
      throw new Error('Municipal email and security PIN/password are required.');
    }

    const selectedWard = MUNICIPAL_WARDS.find((w) => w.id === wardId) || MUNICIPAL_WARDS[0];
    const roleConfig = MUNICIPAL_ROLES[role] || MUNICIPAL_ROLES.CHIEF_ENGINEER;

    this.currentUser = {
      id: `STAFF-${Math.floor(100 + Math.random() * 900)}`,
      name: email.split('@')[0].replace('.', ' ').toUpperCase(),
      email,
      badgeNumber: `CMC-${role.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
      role,
      assignedWardId: selectedWard.id,
      department: 'Urban Accessibility & Civil Works Division',
      token: `jwt-session-${Date.now()}`,
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };

    this.notify();
    return this.currentUser;
  }

  /**
   * Switch active ward jurisdiction for multi-ward supervisory engineers
   */
  switchWard(wardId) {
    const ward = MUNICIPAL_WARDS.find((w) => w.id === wardId);
    if (!ward) throw new Error(`Ward ID ${wardId} not found.`);

    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        assignedWardId: wardId,
      };
      this.notify();
    }
    return this.currentUser;
  }

  /**
   * Switch active municipal role (for role-based inspection demo)
   */
  switchRole(roleKey) {
    if (!MUNICIPAL_ROLES[roleKey]) {
      throw new Error(`Invalid role key: ${roleKey}`);
    }
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        role: roleKey,
      };
      this.notify();
    }
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.notify();
  }

  hasPermission(permissionName) {
    if (!this.currentUser) return false;
    const roleConfig = MUNICIPAL_ROLES[this.currentUser.role];
    return roleConfig ? roleConfig.permissions.includes(permissionName) : false;
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
