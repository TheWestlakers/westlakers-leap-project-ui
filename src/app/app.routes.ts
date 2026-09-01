import { Routes } from '@angular/router';
import { Settings } from './settings/settings';

export const routes: Routes = [
    { path: '', redirectTo: '/settings', pathMatch: 'full' },
    { path: 'settings', component: Settings },
];
