// src/services/email/index.ts
export {
  sendCostSheetSubmittedEmail,
  sendCostSheetApprovedEmail,
  sendCostSheetRejectedEmail,
} from './service';

export type { EmailResponse } from './types';