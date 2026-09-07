/**
 * adminAuthService.js
 * Municipal Admin Authentication & Session Management Service
 * 
 * Ticket: SPT-010
 * Integrated with central authService for unified session management
 */

import { MUNICIPAL_ROLES, MUNICIPAL_WARDS } from '../utils/wardJurisdictions';
import { apiRequest } from './api';
import authService from './authService';

class AdminAuthService {
  constructor() {
    this.currentUser = authService.getCurrentUser();
    this.listeners = [];

    // Sync with central auth service
    authService.subscribe((user) => {
      this.currentUser = user;
      this.notify();
    });
  }

  /**
   * Subscribe to auth state updates
   */
  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser);
      } catch (_e) {}
    });
  }

  getCurrentUser() {
    return authService.getCurrentUser() || this.currentUser;
  }

  isAuthenticated() {
    return authService.isAuthenticated();
  }

  /**
   * Municipal staff login with backend API connection & offline fallback
   */
  async login({ email, password, wardId, role = 'CHIEF_ENGINEER' }) {
    const user = await authService.login({ email, password });
    if (wardId && user) {
      user.assignedWardId = wardId;
    }
    this.currentUser = user;
    this.notify();
    return user;
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
    authService.logout();
    this.notify();
  }

  hasPermission(permissionName) {
    const current = this.getCurrentUser();
    if (!current) return false;
    const roleConfig = MUNICIPAL_ROLES[current.role];
    if (roleConfig) {
      return roleConfig.permissions.includes(permissionName);
    }
    // Admins and Super Admins have all permissions
    return current.role === 'ADMIN' || current.role === 'SUPER_ADMIN' || !!current.isSuperAdmin;
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
