import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-termos',
  imports: [RouterLink],
  templateUrl: './termos.component.html',
  styleUrl: './termos.component.css',
})