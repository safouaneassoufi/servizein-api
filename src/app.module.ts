import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { envValidationSchema } from './config/env.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './services/redis/redis.module';
import { OtpModule } from './services/otp/otp.module';
import { MailModule } from './services/mail/mail.module';
import { StorageModule } from './services/storage/storage.module';
import { FirebaseModule } from './services/firebase/firebase.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { RequestsModule } from './modules/requests/requests.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ProviderModule } from './modules/provider/provider.module';
import { OffersModule } from './modules/offers/offers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    OtpModule,
    MailModule,
    StorageModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    ProvidersModule,
    CatalogModule,
    AvailabilityModule,
    BookingsModule,
    MediaModule,
    NotificationsModule,
    AdminModule,
    RequestsModule,
    FavoritesModule,
    ProviderModule,
    OffersModule,
  ],
})
export class AppModule {}
