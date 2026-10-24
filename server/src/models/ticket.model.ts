import { Schema, model, type InferSchemaType } from 'mongoose';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../types/ticket.js';

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    department: { type: String, trim: true, maxlength: 120, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    image: {
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      originalName: { type: String, default: null },
    },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignmentHistory: [
      {
        previousTechnician: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        technician: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        assignedAt: { type: Date, default: Date.now, required: true },
        note: { type: String, trim: true, maxlength: 600, default: null },
      },
    ],
    category: { type: String, enum: ticketCategories, default: 'Other', required: true },
    // This is the reporter's own assessment. It is intentionally separate from
    // the administrator-approved priority so it cannot be used to self-escalate work.
    reportedRisk: { type: String, enum: ticketPriorities, default: 'Medium', required: true },
    priority: { type: String, enum: ticketPriorities, default: 'Medium', required: true },
    status: { type: String, enum: ticketStatuses, default: 'New', required: true, index: true },
    aiAnalysis: {
      summary: { type: String, default: '' },
      suggestedCategory: { type: String, enum: ticketCategories, default: 'Other' },
      suggestedPriority: { type: String, enum: ticketPriorities, default: 'Medium' },
      priorityExplanation: { type: String, default: '' },
      reportedRiskComparison: { type: String, default: '' },
      missingInformation: { type: [String], default: [] },
      suggestedAction: { type: String, default: '' },
      possibleDuplicateTicketNumbers: { type: [String], default: [] },
      suggestedTechnicianIds: { type: [String], default: [] },
      status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
      model: { type: String, default: null },
      analyzedAt: { type: Date, default: null },
    },
    resolutionNotes: { type: String, default: null },
    activity: [
      {
        kind: {
          type: String,
          enum: ['comment', 'progress', 'status', 'assignment'],
          default: 'comment',
          required: true,
        },
        message: { type: String, required: true, maxlength: 1200 },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, default: Date.now },
        status: { type: String, enum: ticketStatuses, default: null },
        visibleToCustomer: { type: Boolean, default: true },
      },
    ],
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);
ticketSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
ticketSchema.index({ reporter: 1, updatedAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1, updatedAt: -1 });

export type TicketDocument = InferSchemaType<typeof ticketSchema>;
export const Ticket = model<TicketDocument>('Ticket', ticketSchema);
