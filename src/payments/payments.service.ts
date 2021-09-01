import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from '@pdf-me/shared';

@Injectable()
export class PaymentsService {
  async createPayment(data: CreatePaymentDto) {
    return data;
  }
}
