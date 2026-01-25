// src/services/email/service.ts

import { supabase } from '@/supabase/client';
import type { EmailResponse } from './types';

/**
 * Send email when a cost sheet is submitted for approval
 * Sends to: Super Admin + All Admin emails
 */
export async function sendCostSheetSubmittedEmail(
  costSheetId: string
): Promise<EmailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'submission',
        costSheetId,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
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
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'approval',
        costSheetId,
        approverRole,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message };
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