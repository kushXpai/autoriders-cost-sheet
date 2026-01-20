// // services/email/templates/costSheetSubmitted.ts
// import { baseEmailTemplate } from './base';
// import type { CostSheetSubmittedEmailData } from '../types';

// export function generateCostSheetSubmittedEmail(
//   data: CostSheetSubmittedEmailData
// ): { html: string; text: string; subject: string } {
//   const formattedDate = new Date(data.submittedAt).toLocaleString('en-IN', {
//     dateStyle: 'long',
//     timeStyle: 'short',
//     timeZone: 'Asia/Kolkata',
//   });

//   const htmlContent = `
//     <h2>New Cost Sheet Awaiting Approval</h2>
    
//     <p>Hello,</p>
    
//     <p>A new cost sheet has been submitted and is awaiting your approval.</p>
    
//     <div class="info-box">
//       <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
//       <p style="margin: 8px 0;"><strong>Submitted By:</strong> ${data.submitterName}</p>
//       <p style="margin: 8px 0;"><strong>Submitted On:</strong> ${formattedDate}</p>
//       <p style="margin: 8px 0;"><strong>Cost Sheet ID:</strong> ${data.costSheetId.slice(0, 8)}...</p>
//     </div>
    
//     <p>Please review and approve or provide feedback on this submission.</p>
    
//     <center>
//       <a href="${data.viewUrl}" class="button">Review Cost Sheet</a>
//     </center>
    
//     <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
//       If the button doesn't work, copy and paste this link into your browser:<br>
//       <a href="${data.viewUrl}" style="color: #667eea;">${data.viewUrl}</a>
//     </p>
//   `;

//   const html = baseEmailTemplate(htmlContent);

//   const text = `
// New Cost Sheet Awaiting Approval

// A new cost sheet has been submitted and is awaiting your approval.

// Company: ${data.companyName}
// Submitted By: ${data.submitterName}
// Submitted On: ${formattedDate}
// Cost Sheet ID: ${data.costSheetId}

// Review the cost sheet here: ${data.viewUrl}

// ---
// This is an automated notification from AutoRiders Cost Sheet Management System.
//   `.trim();

//   const subject = `New Cost Sheet Submitted - ${data.companyName}`;

//   return { html, text, subject };
// }