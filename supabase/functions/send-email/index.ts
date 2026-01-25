// supabase/functions/send-email/index.ts

['EMAIL_USER', 'EMAIL_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_URL'].forEach(key => {
  if (!Deno.env.get(key)) throw new Error(`${key} is missing in environment variables`);
});

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { connect } from "https://deno.land/x/smtp@v0.7.0/mod.ts"
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.34.0/dist/supabase.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface EmailRequest {
  type: 'submission' | 'approval'
  costSheetId: string
  approverRole?: 'ADMIN' | 'SUPER_ADMIN'
}

// Gmail SMTP configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: Deno.env.get('EMAIL_USER')!,
    pass: Deno.env.get('EMAIL_PASSWORD')!,
  },
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { type, costSheetId, approverRole } = await req.json() as EmailRequest

    console.log('Processing email request:', { type, costSheetId, approverRole })

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch email settings
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      console.error('Email settings error:', settingsError)
      throw new Error('Email settings not found')
    }

    console.log('Email settings loaded:', {
      superAdmin: settings.super_admin_email,
      adminCount: settings.admin_emails?.length || 0,
      enabled: settings.notifications_enabled,
    })

    if (!settings.notifications_enabled) {
      console.log('Notifications are disabled')
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch cost sheet with relations
    const { data: costSheet, error: costSheetError } = await supabase
      .from('cost_sheets')
      .select(`
        *,
        created_by_user:users!cost_sheets_created_by_fkey(id, full_name, email),
        approved_by_user:users!cost_sheets_approved_by_fkey(id, full_name, email, role),
        vehicle:vehicles(brand_name, model_name, variant_name)
      `)
      .eq('id', costSheetId)
      .single()

    if (costSheetError || !costSheet) {
      console.error('Cost sheet error:', costSheetError)
      throw new Error('Cost sheet not found')
    }

    console.log('Cost sheet loaded:', {
      id: costSheet.id,
      company: costSheet.company_name,
      creator: costSheet.created_by_user.email,
    })

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const viewUrl = `${appUrl}/cost-sheets/${costSheetId}`

    let emailData: any

    if (type === 'submission') {
      // Submission email - TO: Admins
      const recipients = [
        settings.super_admin_email,
        ...(settings.admin_emails || []),
      ].filter(email => email && typeof email === 'string' && email.includes('@'))

      const uniqueRecipients = [...new Set(recipients)]

      console.log('Submission recipients:', uniqueRecipients)

      if (uniqueRecipients.length === 0) {
        throw new Error('No valid admin emails configured')
      }

      const formattedDate = new Date(costSheet.submitted_at || costSheet.created_at)
        .toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })

      const vehicleInfo = costSheet.vehicle 
        ? `${costSheet.vehicle.brand_name} ${costSheet.vehicle.model_name} - ${costSheet.vehicle.variant_name}`
        : 'N/A'

      const html = generateSubmissionEmail({
        companyName: costSheet.company_name,
        submitterName: costSheet.created_by_user.full_name,
        submittedAt: formattedDate,
        costSheetId,
        viewUrl,
        vehicleInfo,
        grandTotal: costSheet.grand_total,
      })

      emailData = {
        from: `AutoRiders <${SMTP_CONFIG.auth.user}>`,
        to: uniqueRecipients,
        subject: `🚗 New Cost Sheet Submitted - ${costSheet.company_name}`,
        html,
      }

    } else if (type === 'approval') {
      // Approval email - TO: Creator, CC: Other Admins
      
      if (!costSheet.created_by_user.email || !costSheet.created_by_user.email.includes('@')) {
        throw new Error('Creator email is invalid or missing')
      }

      let ccEmails: string[] = []

      if (approverRole === 'ADMIN') {
        ccEmails = [settings.super_admin_email]
      } else if (approverRole === 'SUPER_ADMIN') {
        ccEmails = settings.admin_emails || []
      }

      // Filter and validate CC emails
      ccEmails = [...new Set(ccEmails)].filter(
        (email) => email && 
                   typeof email === 'string' && 
                   email.includes('@') && 
                   email !== costSheet.created_by_user.email
      )

      console.log('Approval email - TO:', costSheet.created_by_user.email, 'CC:', ccEmails)

      const formattedDate = new Date(costSheet.approved_at || new Date())
        .toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })

      const vehicleInfo = costSheet.vehicle 
        ? `${costSheet.vehicle.brand_name} ${costSheet.vehicle.model_name} - ${costSheet.vehicle.variant_name}`
        : 'N/A'

      const html = generateApprovalEmail({
        companyName: costSheet.company_name,
        approverName: costSheet.approved_by_user.full_name,
        approverRole: costSheet.approved_by_user.role,
        approvedAt: formattedDate,
        remarks: costSheet.approval_remarks,
        viewUrl,
        creatorName: costSheet.created_by_user.full_name,
        vehicleInfo,
        grandTotal: costSheet.grand_total,
      })

      emailData = {
        from: `AutoRiders <${SMTP_CONFIG.auth.user}>`,
        to: [costSheet.created_by_user.email],
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: `✅ Cost Sheet Approved - ${costSheet.company_name}`,
        html,
      }
    } else {
      throw new Error('Invalid email type')
    }

    // Send email using SMTP
    console.log('Sending email via SMTP...')
    const messageId = await sendEmailViaSMTP(emailData)
    console.log('Email sent successfully:', messageId)

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Email send error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// SMTP email sender using Gmail
async function sendEmailViaSMTP(emailData: any): Promise<string> {
  const client = await connect({
    hostname: 'smtp.gmail.com',
    port: 587,
    username: Deno.env.get('EMAIL_USER')!,
    password: Deno.env.get('EMAIL_PASSWORD')!,
    tls: { starttls: true },
  })

  try {
    await client.send({
      from: emailData.from,
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      cc: Array.isArray(emailData.cc) ? emailData.cc : undefined,
      subject: emailData.subject,
      content: emailData.html,
    });
    await client.close()
    return `${Date.now()}@autoriders.com`
  } catch (err) {
    try { await client.close() } catch {}
    throw new Error(`Failed to send email: ${err.message}`)
  }
}

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Email templates
function generateSubmissionEmail(data: any) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Cost Sheet Submitted</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .body {
      padding: 40px 30px;
    }
    .alert-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .alert-box strong {
      color: #92400e;
      font-size: 16px;
      display: block;
      margin-bottom: 8px;
    }
    .alert-box p {
      color: #78350f;
      margin: 0;
      font-size: 14px;
    }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .value {
      color: #1e293b;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
    }
    .total-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .total-box .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 8px;
    }
    .total-box .amount {
      font-size: 32px;
      font-weight: 700;
      color: white;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #64748b;
      font-size: 13px;
      margin: 8px 0;
    }
    .footer .company {
      font-weight: 600;
      color: #667eea;
      font-size: 14px;
    }
    h2 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    p {
      color: #475569;
      font-size: 15px;
      margin: 12px 0;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="icon">🚗</div>
      <h1>AutoRiders Cost Sheet System</h1>
    </div>
    
    <div class="body">
      <div class="alert-box">
        <strong>⚠️ Action Required</strong>
        <p>A new cost sheet has been submitted and requires your immediate attention for approval.</p>
      </div>

      <h2>📋 New Submission Details</h2>
      <p>Hello Admin,</p>
      <p>A cost sheet has been submitted and is awaiting your review and approval.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Cost Sheet ID</span>
          <span class="value">#${data.costSheetId.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="label">Company Name</span>
          <span class="value">${data.companyName}</span>
        </div>
        <div class="info-row">
          <span class="label">Vehicle</span>
          <span class="value">${data.vehicleInfo}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted By</span>
          <span class="value">${data.submitterName}</span>
        </div>
        <div class="info-row">
          <span class="label">Submitted On</span>
          <span class="value">${data.submittedAt}</span>
        </div>
      </div>

      <div class="total-box">
        <div class="label">Monthly Total Amount</div>
        <div class="amount">${formatCurrency(data.grandTotal)}</div>
      </div>

      <div class="divider"></div>

      <p style="text-align: center; font-weight: 500;">
        Please review the cost sheet details and take appropriate action.
      </p>

      <center>
        <a href="${data.viewUrl}" class="button">
          📊 Review Cost Sheet
        </a>
      </center>

      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 20px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${data.viewUrl}" style="color: #667eea; word-break: break-all;">${data.viewUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p class="company">© ${new Date().getFullYear()} AutoRiders Fleet Management</p>
      <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
      <p>Please do not reply to this email. For support, contact your system administrator.</p>
    </div>
  </div>
</body>
</html>
  `
}

function generateApprovalEmail(data: any) {
  const roleDisplay = data.approverRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cost Sheet Approved</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .body {
      padding: 40px 30px;
    }
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid #10b981;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .success-box strong {
      color: #065f46;
      font-size: 16px;
      display: block;
      margin-bottom: 8px;
    }
    .success-box p {
      color: #047857;
      margin: 0;
      font-size: 14px;
    }
    .success-badge {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin: 15px 0;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 25px;
      margin: 25px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .value {
      color: #1e293b;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
    }
    .total-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .total-box .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 8px;
    }
    .total-box .amount {
      font-size: 32px;
      font-weight: 700;
      color: white;
    }
    .remarks-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .remarks-box strong {
      color: #92400e;
      font-size: 15px;
      display: block;
      margin-bottom: 10px;
    }
    .remarks-box p {
      color: #78350f;
      margin: 0;
      font-size: 14px;
      font-style: italic;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #64748b;
      font-size: 13px;
      margin: 8px 0;
    }
    .footer .company {
      font-weight: 600;
      color: #10b981;
      font-size: 14px;
    }
    h2 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    p {
      color: #475569;
      font-size: 15px;
      margin: 12px 0;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="icon">✅</div>
      <h1>Cost Sheet Approved</h1>
    </div>
    
    <div class="body">
      <div class="success-box">
        <strong>🎉 Congratulations!</strong>
        <p>Your cost sheet has been successfully reviewed and approved.</p>
      </div>

      <h2>Hello ${data.creatorName},</h2>
      <p>Great news! Your cost sheet submission has been <span class="success-badge">APPROVED</span></p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Company Name</span>
          <span class="value">${data.companyName}</span>
        </div>
        <div class="info-row">
          <span class="label">Vehicle</span>
          <span class="value">${data.vehicleInfo}</span>
        </div>
        <div class="info-row">
          <span class="label">Approved By</span>
          <span class="value">${data.approverName} (${roleDisplay})</span>
        </div>
        <div class="info-row">
          <span class="label">Approved On</span>
          <span class="value">${data.approvedAt}</span>
        </div>
      </div>

      <div class="total-box">
        <div class="label">Approved Monthly Amount</div>
        <div class="amount">${formatCurrency(data.grandTotal)}</div>
      </div>

      ${data.remarks && data.remarks !== 'Auto-approved (Superadmin)' ? `
        <div class="remarks-box">
          <strong>💬 Approver's Remarks:</strong>
          <p>${data.remarks}</p>
        </div>
      ` : ''}

      <div class="divider"></div>

      <p style="text-align: center; font-weight: 500;">
        You can now view the approved cost sheet and download the PDF document.
      </p>

      <center>
        <a href="${data.viewUrl}" class="button">
          📄 View Approved Cost Sheet
        </a>
      </center>

      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 20px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${data.viewUrl}" style="color: #10b981; word-break: break-all;">${data.viewUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p class="company">© ${new Date().getFullYear()} AutoRiders Fleet Management</p>
      <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
      <p>Please do not reply to this email. For support, contact your system administrator.</p>
    </div>
  </div>
</body>
</html>
  `
}