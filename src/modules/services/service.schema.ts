import { z } from 'zod';

export const serviceItemSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater').default(0),
  isActive: z.boolean().optional().default(true),
});

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
