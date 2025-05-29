// src/services/userService.js
import User from '../models/user.model.js';

/**
 * List users, filter by role/username, paginate.
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 10)
 * @param {string} [options.role] - Optional role filter
 * @param {string} [options.username] - Optional username search
 * @param {Object} auditContext - Audit context
 * @returns {Promise<{users: Array, total: number, page: number, limit: number}>}
 */
export async function getAllUsers({ page = 1, limit = 10, role, username } = {}, auditContext) {
  const query = {};
  
  // Only add role to query if it's provided and not empty
  if (role && role.trim()) {
    query.role = role.trim();
  }
  
  // Add username search if provided
  if (username && username.trim()) {
    query.username = new RegExp(username.trim(), 'i');
  }

  const skip = (page - 1) * limit;
  const [ users, total ] = await Promise.all([
    User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password -refreshToken')
        .setOptions({
          actor: auditContext.actor,
          ip: auditContext.ip,
          ua: auditContext.ua
        })
        .lean(),
    User.countDocuments(query)
  ]);

  return { users, total, page, limit };
}

/**
 * Fetch one user by ID.
 */
export async function getUserById(id, auditContext) {
  const user = await User.findById(id)
                         .select('-password -refreshToken')
                         .setOptions({
                           actor: auditContext.actor,
                           ip: auditContext.ip,
                           ua: auditContext.ua
                         })
                         .lean();
  if (!user) throw new Error('User not found');
  return user;
}

/**
 * Update only profile fields: username, email, role.
 * (No password changes here.)
 */
export async function updateUser(id, { username, email, role }, auditContext) {
  const updates = {};
  if (username) updates.username = username;
  if (email)    updates.email    = email;
  if (role)     updates.role     = role;

  const user = await User.findByIdAndUpdate(
    id,
    updates,
    {
      new: true,
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    }
  )
  .select('-password -refreshToken')
  .lean();

  if (!user) throw new Error('User not found');
  return user;
}

/**
 * Remove a user.
 */
export async function deleteUser(id, auditContext) {
  const user = await User.findByIdAndDelete(id)
    .setOptions({
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    })
    .lean();
  if (!user) throw new Error('User not found');
  return user;
}
