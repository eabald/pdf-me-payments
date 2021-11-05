import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeEventEntity } from '@eabald/pdf-me-shared';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StripeEventEntity])],
  providers: [StripeService],
  exports: [StripeService],
  controllers: [StripeController],
})
export class StripeModule {}
