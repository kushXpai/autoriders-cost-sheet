// // services/email/templates/costSheetApproved.ts
// import { baseEmailTemplate } from './base';
// import type { CostSheetApprovedEmailData } from '../types';

// export function generateCostSheetApprovedEmail(
//   data: CostSheetApprovedEmailData
// ): { html: string; text: string; subject: string } {
//   const formattedDate = new Date(data.approvedAt).toLocaleString('en-IN', {
//     dateStyle: 'long',
//     timeStyle: 'short',
//     timeZone: 'Asia/Kolkata',
//   });

//   const roleDisplay = data.approverRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';

//   const htmlContent = `
//     <h2>✅ Cost Sheet Approved</h2>
    
//     <p>Hello ${data.creatorName},</p>
    
//     <p>Great news! Your cost sheet has been approved.</p>
    
//     <div class="info-box">
//       <p style="margin: 8px 0;"><strong>Company:</strong> ${data.companyName}</p>
//       <p style="margin: 8px 0;"><strong>Approved By:</strong> ${data.approverName} (${roleDisplay})</p>
//       <p style="margin: 8px 0;"><strong>Approved On:</strong> ${formattedDate}</p>
//       <p style="margin: 8px 0;"><strong>Cost Sheet ID:</strong> ${data.costSheetId.slice(0, 8)}...</p>
//       ${
//         data.remarks
//           ? `<p style="margin: 8px 0;"><strong>Remarks:</strong> ${data.remarks}</p>`
//           : ''
//       }
//     </div>
    
//     <p>You can now view the approved cost sheet and download the PDF if needed.</p>
    
//     <center>
//       <a href="${data.viewUrl}" class="button">View Approved Cost Sheet</a>
//     </center>
    
//     <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
//       If the button doesn't work, copy and paste this link into your browser:<br>
//       <a href="${data.viewUrl}" style="color: #667eea;">${data.viewUrl}</a>
//     </p>
//   `;

//   const html = baseEmailTemplate(htmlContent);

//   const text = `
// Cost Sheet Approved

// Hello ${data.creatorName},

// Great news! Your cost sheet has been approved.

// Company: ${data.companyName}
// Approved By: ${data.approverName} (${roleDisplay})
// Approved On: ${formattedDate}
// Cost Sheet ID: ${data.costSheetId}
// ${data.remarks ? `Remarks: ${data.remarks}` : ''}

// View the approved cost sheet here: ${data.viewUrl}

// ---
// This is an automated notification from AutoRiders Cost Sheet Management System.
//   `.trim();

//   const subject = `Cost Sheet Approved - ${data.companyName}`;

//   return { html, text, subject };
// }