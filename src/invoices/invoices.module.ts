import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from '@pdf-me/shared';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity])],
  providers: [InvoicesService],
  controllers: [InvoicesController],
})
export class InvoicesModule {}
