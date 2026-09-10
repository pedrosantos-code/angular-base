import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-fale-conosco',
  imports: [RouterLink],
  templateUrl: './faleconosco.component.html',
  styleUrl: './faleconosco.component.css',
})