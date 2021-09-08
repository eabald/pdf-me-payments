import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvoiceEntity, CreateInvoiceDto } from '@pdf-me/shared';
import { Repository, IsNull } from 'typeorm';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private invoicesRepository: Repository<InvoiceEntity>,
  ) {}

  // create invoice
  async createInvoice({ productId, userId, paymentId }: CreateInvoiceDto) {
    const inMonthId = (await this.getNoInMonth()) + 1;
    const newInvoice = await this.invoicesRepository.create({
      inMonthId,
      invoiceDate: new Date(),
      productId,
      userId,
      paymentId,
    });
    await this.invoicesRepository.save(newInvoice);
    return newInvoice;
  }

  // get invoices by user
  async getInvoicesByUser(userId: number) {
    return await this.invoicesRepository.find(
      { userId },
      { relations: ['payment', 'product'] },
    );
  }

  // get not generated
  async getInvoicesToGenerate() {
    return await this.invoicesRepository.find(
      { filename: IsNull() },
      { relations: ['payment', 'product', 'user'] },
    );
  }

  // get not send
  async getInvoicesToSend() {
    return await this.invoicesRepository.find(
      { isSend: false },
      { relations: ['user'] },
    );
  }

  // set generated

  // set send

  async getNoInMonth() {
    const date = new Date();
    const currentMonth = date.getMonth() + 1;
    return await this.invoiceRepository.query(
      'SELECT MAX(in_month_id) FROM public.invoice WHERE EXTRACT(MONTH FROM invoice_date) = ? ',
      [currentMonth],
    );
  }
}
