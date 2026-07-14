import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // Atualiza o request com os dados validados/sanitizados (strip, coerce)
    req.body = validatedData.body;
    req.query = validatedData.query;
    req.params = validatedData.params;
    
    next();
  } catch (error) {
    if (error.name === 'ZodError' || error.issues || error.errors) {
      const issues = error.errors || error.issues || [];
      const messages = issues.map ? issues.map(err => `${err.path.join('.')}: ${err.message}`) : [error.message];
      return res.status(400).json({ error: 'Erro de validação', details: messages });
    }
    next(error);
  }
};
