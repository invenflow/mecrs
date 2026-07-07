import { z } from 'zod';

export const TenderDocumentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.string().optional(),
});

export const NormalizedTenderSchema = z.object({
  externalId: z.string().min(1),
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  publisher: z.string().optional(),
  tenderType: z.string().optional(),
  status: z.string().optional(),
  category: z.array(z.string()).optional(),
  publicationDate: z.string().datetime().optional(),
  submissionDeadline: z.string().datetime().optional(),
  openingDate: z.string().datetime().optional(),
  estimatedValue: z.number().optional(),
  currency: z.string().optional().default('ILS'),
  location: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  documents: z.array(TenderDocumentSchema).optional().default([]),
  rawData: z.unknown().optional(),
  contentHash: z.string().optional(),
});

export type NormalizedTender = z.infer<typeof NormalizedTenderSchema>;

