import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './config/env';
import errorMiddleware from './middleware/error.middleware';
import v1Router from './routes';

const app = express();

// Apply security and parser middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configure Swagger JSDoc options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Delivery Buddy API',
      version: '1.0.0',
      description: 'REST API powering the Delivery Buddy courier mobile and web dashboard.',
      contact: {
        name: 'Backend API Internship Support',
      },
    },
    servers: [
      {
        url: '/v1',
        description: 'Current Host (Dynamic)',
      },
      {
        url: `http://localhost:${ENV.PORT}/v1`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Parse JSDoc comments from routes and modules
  apis: ['./src/routes/*.ts', './src/modules/**/*.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Serve Swagger docs on /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Redirect /api-docs to /docs for developer convenience
app.use('/api-docs', (req, res) => {
  res.redirect('/docs');
});

// Root API Welcome endpoint (Redirects to interactive Swagger documentation)
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Bind route version namespaces
app.use('/v1', v1Router);

// Register global error middleware
app.use(errorMiddleware);

export default app;
export { app };
