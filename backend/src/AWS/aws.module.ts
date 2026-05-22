import { Global, Module } from '@nestjs/common';
import { AwsController } from './aws.controller';
import { AwsService } from './aws.service';
import { SnsService } from './sns.service';

@Global()
@Module({
  controllers: [AwsController],
  providers: [AwsService, SnsService],
  exports: [AwsService, SnsService],
})
export class AwsModule {}
