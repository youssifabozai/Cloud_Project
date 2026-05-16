import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { AwsModule } from '../AWS/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
