import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
