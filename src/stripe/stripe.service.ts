import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreateStripeCustomerDto,
  CreateChargeDto,
  StripeEventEntity,
} from '@pdf-me/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(StripeEventEntity)
    private stripeEventsRepository: Repository<StripeEventEntity>,
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2020-08-27',
    });
  }

  async createStripeCustomer({ name, email }: CreateStripeCustomerDto) {
    return this.stripe.customers.create({ name, email });
  }

  async charge({
    amount,
    paymentMethodId,
    customerId,
    currency,
  }: CreateChargeDto) {
    return this.stripe.paymentIntents.create({
      amount,
      customer: customerId,
      payment_method: paymentMethodId,
      currency,
    });
  }

  async constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  async saveEvent(eventId: string) {
    const newEvent = await this.stripeEventsRepository.create({ eventId });
    await this.stripeEventsRepository.save(newEvent);
    return newEvent;
  }

  async checkEvent(eventId: string) {
    const event = await this.stripeEventsRepository.findOne({ eventId });
    return !!event;
  }
}
