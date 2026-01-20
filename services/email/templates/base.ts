// // services/email/templates/base.ts
// export function baseEmailTemplate(content: string): string {
//   return `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>AutoRiders Notification</title>
//   <style>
//     body {
//       margin: 0;
//       padding: 0;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
//       background-color: #f5f5f5;
//       color: #333;
//     }
//     .email-container {
//       max-width: 600px;
//       margin: 0 auto;
//       background-color: #ffffff;
//     }
//     .email-header {
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       padding: 30px 20px;
//       text-align: center;
//     }
//     .email-header h1 {
//       margin: 0;
//       color: #ffffff;
//       font-size: 24px;
//       font-weight: 600;
//     }
//     .email-body {
//       padding: 40px 30px;
//     }
//     .email-footer {
//       background-color: #f8f9fa;
//       padding: 20px 30px;
//       text-align: center;
//       font-size: 12px;
//       color: #6c757d;
//       border-top: 1px solid #e9ecef;
//     }
//     .button {
//       display: inline-block;
//       padding: 12px 30px;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       color: #ffffff !important;
//       text-decoration: none;
//       border-radius: 6px;
//       font-weight: 600;
//       margin: 20px 0;
//     }
//     .button:hover {
//       opacity: 0.9;
//     }
//     .info-box {
//       background-color: #f8f9fa;
//       border-left: 4px solid #667eea;
//       padding: 15px;
//       margin: 20px 0;
//       border-radius: 4px;
//     }
//     .info-box strong {
//       color: #495057;
//     }
//     p {
//       line-height: 1.6;
//       margin: 15px 0;
//       color: #495057;
//     }
//     h2 {
//       color: #212529;
//       font-size: 20px;
//       margin-top: 0;
//     }
//   </style>
// </head>
// <body>
//   <div class="email-container">
//     <div class="email-header">
//       <h1>🚗 AutoRiders Cost Sheet System</h1>
//     </div>
//     <div class="email-body">
//       ${content}
//     </div>
//     <div class="email-footer">
//       <p style="margin: 5px 0;">
//         This is an automated notification from AutoRiders Cost Sheet Management System.
//       </p>
//       <p style="margin: 5px 0;">
//         © ${new Date().getFullYear()} AutoRiders. All rights reserved.
//       </p>
//     </div>
//   </div>
// </body>
// </html>
//   `.trim();
// }