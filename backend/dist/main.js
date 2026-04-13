"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    app.enableCors({
        origin: [frontendUrl],
        credentials: true,
    });
    const port = Number(process.env.APP_PORT ?? process.env.PORT ?? 3001);
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map