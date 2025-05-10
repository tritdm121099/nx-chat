import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login' // Optional: Set page title
  },
  {
    path: 'register',
    component: RegisterComponent,
     title: 'Register'
  },
   {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];