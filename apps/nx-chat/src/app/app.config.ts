import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { initializeApp } from './app-initialize';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptor/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor]),
    ),
    provideAppInitializer(initializeApp),
  ],
};
