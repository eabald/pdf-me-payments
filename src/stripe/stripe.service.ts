import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreateStripeCustomerDto,
  CreateChargeDto,
  StripeEventEntity,
  AddCreditCardDto,
  StripeError,
  // CreateSubscriptionDto,
} from '@eabald/pdf-me-shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';

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
      off_session: true,
      confirm: true,
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

  async attachCreditCard({ paymentMethodId, customerId }: AddCreditCardDto) {
    return await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
    });
  }

  async listCreditCards(customerId: string) {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  async setDefaultCreditCard({
    paymentMethodId,
    customerId,
  }: AddCreditCardDto) {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      if (error?.type === StripeError.InvalidRequest) {
        throw new RpcException({
          message: 'Wrong credit card chosen',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      throw new RpcException({
        message: 'Something went wrong.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async createSubscription(priceId: string, customerId: string) {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: priceId,
          },
        ],
      });
    } catch (error) {
      if (error?.code === StripeError.ResourceMissing) {
        throw new RpcException({
          message: 'Credit card not set up',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      throw new RpcException({
        message: 'Something went wrong.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async listSubscriptions(priceId: string, customerId: string) {
    return this.stripe.subscriptions.list({
      customer: customerId,
      price: priceId,
    });
  }
}
