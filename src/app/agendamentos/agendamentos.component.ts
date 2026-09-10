import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-agendamentos',
  imports: [RouterLink],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.css',
})