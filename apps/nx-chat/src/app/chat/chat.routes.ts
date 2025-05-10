import { Routes } from '@angular/router';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    component: ChatLayoutComponent,
    title: 'Chat'
  }
];