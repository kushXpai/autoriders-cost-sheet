// supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'submission' | 'approval'
  costSheetId: string
  approverRole?: 'ADMIN' | 'SUPER_ADMIN'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, costSheetId, approverRole } = await req.json() as EmailRequest

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch email settings
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      throw new Error('Email settings not found')
    }

    if (!settings.notifications_enabled) {
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
        approved_by_user:users!cost_sheets_approved_by_fkey(id, full_name, email, role)
      `)
      .eq('id', costSheetId)
      .single()

    if (costSheetError || !costSheet) {
      throw new Error('Cost sheet not found')
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    const viewUrl = `${appUrl}/cost-sheets/${costSheetId}`

    if (type === 'submission') {
      // Submission email
      const recipients = [
        settings.super_admin_email,
        ...settings.admin_emails,
      ].filter(Boolean)

      const uniqueRecipients = [...new Set(recipients)]

      const formattedDate = new Date(costSheet.submitted_at || costSheet.created_at)
        .toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })

      const html = generateSubmissionEmail({
        companyName: costSheet.company_name,
        submitterName: costSheet.created_by_user.full_name,
        submittedAt: formattedDate,
        costSheetId,
        viewUrl,
      })

      const { data, error } = await resend.emails.send({
        from: Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev',
        to: uniqueRecipients,
        subject: `New Cost Sheet Submitted - ${costSheet.company_name}`,
        html,
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, messageId: data?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (type === 'approval') {
      // Approval email
      let ccEmails: string[] = []

      if (approverRole === 'ADMIN') {
        ccEmails = [settings.super_admin_email]
      } else if (approverRole === 'SUPER_ADMIN') {
        ccEmails = settings.admin_emails
      }

      ccEmails = [...new Set(ccEmails)].filter(
        (email) => email !== costSheet.created_by_user.email
      )

      const formattedDate = new Date(costSheet.approved_at || new Date())
        .toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })

      const html = generateApprovalEmail({
        companyName: costSheet.company_name,
        approverName: costSheet.approved_by_user.full_name,
        approverRole: costSheet.approved_by_user.role,
        approvedAt: formattedDate,
        remarks: costSheet.approval_remarks,
        viewUrl,
        creatorName: costSheet.created_by_user.full_name,
      })

      const emailPayload: any = {
        from: Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev',
        to: costSheet.created_by_user.email,
        subject: `Cost Sheet Approved - ${costSheet.company_name}`,
        html,
      }

      if (ccEmails.length > 0) {
        emailPayload.cc = ccEmails
      }

      const { data, error } = await resend.emails.send(emailPayload)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, messageId: data?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid email type')

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

// Email templates
function generateSubmissionEmail(data: any) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; }
    .body { padding: 40px 30px; }
    .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 AutoRiders Cost Sheet System</h1>
    </div>
    <div class="body">
      <h2>New Cost Sheet Awaiting Approval</h2>
      <p>Hello,</p>
      <p>A new cost sheet has been submitted and is awaiting your approval.</p>
      <div class="info-box">
        <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
        <p style="margin: 8px 0;"><strong>Submitted By:</strong> ${data.submitterName}</p>
        <p style="margin: 8px 0;"><strong>Submitted On:</strong> ${data.submittedAt}</p>
        <p style="margin: 8px 0;"><strong>Cost Sheet ID:</strong> ${data.costSheetId.slice(0, 8)}...</p>
      </div>
      <p>Please review and approve or provide feedback on this submission.</p>
      <center>
        <a href="${data.viewUrl}" class="button">Review Cost Sheet</a>
      </center>
    </div>
    <div class="footer">
      <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
      <p>© ${new Date().getFullYear()} AutoRiders. All rights reserved.</p>
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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; }
    .body { padding: 40px 30px; }
    .info-box { background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 AutoRiders Cost Sheet System</h1>
    </div>
    <div class="body">
      <h2>✅ Cost Sheet Approved</h2>
      <p>Hello ${data.creatorName},</p>
      <p>Great news! Your cost sheet has been approved.</p>
      <div class="info-box">
        <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
        <p style="margin: 8px 0;"><strong>Approved By:</strong> ${data.approverName} (${roleDisplay})</p>
        <p style="margin: 8px 0;"><strong>Approved On:</strong> ${data.approvedAt}</p>
        ${data.remarks ? `<p style="margin: 8px 0;"><strong>Remarks:</strong> ${data.remarks}</p>` : ''}
      </div>
      <p>You can now view the approved cost sheet and download the PDF if needed.</p>
      <center>
        <a href="${data.viewUrl}" class="button">View Approved Cost Sheet</a>
      </center>
    </div>
    <div class="footer">
      <p>This is an automated notification from AutoRiders Cost Sheet Management System.</p>
      <p>© ${new Date().getFullYear()} AutoRiders. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}