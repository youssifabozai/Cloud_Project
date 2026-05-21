import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AwsService } from './AWS/aws.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly awsService: AwsService,
  ) { }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('aws-test')
  async testAwsConnection() {
    return this.awsService.testConnection();
  }
}
