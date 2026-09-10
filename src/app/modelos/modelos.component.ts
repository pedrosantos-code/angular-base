import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-modelos',
  imports: [RouterLink],
  templateUrl: './modelos.component.html',
  styleUrl: './modelos.component.css',
})