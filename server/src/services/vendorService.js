// src/services/vendorService.js
import mongoose from 'mongoose';
import Vendor from '../models/vendor.model.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a new vendor.
 * @param {Object} vendorData – { name, contact:{ phone, email, address }, openingBalance? }
 * @param {Object} auditContext – { actor, ip, ua }
 */
export async function createVendor(vendorData, auditContext) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {

    const existingVendor = await Vendor.findOne({ 'contact.email': vendorData.contact.email });
    if (existingVendor) {
      throw new Error('Vendor already exists');
    }

    // 1) Build the Vendor document
    const vendor = new Vendor({
      ...vendorData,
      openingBalance: vendorData.openingBalance ?? 0
    });

    // 2) Attach audit metadata via $locals.audit
    vendor.$locals = vendor.$locals || {};
    vendor.$locals.audit = {
      actorId:    auditContext.actor.id,
      actorModel: auditContext.actor.model,
      ip:         auditContext.ip,
      ua:         auditContext.ua
    };

    // 3) Save under the session so auditPlugin sees $locals.audit
    const saved = await vendor.save({ session });

    // 4) Commit & return
    await session.commitTransaction();
    return saved.toObject();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * List vendors with optional status filter, search by name or email,
 * and pagination.
 * @param {Object} opts
 * @param {Object} opts.filters     – { status }
 * @param {string} opts.search      – matches name or contact.email
 * @param {number} opts.page=1
 * @param {number} opts.limit=10
 */
export async function getAllVendors({
  filters = {},
  search  = '',
  page    = 1,
  limit   = 10
} = {}) {
  const query = { status: 'active' };  // Only show active vendors by default
  if (filters.status) query.status = filters.status;

  if (search) {
    const re = new RegExp(search, 'i');
    query.$or = [
      { name:           re },
      { 'contact.email': re }
    ];
  }

  const skip = (page - 1) * limit;
  const [ total, vendors ] = await Promise.all([
    Vendor.countDocuments(query),
    Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return {
    vendors,
    pagination: {
      total,
      page,
      limit,
      totalPages:  Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/**
 * Fetch one vendor by its ID.
 * @param {string} id
 */
export async function getVendorById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid vendor ID');
  }
  const v = await Vendor.findById(id)
    .lean();
  if (!v) {
    throw new Error('Vendor not found');
  }
  return v;
}

/**
 * Update a vendor's mutable fields.
 * @param {string} id
 * @param {Object} data – { name?, contact?, status? }
 * @param {Object} auditContext – { actor, ip, ua }
 */
export async function updateVendor(id, data, auditContext) {
  try {
    console.log('Update vendor called with:', { id, data });
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid vendor ID');
    }
    
    // 1) Get the existing vendor first
    const existingVendor = await Vendor.findById(id).lean();
    if (!existingVendor) {
      throw new ApiError(404, 'Vendor not found');
    }
    
    // 2) Prepare update data with proper structure
    const updateData = {};
    
    // Handle name updates
    if (data.name !== undefined) {
      const newName = data.name.trim();
      updateData.name = newName;
      
      // Check for name uniqueness (case-insensitive match)
      const nameExists = await Vendor.findOne({
        name: { $regex: `^${escapeRegExp(newName)}$`, $options: 'i' }, // Exact match, ignore case
        _id: { $ne: id },
        status: { $ne: 'deleted' }
      });
      
      console.log('Name uniqueness check:', { name: newName, result: nameExists });
      
      if (nameExists) {
        throw new ApiError(409, 'A vendor with this name already exists');
      }
    }
    
    // Handle contact updates - this preserves all existing contact fields
    if (data.contact || data['contact.email']) {
      updateData.contact = { ...existingVendor.contact }; // Start with existing contact data
      
      // Handle direct contact object updates
      if (data.contact) {
        Object.assign(updateData.contact, data.contact);
      }
      
      // Handle dot notation for email (special case)
      if (data['contact.email'] !== undefined) {
        // Store the email exactly as entered (preserve case)
        updateData.contact.email = data['contact.email'];
      }
      
      // Check email uniqueness if it's being updated (case-insensitive comparison)
      if (updateData.contact.email && 
          updateData.contact.email.toLowerCase() !== existingVendor.contact?.email?.toLowerCase()) {
        const emailExists = await Vendor.findOne({
          'contact.email': { $regex: `^${escapeRegExp(updateData.contact.email)}$`, $options: 'i' },
          _id: { $ne: id },
          status: { $ne: 'deleted' }
        });
        
        console.log('Email uniqueness check:', { 
          email: updateData.contact.email, 
          result: emailExists 
        });
        
        if (emailExists) {
          throw new ApiError(409, 'A vendor with this email already exists');
        }
      }
    }
    
    // Handle status updates
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    
    console.log('Final update data:', updateData);
    
    // Helper function for escaping special characters in regex
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // 3) Update vendor - use $set to ensure values are stored exactly as provided
    const updatedVendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        actor: auditContext.actor,
        ip: auditContext.ip,
        ua: auditContext.ua,
      }
    ).lean();
    
    if (!updatedVendor) {
      throw new ApiError(404, 'Vendor not found after update attempt');
    }
    
    return updatedVendor;
  } catch (error) {
    console.error('Error in updateVendor:', error);
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw new ApiError(500, error.message || 'Error updating vendor');
    }
  }
}

/**
 * Soft delete a vendor by marking them as deleted.
 * @param {string} id
 * @param {Object} auditContext – { actor, ip, ua }
 */
export async function deleteVendor(id, auditContext) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid vendor ID');
  }

  const vendor = await Vendor.findById(id).lean();
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const v = await Vendor.findByIdAndUpdate(
    id,
    { status: 'deleted' },
    {
      new: true,
      actor: auditContext.actor,
      ip: auditContext.ip,
      ua: auditContext.ua
    }
  ).lean();
  if (!v) {
    throw new Error('Vendor not found');
  }
  return v;
}

