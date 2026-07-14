import { z } from 'zod';

const deleteTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do inquilino inválido.')
  }),
  query: z.any().optional(), body: z.any().optional()
});

try {
  const result = deleteTenantSchema.parse({
    params: { id: '11111111-1111-1111-1111-111111111111' },
    query: {},
    body: undefined
  });
  console.log("Success:", result);
} catch(e) {
  console.log("Error object:", e);
}
