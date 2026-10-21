import { Routes } from '@angular/router';
import { Settings } from './settings/settings';
import { PortfolioDashboardComponent } from './portfolio-dashboard/portfolio-dashboard.component';
import { OpenPositionsComponent } from './open-positions/open-positions.component';
import { StockTickerComponent } from './stock-ticker/stock-ticker.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'portfolio', component: PortfolioDashboardComponent, canActivate: [authGuard] },
    { path: 'stock-ticker', component: StockTickerComponent, canActivate: [authGuard] },
    { path: 'open-positions', component: OpenPositionsComponent, canActivate: [authGuard] },
    { path: 'settings', component: Settings, canActivate: [authGuard] },
    { path: 'register', loadComponent: () => import('./register/register').then((m) => m.Register) },
    { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
    { path: 'logout', loadComponent: () => import('./logout/logout').then((m) => m.Logout) },
    { path: 'transaction-history', loadComponent: () => import('./transaction-history/transaction-history').then((m) => m.TransactionHistoryComponent), canActivate: [authGuard] },
    { path: 'admin-dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent), canActivate: [authGuard] },
    { path: 'compliance-records', loadComponent: () => import('./compliance-records/compliance-records').then((m) => m.ComplianceRecordsComponent), canActivate: [authGuard] }
];