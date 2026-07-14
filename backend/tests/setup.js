import dotenv from 'dotenv';
import { jest } from '@jest/globals';
dotenv.config({ path: '.env.test' });

// Desabilita o log do Pino nos testes para limpar o console
// jest.unstable_mockModule('pino-http', () => {
//   return {
//     default: () => (req, res, next) => {
//       req.log = {
//         info: jest.fn(),
//         error: console.error, // Usar console.error para vermos o erro
//         warn: jest.fn(),
//         debug: jest.fn()
//       };
//       next();
//     }
//   };
// });
