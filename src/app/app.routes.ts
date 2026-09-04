import { Routes } from '@angular/router';
import { Settings } from './settings/settings';
import { DashboardComponent } from './client-dashboard/pages/dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', redirectTo: '/settings', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'settings', component: Settings },
    { path: 'register', loadComponent: () => import('./register/register').then((m) => m.Register) },
    { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
    { path: 'logout', loadComponent: () => import('./logout/logout').then((m) => m.Logout) },
    { path: 'transaction-history', loadComponent: () => import('./transaction-history/transaction-history').then((m) => m.TransactionHistoryComponent) },
    { path: 'admin-dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent) }
];