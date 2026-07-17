/**
 * StadiumOS AI — User Domain Entity.
 * 
 * Represents an authenticated system user with RBAC role authorization.
 */

import { UserRole } from "../enums";

export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly hashedPassword: string;
  public readonly role: UserRole;
  public is_active: boolean;
  public readonly created_at: Date;
  public updated_at: Date;

  constructor(
    id: string,
    email: string,
    hashedPassword: string,
    role: UserRole = UserRole.FAN,
    is_active: boolean = true,
    created_at: Date = new Date(),
    updated_at: Date = new Date()
  ) {
    this.id = id;
    this.email = email;
    this.hashedPassword = hashedPassword;
    this.role = role;
    this.is_active = is_active;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  /**
   * Check if this user's role satisfies the required role level.
   * ADMIN > OPERATOR > VOLUNTEER > FAN
   */
  public hasPermission(requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.FAN]: 0,
      [UserRole.VOLUNTEER]: 1,
      [UserRole.OPERATOR]: 2,
      [UserRole.ADMIN]: 3
    };
    return roleHierarchy[this.role] >= roleHierarchy[requiredRole];
  }

  public deactivate(): void {
    this.is_active = false;
    this.updated_at = new Date();
  }
}
