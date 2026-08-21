import type { AuthorizedRequest } from '@grantjs/server/nest';
import { Grant, GrantGuard } from '@grantjs/server/nest';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Grant('document', 'query')
  @UseGuards(GrantGuard)
  list() {
    return { data: this.documentsService.findAll() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Grant('document', 'create')
  @UseGuards(GrantGuard)
  create(@Body() body: { title?: string }) {
    const title = body?.title ?? 'Untitled';
    const doc = this.documentsService.create(title);
    return { data: doc };
  }

  @Put(':id')
  @Grant('document', 'update')
  @UseGuards(GrantGuard)
  put(@Param('id') id: string, @Body() body: { title?: string }, @Req() _req: AuthorizedRequest) {
    const doc = this.documentsService.findOne(id);
    if (!doc) throw new NotFoundException('Not found');
    const title = body?.title ?? doc.title;
    const updated = this.documentsService.update(id, title);
    return { data: updated };
  }

  @Patch(':id')
  @Grant('document', 'update')
  @UseGuards(GrantGuard)
  patch(@Param('id') id: string, @Body() body: { title?: string }, @Req() _req: AuthorizedRequest) {
    const doc = this.documentsService.findOne(id);
    if (!doc) throw new NotFoundException('Not found');
    const updated = this.documentsService.patch(id, { title: body?.title });
    return { data: updated };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Grant('document', 'delete')
  @UseGuards(GrantGuard)
  delete(@Param('id') id: string) {
    const existed = this.documentsService.remove(id);
    if (!existed) throw new NotFoundException('Not found');
  }
}
