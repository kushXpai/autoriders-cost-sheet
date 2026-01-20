// // services/email/client.ts
// import { Resend } from 'resend';

// // Initialize Resend client with API key from environment
// const apiKey = import.meta.env.VITE_RESEND_API_KEY;

// if (!apiKey) {
//   console.warn(
//     'VITE_RESEND_API_KEY is not set. Email functionality will be disabled.'
//   );
// }

// // Create and export the Resend client
// export const resend = new Resend(apiKey);

// // Export configuration
// export const emailConfig = {
//   from: import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev',
//   appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
//   enabled: !!apiKey,
// };