 // ===== tudo que mexe no header e nas animações mora aqui =====

    const topo = document.getElementById('topo');
    const links = [...topo.querySelectorAll('a')];
    const marcador = topo.querySelector('.marcador');
    const secoes = [...document.querySelectorAll('[data-secao]')];

    // se a pessoa pediu menos movimento no sistema, a rolagem vira um pulo normal
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let atual = null;               // id da seção que tá marcada agora
    let rolandoPorClique = false;   // true enquanto a rolagem do clique tá rolando
    let quadro;                     // guarda o requestAnimationFrame pra poder cancelar

    // ---------- barrinha azul ----------
    // o link ativo cresce 6% no css (scale 1.06), então a barra também precisa
    // ficar 6% maior e recuar um pouquinho pra esquerda, senão ela fica menor que a palavra
    const ESCALA = 1.06;

    function posicionarMarcador(animar = true) {
      const link = topo.querySelector('a.ativo');
      if (!link) return;

      // sem animar = teleporta (usado no carregamento e no resize, pra não ver a barra "voando")
      marcador.style.transition = animar ? '' : 'none';
      marcador.style.width = link.offsetWidth * ESCALA + 'px';
      marcador.style.transform = `translateX(${link.offsetLeft - link.offsetWidth * (ESCALA - 1) / 2}px)`;

      if (!animar) {
        marcador.offsetWidth;            // força o navegador a aplicar antes de religar a transition
        marcador.style.transition = '';
      }
    }

    // marca o link da seção `id` e manda a barra até ele
    function ativar(id, animar = true) {
      if (id === atual) return;
      atual = id;
      links.forEach(link => {
        const ehEsse = link.getAttribute('href') === '#' + id;
        link.classList.toggle('ativo', ehEsse);
        if (ehEsse) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      posicionarMarcador(animar);
    }

    // ---------- qual seção tá na tela? ----------
    // imagina uma linha invisível a 40% da altura da tela: a última seção
    // que já passou dessa linha é a que a pessoa tá lendo
    function descobrirSecao() {
      const linha = window.innerHeight * 0.4;
      let id = secoes[0].dataset.secao;
      secoes.forEach(s => {
        if (s.getBoundingClientRect().top <= linha) id = s.dataset.secao;
      });

      // o rodapé é baixinho e nunca chega na linha, então se bateu no fim da página é contato
      const fimDaPagina = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      return fimDaPagina ? 'contato' : id;
    }

    // ---------- rolagem rápida e suave ----------
    // não uso o scroll-behavior do css porque ele não deixa controlar a duração.
    // aqui eu mesmo calculo cada quadro com uma curva que começa e termina devagarzinho
    function rolarAte(alvo) {
      // desconta a altura do header pra ele não cobrir o título da seção
      const topoDoAlvo = alvo.id === 'inicio'
        ? 0
        : alvo.getBoundingClientRect().top + window.scrollY - topo.offsetHeight;
      const maximo = document.documentElement.scrollHeight - window.innerHeight;
      const fim = Math.max(0, Math.min(topoDoAlvo, maximo));
      const inicio = window.scrollY;
      const distancia = fim - inicio;

      if (semMovimento || Math.abs(distancia) < 2) {
        window.scrollTo(0, fim);
        return;
      }

      // distâncias curtas levam uns 0,7s e as longas até 1,2s: rápido, mas com tempo
      // de enxergar o movimento (mais rápido que isso parece um pulo)
      const duracao = Math.min(1200, Math.max(700, Math.abs(distancia) * 0.8));
      const comeco = performance.now();
      rolandoPorClique = true;

      function passo(agora) {
        const t = Math.min((agora - comeco) / duracao, 1);
        const suave = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
        window.scrollTo(0, inicio + distancia * suave);

        if (t < 1) {
          quadro = requestAnimationFrame(passo);
        } else {
          // espera um tiquinho pra ignorar o último evento de scroll
          setTimeout(() => (rolandoPorClique = false), 120);
        }
      }
      quadro = requestAnimationFrame(passo);
    }

    // se a pessoa girar o mouse ou arrastar o dedo no meio da rolagem, a gente solta o controle
    ['wheel', 'touchmove'].forEach(evento =>
      window.addEventListener(evento, () => {
        cancelAnimationFrame(quadro);
        rolandoPorClique = false;
      }, { passive: true })
    );

    // clique no menu: marca o link na hora (a barra já começa a deslizar) e rola até a seção
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        ativar(id);
        rolarAte(document.getElementById(id));
        history.replaceState(null, '', '#' + id);
      });
    });

    // ---------- scroll: cola o header e atualiza o link atual ----------
    // o requestAnimationFrame evita rodar a conta mil vezes por segundo
    let esperando = false;
    function aoRolar() {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(() => {
        esperando = false;
        topo.classList.toggle('colado', window.scrollY > 40);
        // durante o clique a gente ignora, senão a barra passearia por todos os links no caminho
        if (!rolandoPorClique) ativar(descobrirSecao());
      });
    }
    window.addEventListener('scroll', aoRolar, { passive: true });

    // ---------- itens que aparecem ao rolar ----------
    // em vez de pôr a classe em cada card no html, o js marca todo mundo de uma vez
    document.querySelectorAll('.card, .motivo, .passo, .objetivo > *, .secao > h2, .secao > .sobretitulo, .secao > .subtitulo')
      .forEach(el => el.classList.add('revelar'));

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visivel');
          observador.unobserve(entrada.target); // anima só a primeira vez
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.revelar').forEach(el => observador.observe(el));

    // ---------- arranque ----------
    topo.classList.toggle('colado', window.scrollY > 40);
    ativar(descobrirSecao(), false);

    // a fonte demora um pouco pra carregar e muda a largura dos links, aí recalculo a barra
    document.fonts.ready.then(() => posicionarMarcador(false));
    window.addEventListener('resize', () => posicionarMarcador(false));