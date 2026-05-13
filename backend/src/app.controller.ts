import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AwsService } from './AWS/aws.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly awsService: AwsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('aws-test')
  async testAwsConnection() {
    return this.awsService.testConnection();
  }
}
