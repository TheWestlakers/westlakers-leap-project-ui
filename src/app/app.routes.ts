import { Routes } from '@angular/router';
import { Settings } from './settings/settings';
import { DashboardComponent } from './client-dashboard/pages/dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', redirectTo: '/settings', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'settings', component: Settings },
];
