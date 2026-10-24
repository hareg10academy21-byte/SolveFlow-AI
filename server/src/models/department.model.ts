import { Schema, model, type InferSchemaType } from 'mongoose';

const departmentSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);
departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema>;
export const Department = model<DepartmentDocument>('Department', departmentSchema);
