import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateStripeCustomerDto } from '@pdf-me/shared';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @MessagePattern({ cmd: 'payments-create-customer' })
  async createCustomer(@Payload() payload: CreateStripeCustomerDto) {
    return this.stripeService.createStripeCustomer(payload);
  }
}
