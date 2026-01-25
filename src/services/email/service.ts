// src/services/email/service.ts

import type { EmailResponse } from './types';

/**
 * Send email when a cost sheet is submitted for approval
 * Sends to: Super Admin + All Admin emails
 */
export async function sendCostSheetSubmittedEmail(
  costSheetId: string
): Promise<EmailResponse> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'submission',
        costSheetId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      return { success: false, error: data.error || 'Unknown error' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Unknown error' };
    }

    console.log('Cost sheet submission email sent:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Unexpected error sending submission email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email when a cost sheet is approved
 * Sends to: Creator (To) + Super Admin or Admins (CC) based on approver role
 */
export async function sendCostSheetApprovedEmail(
  costSheetId: string,
  approverRole: 'ADMIN' | 'SUPER_ADMIN'
): Promise<EmailResponse> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'approval',
        costSheetId,
        approverRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      return { success: false, error: data.error || 'Unknown error' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Unknown error' };
    }

    console.log('Cost sheet approval email sent:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Unexpected error sending approval email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}