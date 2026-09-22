import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ICONES, ITENS_PRINCIPAIS, ROTAS_MENU, TopbarComponent } from './topbar.component';

describe('TopbarComponent · item "Agente de IA" removido da gaveta', () => {
  function criar() {
    TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [provideRouter([{ path: 'portal', children: [] }])],
    });
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.detectChanges();
    return { fixture, comp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('não aparece mais no grupo principal da gaveta', () => {
    expect(ITENS_PRINCIPAIS.find((i) => i.chave === 'agente')).toBeUndefined();
  });

  it('não tem mais rota cadastrada pra essa chave', () => {
    expect(ROTAS_MENU['agente']).toBeUndefined();
  });

  it('não tem mais ícone de robô (só era usado por esse item)', () => {
    expect(ICONES['robo']).toBeUndefined();
  });

  it('não renderiza nenhum botão "Agente de IA" na gaveta', () => {
    const { el } = criar();
    const botoes = Array.from(el.querySelectorAll('.drawer-link'));
    expect(botoes.some((b) => b.textContent?.includes('Agente de IA'))).toBe(false);
  });
});
