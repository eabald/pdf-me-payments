import { Injectable, Inject, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaymentEntity,
  StripeWebhookDataDto,
  CreateSubscriptionDto,
  ProductEntity,
  CreatePaymentDto,
} from '@pdf-me/shared';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(ProductEntity)
    private productRepository: Repository<ProductEntity>,
    private readonly stripeService: StripeService,
    @Inject('LIMITS_SERVICE') private limitsService: ClientProxy,
  ) {}

  async createPayment(data: CreatePaymentDto) {
    const charge = await this.stripeService.charge(data);

    const newPayment = await this.paymentsRepository.create({
      ...data,
      confirmed: false,
      transactionId: charge.id,
    });

    await this.paymentsRepository.save(newPayment);
    return newPayment;
  }

  async updateStatus({ signature, payload }: StripeWebhookDataDto) {
    if (!signature) {
      return false;
    }
    const event = await this.stripeService.constructEventFromPayload(
      signature,
      payload,
    );
    const eventInDb = await this.stripeService.checkEvent(event.id);
    if (eventInDb) {
      return;
    } else {
      await this.stripeService.saveEvent(event.id);
    }
    if (event.type === 'payment_intent.succeeded') {
      return await this.processCharge(event);
    }
    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.created'
    ) {
      return await this.processSubscription(event);
    }
  }

  async processSubscription(event: Stripe.Event) {
    const paymentData = event.data.object as Stripe.Subscription;
    const subscriptionStatus = paymentData.status;
    const currentPayment = await this.paymentsRepository.findOne({
      where: { transactionId: paymentData.id },
      relations: ['product'],
    });
    if (subscriptionStatus === 'active') {
      const date = new Date();
      await this.limitsService
        .send(
          { cmd: 'limits-set-subscription' },
          {
            userId: currentPayment.userId,
            limit: currentPayment.product.size,
            perHourLimit: currentPayment.product.size,
            extraValidTo: currentPayment.product.validFor
              ? date.setDate(date.getDate() + currentPayment.product.validFor)
              : null,
          },
        )
        .toPromise();
      const payment = await this.paymentsRepository.update(currentPayment.id, {
        confirmed: true,
        fulfilledAt: Date.now(),
      });
      return payment;
    } else {
      await this.limitsService
        .send({ cmd: 'limits-reset-subscription-by-id' }, currentPayment.userId)
        .toPromise();
      return false;
    }
  }

  async processCharge(event: Stripe.Event) {
    const paymentData: any = event.data.object;
    const currentPayment = await this.paymentsRepository.findOne({
      where: { transactionId: paymentData.id },
      relations: ['product'],
    });
    const date = new Date();
    await this.limitsService
      .send(
        { cmd: 'limits-set-additional' },
        {
          userId: currentPayment.userId,
          limit: currentPayment.product.size,
          extraValidTo: currentPayment.product.validFor
            ? date.setDate(date.getDate() + currentPayment.product.validFor)
            : null,
        },
      )
      .toPromise();
    const payment = await this.paymentsRepository.update(currentPayment.id, {
      confirmed: true,
      fulfilledAt: Date.now(),
    });
    return payment;
  }

  async createMonthlySubscription(subscriptionData: CreateSubscriptionDto) {
    const { priceId, customerId, userId } = subscriptionData;
    const subscriptions = await this.stripeService.listSubscriptions(
      priceId,
      customerId,
    );
    if (subscriptions.data.length) {
      throw new RpcException({
        message: 'Customer already subscribed',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const product = await this.productRepository.findOne({
      stripeProductId: priceId,
    });
    if (!product) {
      throw new RpcException({
        message: 'Missing product',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const subscription = await this.stripeService.createSubscription(
      priceId,
      customerId,
    );
    const payment = await this.paymentsRepository.create({
      productId: product.id,
      userId,
      amount: product.amount,
      transactionId: subscription.id,
    });

    await this.paymentsRepository.save(payment);

    return payment;
  }
}
