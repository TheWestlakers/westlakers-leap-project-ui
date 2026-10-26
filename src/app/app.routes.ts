import { Routes } from '@angular/router';
import { Settings } from './settings/settings';
import { PortfolioDashboardComponent } from './portfolio-dashboard/portfolio-dashboard.component';
import { OpenPositionsComponent } from './open-positions/open-positions.component';
import { StockTickerComponent } from './stock-ticker/stock-ticker.component';
import { adminGuard, analystGuard, userGuard } from './services/auth.guard';

export const routes: Routes = [
    { path: '', pathMatch: 'full', loadComponent: () => import('./landing/landing').then((m) => m.Landing) },
    { path: 'portfolio', component: PortfolioDashboardComponent, canActivate: [userGuard] },
    { path: 'stock-ticker', component: StockTickerComponent, canActivate: [userGuard] },
    { path: 'open-positions', component: OpenPositionsComponent, canActivate: [userGuard] },
    { path: 'settings', component: Settings, canActivate: [userGuard] },
    { path: 'register', loadComponent: () => import('./register/register').then((m) => m.Register) },
    { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
    { path: 'logout', loadComponent: () => import('./logout/logout').then((m) => m.Logout) },
    { path: 'transaction-history', canActivate: [userGuard], loadComponent: () => import('./transaction-history/transaction-history').then((m) => m.TransactionHistoryComponent) },
    { path: 'analyst-dashboard', canActivate: [analystGuard], loadComponent: () => import('./admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent) },
    { path: 'admin-account-view', canActivate: [adminGuard], loadComponent: () => import('./admin-account-view/admin-account-view').then((m) => m.AdminAccountViewComponent) },
    { path: 'admin-rankings/:rankingType', canActivate: [analystGuard], loadComponent: () => import('./admin-rankings/admin-rankings').then((m) => m.AdminRankingsComponent) },
    { path: 'compliance-records', canActivate: [analystGuard], loadComponent: () => import('./compliance-records/compliance-records').then((m) => m.ComplianceRecordsComponent) }
];
