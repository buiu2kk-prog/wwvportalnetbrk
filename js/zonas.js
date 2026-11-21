/* ==========================================================================
   WEBFIBER · alinhamento das listras das zonas #0645B7
   As listras de 128° de cada .zona::before são desenhadas numa "folha" do tamanho da
   página inteira e deslocadas pelo topo da zona — duas zonas vizinhas continuam
   exatamente a mesma listra (sem degrau na emenda). Sem este script, cada zona usa o
   próprio padrão (visual idêntico ao /amigodefibra).
   ========================================================================== */
(function () {
  "use strict";
  var raiz = document.documentElement;
  var zonas = [].slice.call(document.querySelectorAll(".zona"));
  if (!zonas.length) return;
  var pendente = 0;
  var ultAltura = null;        // últimos valores gravados: só reescreve o que mudou
  var ultTopos = [];

  function alinhar() {
    pendente = 0;
    // 1) LER tudo primeiro, numa única passada de layout (Fase 1, 10/11/2026). Antes, cada zona
    //    lia a posição logo depois de uma gravação de estilo, e o navegador recalculava a página
    //    inteira uma vez por zona (120–280 ms num celular comum, a cada mudança de altura).
    var altura = raiz.scrollHeight;
    var rolagem = window.scrollY;
    var topos = zonas.map(function (z) {
      var topoZona = z.getBoundingClientRect().top + rolagem;
      var topoPseudo = parseFloat(getComputedStyle(z, "::before").top) || 0;
      return Math.round(topoZona + topoPseudo);
    });
    // 2) …e só então GRAVAR. Os valores são os mesmos de antes (--page-h e --zy só mudam o
    //    fundo das zonas, não o layout, então ler antes ou depois dá o mesmo número).
    if (altura !== ultAltura) {
      ultAltura = altura;
      raiz.style.setProperty("--page-h", altura + "px");
    }
    zonas.forEach(function (z, i) {
      if (topos[i] === ultTopos[i]) return;
      ultTopos[i] = topos[i];
      z.style.setProperty("--zy", topos[i] + "px");
    });
    // só agora as zonas vizinhas podem emendar sem degradê (o CSS depende desta classe)
    raiz.classList.add("listras-ok");
  }
  function agendar() { if (!pendente) pendente = requestAnimationFrame(alinhar); }

  agendar();
  addEventListener("load", agendar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendar);
  // pins do ScrollTrigger e imagens tardias mudam a altura da página
  if ("ResizeObserver" in window) new ResizeObserver(agendar).observe(document.body);
  else addEventListener("resize", agendar);
})();
