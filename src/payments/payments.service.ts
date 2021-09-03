import { Injectable, Inject } from '@nestjs/common';
import { CreatePaymentDto } from '@pdf-me/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentEntity, StripeWebhookDataDto } from '@pdf-me/shared';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentsRepository: Repository<PaymentEntity>,
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
    // check if signature exists signature
    const event = await this.stripeService.constructEventFromPayload(
      signature,
      payload,
    );
    if (event.type === 'payment_intent.succeeded') {
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
  }
}
