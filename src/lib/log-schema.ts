
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

const dateOrTimestamp = z.union([z.instanceof(Timestamp), z.date()]);

export const MessageLogStatus = z.enum(['success', 'failure']);
export type MessageLogStatus = z.infer<typeof MessageLogStatus>;

export const MessageLogSchema = z.object({
  id: z.string(),
  qyvooUserId: z.string(),
  recipientNumber: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  messageContent: z.string(),
  sentAt: dateOrTimestamp,
  status: MessageLogStatus,
  errorMessage: z.string().optional(),
});

export type MessageLog = z.infer<typeof MessageLogSchema>;
