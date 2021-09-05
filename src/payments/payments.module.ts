import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity, ProductEntity } from '@pdf-me/shared';
import { StripeModule } from '../stripe/stripe.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    TypeOrmModule.forFeature([ProductEntity]),
    StripeModule,
    ConfigModule,
  ],
  providers: [
    PaymentsService,
    {
      provide: 'LIMITS_SERVICE',
      useFactory: (configService: ConfigService) => {
        const user = configService.get('RABBITMQ_USER');
        const password = configService.get('RABBITMQ_PASSWORD');
        const host = configService.get('RABBITMQ_HOST');

        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [`amqp://${user}:${password}@${host}`],
            queue: 'limitsQueue',
            queueOptions: {
              durable: true,
            },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
