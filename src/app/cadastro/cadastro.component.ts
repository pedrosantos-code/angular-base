import { Component, signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../auth.service';

export interface CadastroPayload {
  nome: string;
  email: string;
  senha: string;
}

/** Provedores gratuitos mais comuns no Brasil — cadastro é B2B. */
const PROVEDORES_PESSOAIS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com',
  'yahoo.com.br', 'icloud.com', 'me.com', 'bol.com.br', 'uol.com.br',
  'terra.com.br', 'ig.com.br', 'globo.com', 'proton.me', 'protonmail.com',
];

export function emailProfissional(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value ?? '').toString().trim().toLowerCase();
    const dominio = valor.split('@')[1];
    if (!dominio) return null;
    return PROVEDORES_PESSOAIS.includes(dominio) ? { pessoal: true } : null;
  };
}

export function camposIguais(campo: string, confirmacao: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(campo)?.value;
    const b = group.get(confirmacao)?.value;
    if (!b) return null;
    return a === b ? null : { divergente: true };
  };
}

@Component({
  selector: 'seia-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.css',
})
export class CadastroComponent {
  @Output() cadastrar = new EventEmitter<CadastroPayload>();
  @Output() goSite = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  enviando = false;
  mostrarSenha = false;

  readonly fluxo = [
    'ford bronco sport  |  "2.0 EcoBoost (253cv) · Tração 4WD"',
    'ford territory  |  "1.5 EcoBoost (169cv) · Tração FWD"',
    'ford explorer  |  "3.0 V6 (400cv) · Tração AWD"',
    'ford ranger  |  "3.0 V6 (250cv) · Tração 4x4"',
    'ford ranger raptor  |  "3.0 V6 (397cv) · Tração 4x4 com Reduzida"',
    'ford maverick tremor  |  "2.0 (253cv) · Tração AWD (4x4)"',
    'ford f-150  |  "5.0 V8 (405cv) · Tração 4x4"',
    'ford mustang gt  |  "5.0 V8 Coyote (488cv) · Tração RWD"',
    'ford mustang mach-e  |  "100% elétrico (487cv) · Tração eAWD"',
    'ford f-150 lightning  |  "100% elétrico (426cv) · Tração 4x4"',
    'ford e-transit van  |  "100% elétrico (269cv) · Tração RWD"',
    'ford maverick hybrid  |  "2.5 Híbrido (194cv) · Tração FWD"',
    'ford transit furgão  |  "2.0 EcoBlue Diesel · Tração RWD"',
    'ford transit minidús  |  "2.0 EcoBlue Diesel · Tração RWD"',
  ];

  readonly fluxoDuplicado = [...this.fluxo, ...this.fluxo];

  readonly amostra = {
    veiculo: 'Ranger 2.0 Diesel',
    atributos: '170 cv · 47,9 kgfm · AT 10v',
    tracao: 'Tração 4x4',
  };

  readonly marcas = 14;

  registerForm: FormGroup = this.fb.group(
    {
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, emailProfissional()]],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmacao: ['', Validators.required],
      termos: [false, Validators.requiredTrue],
    },
    { validators: camposIguais('senha', 'confirmacao') },
  );

  campo(nome: string): AbstractControl {
    return this.registerForm.get(nome)!;
  }

  invalido(nome: string): boolean {
    const c = this.campo(nome);
    return c.invalid && (c.touched || c.dirty);
  }

  get senhasDivergentes(): boolean {
    return this.registerForm.hasError('divergente') && !!this.campo('confirmacao').touched;
  }

  toggleMostrarSenha() {
    this.mostrarSenha = !this.mostrarSenha;
  }

  onRegister(..._args: unknown[]): void {
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.enviando = true;
    const { nome, email, senha } = this.registerForm.getRawValue();

    // Emite para o componente pai caso ele escute o evento
    this.cadastrar.emit({ nome, email, senha });

    this.authService.register(email, senha).subscribe({
      next: (response) => {
        this.enviando = false;
        if (response.error) {
          console.error('Erro no Supabase:', response.error.message);
          this.errorMessage.set(response.error.message);
        } else {
          console.log('Cadastro realizado com sucesso:', response);
          this.router.navigate(['/portal']);
        }
      },
      error: (error) => {
        this.enviando = false;
        console.error('Falha na requisição:', error);
        this.errorMessage.set('Ocorreu um erro ao tentar criar a conta.');
      },
    });
  }

  onSubmit(): void {
    this.onRegister();
  }
}