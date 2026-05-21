import { Controller, Get } from "@nestjs/common";
import { auditLogsService } from "./audit-logs.service";

@Controller('audit-logs')
export class audit {
    constructor(private readonly auditLogsService: auditLogsService) { }


}