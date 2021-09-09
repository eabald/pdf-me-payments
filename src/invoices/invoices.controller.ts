import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @MessagePattern({ cmd: 'payments-invoice-by-user' })
  async getInvoicesByUser(@Payload() payload: number) {
    return await this.invoicesService.getInvoicesByUser(payload);
  }

  @MessagePattern({ cmd: 'payments-get-invoices-to-generate' })
  async getInvoicesToGenerate() {
    return await this.invoicesService.getInvoicesToGenerate();
  }

  @MessagePattern({ cmd: 'payments-get-invoices-to-send' })
  async getInvoicesToSend() {
    return await this.invoicesService.getInvoicesToSend();
  }

  @MessagePattern({ cmd: 'payments-set-generated-invoices' })
  async setGenerated(@Payload() payload: { [key: number]: string }) {
    return await this.invoicesService.setGenerated(payload);
  }

  @MessagePattern({ cmd: 'payments-set-send-invoices' })
  async setSend(@Payload() payload: number[]) {
    return await this.invoicesService.setSend(payload);
  }
}
