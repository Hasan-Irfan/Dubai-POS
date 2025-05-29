import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  timestamp:      { type: Date, default: Date.now, index: true },

  // dynamic actor: User vs Employee
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'actorModel',
    index: true
  },
  actorModel: {
    type: String,
    required: true,
    enum: ['User','Employee'],
    index: true
  },

  action: {
    type: String,
    enum: ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT'],
    required: true,
    index: true
  },
  collectionName: { type: String, required: true, index: true },
  documentId:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  before:         mongoose.Schema.Types.Mixed,
  after:          mongoose.Schema.Types.Mixed,
  ipAddress:      String,
  userAgent:      String
}, {
  versionKey: false
});

// Compound index for recent actor activity
AuditLogSchema.index({ timestamp: -1, actorId: 1 });

export default mongoose.model('AuditLog', AuditLogSchema);
