import { Response } from 'express';
import { z } from 'zod';
import AiService from '../services/aiService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';

const generateEmailSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  company: z.string().optional(),
  dealValue: z.number().optional(),
  emailType: z.enum(['Cold Outreach', 'Follow-up', 'Proposal Intro', 'Objection Handler']),
  customPrompt: z.string().optional(),
});

const summarizeNotesSchema = z.object({
  notes: z.string().min(5, 'Notes must be at least 5 characters long'),
});

const copilotChatSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

export const generateEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = generateEmailSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const emailContent = await AiService.generateSalesEmail(validation.data as any);

    if (req.user) {
      await LoggerService.log(req.user.id, 'AI_EMAIL_GENERATE', { recipient: validation.data.recipientName, type: validation.data.emailType });
    }

    res.status(200).json({ result: emailContent });
  } catch (error: any) {
    res.status(500).json({ message: 'AI generation failed', error: error.message });
  }
};

export const summarizeNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = summarizeNotesSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const summary = await AiService.summarizeNotes(validation.data.notes);

    if (req.user) {
      await LoggerService.log(req.user.id, 'AI_NOTE_SUMMARIZE', {});
    }

    res.status(200).json({ result: summary });
  } catch (error: any) {
    res.status(500).json({ message: 'AI summarization failed', error: error.message });
  }
};

export const copilotChat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const validation = copilotChatSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const history = (validation.data.history ?? [])
      .filter((m): m is { role: string; content: string } =>
        typeof m.role === 'string' && typeof m.content === 'string'
      );
    const reply = await AiService.chatCopilot(validation.data.prompt, history);

    res.status(200).json({ reply });
  } catch (error: any) {
    res.status(500).json({ message: 'AI Copilot failed', error: error.message });
  }
};
