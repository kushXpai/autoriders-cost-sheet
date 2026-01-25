// src/services/email/service.ts
import type { EmailResponse } from './types';

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

export async function sendCostSheetRejectedEmail(
  costSheetId: string,
  approverRole: 'ADMIN' | 'SUPER_ADMIN'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'rejection',
        costSheetId,
        approverRole,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send rejection email');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending rejection email:', error);
    return { success: false, error: error.message };
  }
}