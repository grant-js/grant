import http from 'http';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { APOLLO_CONFIG, CORS_CONFIG, HELMET_CONFIG, SERVER_CONFIG } from '@/config';
import { schema } from '@/graphql/resolvers';
import { GraphqlContext } from '@/graphql/types';
import { createScopeCache } from '@/lib/scope-cache.lib';
import { authMiddleware } from '@/middleware/auth.middleware';
import { contextMiddleware } from '@/middleware/context.middleware';
import { createRestRouter } from '@/rest';
import { generateOpenApiDocument } from '@/rest/openapi';
import { ContextRequest } from '@/types';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<GraphqlContext>({
    schema,
    introspection: APOLLO_CONFIG.introspection,
    csrfPrevention: APOLLO_CONFIG.csrfPrevention,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ApolloServerPluginInlineTrace(),
    ],
  });

  await server.start();

  // Centralized scope cache - shared between GraphQL and REST APIs
  const scopeCache = createScopeCache();

  // Apply CORS and security middleware
  app.use(cors<cors.CorsRequest>(CORS_CONFIG));
  app.use(helmet(HELMET_CONFIG));
  app.use(express.json());

  // Generate OpenAPI documentation
  const openApiDocument = generateOpenApiDocument();

  // Swagger UI endpoint - serve API documentation
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Grant Platform API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  // OpenAPI JSON endpoint - serve raw spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiDocument);
  });

  // REST API routes
  app.use('/api', authMiddleware, contextMiddleware(scopeCache), (req, res, next) => {
    const contextReq = req as ContextRequest;
    const restRouter = createRestRouter(contextReq.context);
    restRouter(req, res, next);
  });

  // GraphQL endpoint
  app.use(
    '/graphql',
    authMiddleware,
    contextMiddleware(scopeCache),
    expressMiddleware(server, {
      context: async ({ req }: { req: express.Request }) => {
        const contextReq = req as ContextRequest;
        return contextReq.context;
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await new Promise<void>((resolve) => httpServer.listen({ port: SERVER_CONFIG.port }, resolve));

  console.log(`🚀 Apollo Server ready at http://localhost:${SERVER_CONFIG.port}/graphql`);
  console.log(`🌐 REST API ready at http://localhost:${SERVER_CONFIG.port}/api`);
  console.log(`📚 API Documentation at http://localhost:${SERVER_CONFIG.port}/api-docs`);
  console.log(`📄 OpenAPI Spec at http://localhost:${SERVER_CONFIG.port}/api-docs.json`);
  console.log(`📊 Health check available at http://localhost:${SERVER_CONFIG.port}/health`);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
