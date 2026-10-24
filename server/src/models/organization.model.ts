import { Schema, model, type InferSchemaType } from 'mongoose';

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]{2,80}$/ },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);
organizationSchema.index({ slug: 1 }, { unique: true });

export type OrganizationDocument = InferSchemaType<typeof organizationSchema>;
export const Organization = model<OrganizationDocument>('Organization', organizationSchema);
