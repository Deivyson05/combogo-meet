"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("../src/app.module");
let cachedExpressApp = null;
async function bootstrapServer() {
    if (cachedExpressApp)
        return cachedExpressApp;
    const expressApp = (0, express_1.default)();
    const nestApp = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp), { cors: true, logger: ["error", "warn"] });
    await nestApp.init();
    cachedExpressApp = expressApp;
    return expressApp;
}
async function handler(req, res) {
    const server = await bootstrapServer();
    server(req, res);
}
//# sourceMappingURL=index.js.map