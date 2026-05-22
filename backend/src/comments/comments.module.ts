import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { AuditLogsModule } from '../audit-Logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
