import { Schema, model, type InferSchemaType } from 'mongoose';

export const userRoles = ['customer', 'technician', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, default: 'customer', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    department: { type: String, trim: true, maxlength: 120, default: null },
    skills: { type: [String], default: [] },
    available: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0, required: true, select: false },
  },
  { timestamps: true },
);
userSchema.index({ organizationId: 1, role: 1, active: 1, available: 1, department: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model<UserDocument>('User', userSchema);
