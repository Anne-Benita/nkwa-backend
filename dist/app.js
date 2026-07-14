"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const env_1 = require("./config/env");
const error_middleware_1 = __importDefault(require("./middleware/error.middleware"));
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
exports.app = app;
// Apply security and parser middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
                url: `http://localhost:${env_1.ENV.PORT}/v1`,
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
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Serve Swagger docs on /docs
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Redirect /api-docs to /docs for developer convenience
app.use('/api-docs', (req, res) => {
    res.redirect('/docs');
});
// Root API Welcome endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Delivery Buddy API!',
        docs: `http://localhost:${env_1.ENV.PORT}/docs`,
    });
});
// Bind route version namespaces
app.use('/v1', routes_1.default);
// Register global error middleware
app.use(error_middleware_1.default);
exports.default = app;
