import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  onLogout(): void {
    console.log('logout clicked'); // TODO: wire real auth later
  }
}
