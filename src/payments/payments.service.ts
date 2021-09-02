import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from '@pdf-me/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentEntity } from '@pdf-me/shared';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private paymentsRepository: Repository<PaymentEntity>,
    private readonly stripeService: StripeService,
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

  async updateStatus() {
    return console.log('update status');
  }
}
