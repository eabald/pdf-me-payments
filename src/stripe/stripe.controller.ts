import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateStripeCustomerDto,
  AddCreditCardDto,
} from '@eabald/pdf-me-shared';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @MessagePattern({ cmd: 'payments-create-customer' })
  async createCustomer(@Payload() payload: CreateStripeCustomerDto) {
    return this.stripeService.createStripeCustomer(payload);
  }

  @MessagePattern({ cmd: 'payments-add-credit-card' })
  async addCreditCard(@Payload() payload: AddCreditCardDto) {
    return this.stripeService.attachCreditCard(payload);
  }

  @MessagePattern({ cmd: 'payments-list-credit-cards' })
  async listCreditCard(@Payload() payload: string) {
    return this.stripeService.listCreditCards(payload);
  }

  @MessagePattern({ cmd: 'payments-set-default-credit-card' })
  async setDefaultCreditCard(@Payload() payload: AddCreditCardDto) {
    return await this.stripeService.setDefaultCreditCard(payload);
  }
}
