import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ICONES, ITENS_PRINCIPAIS, ROTAS_MENU, TopbarComponent } from './topbar.component';

describe('TopbarComponent · item do Agente de IA', () => {
  function criar() {
    TestBed.configureTestingModule({
      imports: [TopbarComponent],
      // Rota mínima só para o Router aceitar navegar até /portal neste teste.
      providers: [provideRouter([{ path: 'portal', children: [] }])],
    });
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.detectChanges();
    return { fixture, comp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('aparece no grupo principal da gaveta', () => {
    const agente = ITENS_PRINCIPAIS.find((i) => i.chave === 'agente');
    expect(agente).toBeDefined();
    expect(agente!.rotulo).toBe('Agente de IA');
    expect(agente!.icone).toBe('robo');
  });

  it('tem um ícone de robô desenhado', () => {
    expect(ICONES['robo']).toBeDefined();
    expect(ICONES['robo'].length).toBeGreaterThan(0);
  });

  it('aponta para a âncora do agente dentro do portal', () => {
    // A âncora é o que diferencia do item "recomendação", que abre o portal no topo.
    expect(ROTAS_MENU['agente']).toBe('/portal#agente');
    expect(ROTAS_MENU['recomendacao']).toBe('/portal');
  });

  it('renderiza o botão com o rótulo e o ícone', () => {
    const { el } = criar();
    const botoes = Array.from(el.querySelectorAll('.drawer-link'));
    const botao = botoes.find((b) => b.textContent?.includes('Agente de IA'));

    expect(botao).toBeTruthy();
    expect(botao!.querySelectorAll('path').length).toBe(ICONES['robo'].length);
  });

  it('emite a chave do agente ao clicar', () => {
    const { comp } = criar();
    const emitidas: string[] = [];
    comp.navegar.subscribe((c: string) => emitidas.push(c));

    comp.ir('agente');

    expect(emitidas).toEqual(['agente']);
  });

  it('destaca o item quando a URL traz a âncora', async () => {
    const { comp, fixture } = criar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/portal#agente');
    fixture.detectChanges();

    // Descartar a âncora cedo demais faria a rota cair em "recomendacao".
    expect(comp.ativo()).toBe('agente');
  });

  it('sem a âncora, o portal não acende o item do agente', async () => {
    const { comp, fixture } = criar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/portal');
    fixture.detectChanges();

    expect(comp.ativo()).toBe('recomendacao');
  });
});
