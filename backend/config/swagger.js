import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OperaBeauty API',
      version: '1.0.0',
      description: 'Documentação da API do OperaBeauty (SaaS para Salões de Beleza)',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.operabeauty.com.br',
        description: 'Servidor de Produção',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'], // Caminho para os arquivos onde estão as anotações
};

export const swaggerSpec = swaggerJsdoc(options);
