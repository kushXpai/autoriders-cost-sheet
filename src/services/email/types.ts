// src/services/email/types.ts
export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface CostSheetSubmittedEmailData {
  costSheetId: string;
  companyName: string;
  submitterName: string;
  submitterEmail: string;
  submittedAt: string;
  viewUrl: string;
  vehicleInfo: string;
  grandTotal: number;
}

export interface CostSheetApprovedEmailData {
  costSheetId: string;
  companyName: string;
  approverName: string;
  approverRole: string;
  approvedAt: string;
  remarks?: string;
  viewUrl: string;
  creatorName: string;
  vehicleInfo: string;
  grandTotal: number;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailSettings {
  id: string;
  admin_emails: string[];
  super_admin_email: string;
  notifications_enabled: boolean;
  updated_at: string;
}