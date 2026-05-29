import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.css',
})
export class App {
  protected readonly title = signal('meu-projeto');
}
