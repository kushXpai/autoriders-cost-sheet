// src/services/emailService.ts
import { supabase } from "@/supabase/client";

interface CostSheetEmailParams {
  costSheetId: string;
  companyName: string;
  creatorName: string;
  creatorEmail: string;
  vehicleInfo: string;
  grandTotal: number;
  status: string;
  remarks?: string;
}

interface SendEmailParams {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get email settings from the database
async function getEmailSettings() {
  try {
    const { supabase } = await import('@/supabase/client');
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('notifications_enabled', true)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching email settings:', error);
      throw new Error('Failed to fetch email settings from database');
    }

    if (!data) {
      throw new Error('No email settings found in database');
    }

    console.log('Email settings loaded:', {
      super_admin: data.super_admin_email,
      admins: data.admin_emails,
      enabled: data.notifications_enabled
    });

    return {
      superAdminEmail: data.super_admin_email,
      adminEmails: data.admin_emails || [],
      notificationsEnabled: data.notifications_enabled
    };
  } catch (error) {
    console.error('Failed to get email settings:', error);
    throw error;
  }
}

async function sendEmailViaResend(payload: {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: payload,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message);
  }

  return data;
}

// SUBMISSION EMAIL - TO: Super Admin, CC: Admins
export async function sendCostSheetSubmissionEmail(params: CostSheetEmailParams) {
  console.log('=== sendCostSheetSubmissionEmail ===');
  console.log('Params:', params);
  
  const {
    costSheetId,
    companyName,
    creatorName,
    creatorEmail,
    vehicleInfo,
    grandTotal,
  } = params;

  // Get email settings from database
  const emailSettings = await getEmailSettings();
  
  if (!emailSettings.notificationsEnabled) {
    console.log('Email notifications are disabled in settings');
    return;
  }

  const subject = `📋 New Cost Sheet Submitted - ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .total { font-size: 24px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; background-color: #eff6ff; border-radius: 8px; }
          .alert { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Cost Sheet Awaiting Approval</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>⚠️ Action Required:</strong> A new cost sheet has been submitted and requires your approval.
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Cost Sheet ID:</span>
                <span class="value">#${costSheetId.substring(0, 8)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Company Name:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vehicle:</span>
                <span class="value">${vehicleInfo}</span>
              </div>
              <div class="detail-row">
                <span class="label">Submitted By:</span>
                <span class="value">${creatorName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Submitted By Email:</span>
                <span class="value">${creatorEmail}</span>
              </div>
            </div>

            <div class="total">
              Monthly Total: ${formatCurrency(grandTotal)}
            </div>

            <p style="text-align: center;">
              <strong>Please log in to review and approve this cost sheet.</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send to Super Admin (TO) and CC to all Admins
  await sendEmailViaResend({
    to: [emailSettings.superAdminEmail],
    cc: emailSettings.adminEmails,
    subject,
    html,
  });
}

// APPROVAL EMAIL - TO: Creator, CC: Super Admin & Admins
export async function sendCostSheetApprovalEmail(params: CostSheetEmailParams) {
  console.log('=== sendCostSheetApprovalEmail ===');
  console.log('Params:', params);
  
  const {
    costSheetId,
    companyName,
    creatorName,
    creatorEmail,
    vehicleInfo,
    grandTotal,
    remarks,
  } = params;

  if (!creatorEmail || !creatorEmail.includes('@')) {
    throw new Error('Invalid creator email address');
  }

  // Get email settings from database
  const emailSettings = await getEmailSettings();
  
  if (!emailSettings.notificationsEnabled) {
    console.log('Email notifications are disabled in settings');
    return;
  }

  const subject = `✅ Cost Sheet Approved - ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .total { font-size: 24px; font-weight: bold; color: #10b981; text-align: center; padding: 20px; background-color: #d1fae5; border-radius: 8px; }
          .remarks { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .success-badge { display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Cost Sheet Approved</h1>
          </div>
          <div class="content">
            <p>Dear ${creatorName},</p>
            <p>Congratulations! Your cost sheet has been <span class="success-badge">APPROVED</span>.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Cost Sheet ID:</span>
                <span class="value">#${costSheetId.substring(0, 8)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Company Name:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vehicle:</span>
                <span class="value">${vehicleInfo}</span>
              </div>
            </div>

            <div class="total">
              Monthly Total: ${formatCurrency(grandTotal)}
            </div>

            ${remarks ? `
              <div class="remarks">
                <strong>Approver's Remarks:</strong>
                <p style="margin: 10px 0 0 0;">${remarks}</p>
              </div>
            ` : ''}

            <p style="text-align: center;">
              <strong>You can now download the PDF from the system.</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Send to CREATOR (TO), CC to Super Admin and all Admins
  const ccEmails = [emailSettings.superAdminEmail, ...emailSettings.adminEmails];
  
  await sendEmailViaResend({
    to: [creatorEmail],
    cc: ccEmails,
    subject,
    html,
  });
}

// REJECTION EMAIL - TO: Creator, CC: Super Admin & Admins
export async function sendCostSheetRejectionEmail(params: CostSheetEmailParams) {
  console.log('=== sendCostSheetRejectionEmail ===');
  console.log('Params:', params);
  
  const {
    costSheetId,
    companyName,
    creatorName,
    creatorEmail,
    vehicleInfo,
    grandTotal,
    remarks,
  } = params;

  if (!creatorEmail || !creatorEmail.includes('@')) {
    throw new Error('Invalid creator email address');
  }

  // Get email settings from database
  const emailSettings = await getEmailSettings();
  
  if (!emailSettings.notificationsEnabled) {
    console.log('Email notifications are disabled in settings');
    return;
  }

  const subject = `❌ Cost Sheet Rejected - ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .total { font-size: 24px; font-weight: bold; color: #6b7280; text-align: center; padding: 20px; background-color: #f3f4f6; border-radius: 8px; }
          .remarks { background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .reject-badge { display: inline-block; background-color: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Cost Sheet Rejected</h1>
          </div>
          <div class="content">
            <p>Dear ${creatorName},</p>
            <p>Your cost sheet has been <span class="reject-badge">REJECTED</span>.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Cost Sheet ID:</span>
                <span class="value">#${costSheetId.substring(0, 8)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Company Name:</span>
                <span class="value">${companyName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Vehicle:</span>
                <span class="value">${vehicleInfo}</span>
              </div>
            </div>

            <div class="total">
              Monthly Total: ${formatCurrency(grandTotal)}
            </div>

            ${remarks ? `
              <div class="remarks">
                <strong>Rejection Reason:</strong>
                <p style="margin: 10px 0 0 0;">${remarks}</p>
              </div>
            ` : ''}

            <p>Please review the remarks and make necessary corrections before resubmitting.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const ccEmails = [emailSettings.superAdminEmail, ...emailSettings.adminEmails];
  
  await sendEmailViaResend({
    to: [creatorEmail],
    cc: ccEmails,
    subject,
    html,
  });
}