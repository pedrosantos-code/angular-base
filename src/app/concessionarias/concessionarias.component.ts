import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-concessionarias',
  imports: [RouterLink],
  templateUrl: './concessionarias.component.html',
  styleUrl: './concessionarias.component.css',
})