import { Routes } from '@angular/router';
import { Settings } from './settings/settings';
import { PortfolioDashboardComponent } from './portfolio-dashboard/portfolio-dashboard.component';
import { OpenPositionsComponent } from './open-positions/open-positions.component';

export const routes: Routes = [
    { path: '', redirectTo: '/portfolio', pathMatch: 'full' },
    { path: 'portfolio', component: PortfolioDashboardComponent },
    { path: 'open-positions', component: OpenPositionsComponent },
    { path: 'settings', component: Settings },
    { path: 'register', loadComponent: () => import('./register/register').then((m) => m.Register) },
    { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
    { path: 'logout', loadComponent: () => import('./logout/logout').then((m) => m.Logout) },
    { path: 'transaction-history', loadComponent: () => import('./transaction-history/transaction-history').then((m) => m.TransactionHistoryComponent) },
    { path: 'admin-dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent) }
];