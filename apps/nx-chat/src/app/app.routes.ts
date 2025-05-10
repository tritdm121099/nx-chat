import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { CHAT_ROUTES } from './chat/chat.routes';

export const appRoutes: Routes = [
    {
        path: 'auth', // Group auth routes under /auth
        canActivate: [publicGuard], // Prevent access if already logged in
        loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES),
        // Redirect specific paths if needed, otherwise handled within auth.routes
        // { path: 'login', redirectTo: '/auth/login', pathMatch: 'full' },
        // { path: 'register', redirectTo: '/auth/register', pathMatch: 'full' },
    },
    {
        // Giữ lại các route gốc để tương thích hoặc redirect
        path: 'login',
        redirectTo: '/auth/login',
        pathMatch: 'full'
    },
    {
        path: 'register',
        redirectTo: '/auth/register',
        pathMatch: 'full'
    },
    {
        path: 'chat',
        canActivate: [authGuard], // Protect this route
        // loadChildren: () => import('./chat/chat.routes').then(m => m.CHAT_ROUTES),
        children: CHAT_ROUTES
    },
    // Redirect root path
    {
        path: '',
        pathMatch: 'full',
        // Redirect to login if not logged in, or chat if logged in
        // AuthGuard handles the logic, so redirecting to chat is usually fine
        redirectTo: 'chat',
    },
    // Wildcard route for 404
    {
        path: '**',
        redirectTo: 'chat', // Or a dedicated 404 component
    },
];