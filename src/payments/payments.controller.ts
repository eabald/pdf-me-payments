import { Controller } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePaymentDto, StripeWebhookDataDto } from '@pdf-me/shared';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern({ cmd: 'payments-create-payment' })
  async createPayment(@Payload() payload: CreatePaymentDto) {
    return this.paymentsService.createPayment(payload);
  }

  @MessagePattern({ cmd: 'payments-update-status' })
  async updateStatus(@Payload() payload: StripeWebhookDataDto) {
    return this.paymentsService.updateStatus(payload);
  }
}
