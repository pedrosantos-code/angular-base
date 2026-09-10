import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-sobre-ia',
  imports: [RouterLink],
  templateUrl: './sobreia.component.html',
  styleUrl: './sobreia.component.css',
})