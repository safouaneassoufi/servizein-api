import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { StorageService } from '../../services/storage/storage.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private storage: StorageService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() dto: UploadUrlDto) {
    if (!this.storage.validateMime(dto.folder, dto.contentType)) {
      throw new BadRequestException('Invalid folder or content type');
    }
    return this.storage.getUploadUrl(dto.folder, dto.filename, dto.contentType);
  }
}
