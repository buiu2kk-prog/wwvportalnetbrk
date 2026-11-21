/* ==========================================================================
   WEBFIBER · HOME 3D "A luz que chega em casa" — orquestrador (ES module)
   Lenis + GSAP (ScrollTrigger/SplitText) + UI + rastreamento + cenas 3D e vídeos.
   Contrato de marcação: _dev/MARKUP-CONTRACT.md · Spec: _dev/SPEC.md
   Regra de ouro: a página é completa SEM este arquivo; aqui só se acrescenta
   movimento. Se GSAP/Lenis não carregarem, tudo continua visível e funcional.
   ⚙️ CONFIG: o que o dono pode querer trocar está aqui no topo.
   ========================================================================== */

const CONFIG = {
  whatsappNumero: "5535988327877",
  whatsappMensagem: "Olá! Vim pelo site e quero contratar um plano da Nova Net.",
  conversaoAds: "AW-18086861405/Sb-JCLHf9LscEN20vrBD",
  rotadorMs: 4000,        // troca automática do plano no hero (só desktop)
  offsetAncora: -80,      // âncoras param abaixo do header
  parallaxPx: 24          // deslocamento máx. dos ícones 3D por unidade de data-depth
};

// confirma para o failsafe do <head> que o app assumiu (ANTES de qualquer coisa que possa falhar)
window.__revealOk = true;

const doc = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const mq = q => window.matchMedia(q);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const noDominioOficial = () => /webfiberprovedor\.com\.br$/.test(location.hostname);

/* --------------------------------------------------------------------------
   0 · Detecção do ambiente
   -------------------------------------------------------------------------- */
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const SplitText = window.SplitText;
const LenisCls = window.Lenis;

const ENV = {
  reduce: mq("(prefers-reduced-motion: reduce)").matches,
  fino: mq("(hover: hover) and (pointer: fine)").matches,
  hover: mq("(hover: hover)").matches,
  saveData: !!(navigator.connection && navigator.connection.saveData),
  fraco: (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4
};
const temGSAP = !!(gsap && ScrollTrigger);
// MOVIMENTO = o app controla revelações/scrub. Sem GSAP ou com reduced-motion, a página fica estática.
const MOVIMENTO = temGSAP && !ENV.reduce;
// sem GSAP (vendor bloqueado/falhou): tira a classe .js para o CSS mostrar tudo, sem estados escondidos
if (!temGSAP && !ENV.reduce) doc.classList.remove("js");

let webglCache = null;
function temWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    // falha se só houver renderização por software (SwiftShader): 3D pesado no processador não vale
    const o = { failIfMajorPerformanceCaveat: true };
    const gl = c.getContext("webgl2", o) || c.getContext("webgl", o);
    webglCache = !!gl;
    if (gl) { const x = gl.getExtension("WEBGL_lose_context"); x && x.loseContext(); }
  } catch (e) { webglCache = false; }
  return webglCache;
}

// cada bloco isolado: um defeito num efeito não derruba o resto da página
function seguro(nome, fn) {
  try { return fn(); } catch (e) { console.warn("[app] " + nome + ":", e); }
}

// executa depois do load + janela ociosa (vídeo e cena do hero não disputam a 1ª pintura)
function depoisDoLoad(fn, espera = 1500) {
  const ocioso = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: espera }) : setTimeout(cb, 200));
  if (document.readyState === "complete") ocioso(fn);
  else addEventListener("load", () => ocioso(fn), { once: true });
}

// estado compartilhado entre os blocos
const S = {
  lenis: null,
  scrollY: window.scrollY,
  vel: 0,                       // velocidade do scroll suavizada (px/s, com sinal)
  ptr: { tx: 0, ty: 0, x: 0, y: 0, ativo: false },  // ponteiro normalizado na janela (-1..1)
  heroP: 0,
  miloP: 0,                     // progresso da apresentação do Milo (0..1)
  bracoP: 0,                    // braço do Milo: 0 = como na arte · 1 = joinha (desktop: rolagem do hero)
  rig2d: null,                  // Milo 2D articulado (celular / sem WebGL): camadas <img> do rig
  heroCena: null,               // fibra 3D (halo atrás do Milo)
  milo: null,                   // Milo 2.5D (js/milo3d.js)
  orbita: null,                 // ícones 3D orbitando o Milo
  heroVisivel: true,
  profundidade: [],             // alvos do parallax por ponteiro [{el, d, vis, x, y}]
  imas: new Set(),              // botões magnéticos em movimento
  marquee: null,                // {vis, anims[], skew, rate}
  parede: null,                 // {vis, anims[], rate}
  ctaVideo: null,               // {v, vis, rate}
  fechaMenu: null
};
// ganchos de QA (só com ?qa na URL): estado interno para os testes de _dev/qa
if (/[?&]qa(?:[=&]|$)/.test(location.search)) window.__wf = S;

/* --------------------------------------------------------------------------
   1 · Rastreamento herdado do original (idêntico ao js/main.js)
       [data-wa] vira link com mensagem pronta; conversões só no domínio oficial.
   -------------------------------------------------------------------------- */
// de onde partiu o clique: usa data-*-local, senão o id da <section> mais próxima
function ondeEstou(el, padrao) {
  return el.getAttribute("data-wa-local") || el.getAttribute("data-tel-local") ||
         el.closest("section[id]")?.id ||
         // o menu do celular fica FORA do <header> aqui (no original ficava dentro): mesma origem "topbar"
         (el.closest("footer") ? "footer" : el.closest("header, #menuMobile") ? "topbar" : padrao);
}

function rastreamento() {
  $$("[data-wa]").forEach(el => {
    const msg = el.getAttribute("data-wa-msg") || CONFIG.whatsappMensagem;
    el.href = `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(msg)}`;
    // Conversões no clique SEM bloquear a navegação nativa: o transport beacon
    // garante o envio mesmo com a página descarregando.
    el.addEventListener("click", () => {
      const local = ondeEstou(el, "whatsapp");
      if (typeof gtag === "function") {
        gtag("event", "whatsapp_click", { button_location: local, page_path: location.pathname });
      }
      if (!noDominioOficial()) return; // testes locais não sujam o Ads
      if (typeof gtag === "function") gtag("event", "conversion", { "send_to": CONFIG.conversaoAds, "transport_type": "beacon" });
      if (typeof fbq === "function") fbq("track", "Lead", { currency: "BRL", value: 99.90 });
    });
  });

  // Telefone: WhatsApp (21) 98558-9201 e fixo (21) 2291-0825
  $$('a[href^="tel:"]').forEach(el => {
    el.setAttribute("data-tel", "");
    el.addEventListener("click", () => {
      const numero = el.getAttribute("href").replace("tel:", "");
      if (typeof gtag === "function") {
        gtag("event", "phone_click", {
          button_location: ondeEstou(el, "telefone"),
          phone_number: numero,          // número da EMPRESA, não do visitante
          page_path: location.pathname
        });
      }
      if (noDominioOficial() && typeof fbq === "function") fbq("track", "Contact");
    });
  });

  // "Baixe sua Fatura" (área do cliente): sinal de cliente existente, não de lead novo
  $$('a[href*="areadocliente"]').forEach(el => {
    el.addEventListener("click", () => {
      if (typeof gtag === "function") {
        gtag("event", "fatura_click", { button_location: ondeEstou(el, "fatura"), page_path: location.pathname });
      }
    });
  });

  // Profundidade de rolagem: sinal secundário de engajamento para o Google
  (function scrollDepth() {
    const marcos = [50, 90];
    const vistos = new Set();
    const medir = () => {
      const alt = doc.scrollHeight - window.innerHeight;
      if (alt <= 0) return;
      const pct = (window.scrollY / alt) * 100;
      marcos.forEach(m => {
        if (pct >= m && !vistos.has(m)) {
          vistos.add(m);
          if (typeof gtag === "function") gtag("event", "scroll_" + m, { page_path: location.pathname });
        }
      });
      if (vistos.size === marcos.length) window.removeEventListener("scroll", medir);
    };
    window.addEventListener("scroll", medir, { passive: true });
  })();

  const ano = $("#anoAtual");
  if (ano) ano.textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------------
   2 · Smooth scroll (Lenis) sincronizado ao ticker do GSAP — um único loop
   -------------------------------------------------------------------------- */
function injetaCss() {
  // regras do lenis.css (o arquivo não é linkado no <head>) + foco programático sem anel
  const css =
    "html.lenis,html.lenis body{height:auto}" +
    "html.lenis{scroll-behavior:auto!important}" +
    ".lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}" +
    ".lenis [data-lenis-prevent]{overscroll-behavior:contain}" +
    ".lenis.lenis-smooth iframe{pointer-events:none}" +
    "[data-foco-alvo]:focus{outline:none}";
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
}

function suave() {
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.ticker.lagSmoothing(0);
  if (!LenisCls) return;
  const lenis = new LenisCls({
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,           // toque segue nativo (inércia do sistema)
    autoRaf: false,
    anchors: false              // âncoras tratadas abaixo (offset do header + menu)
  });
  S.lenis = window.__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
}

/* --------------------------------------------------------------------------
   3 · Âncoras internas (offset do header, foco para teclado/leitor de tela)
   -------------------------------------------------------------------------- */
function ancoras() {
  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    if (hash.length < 2) return;
    let alvo = null;
    try { alvo = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (err) { return; }
    if (!alvo) return;
    e.preventDefault();
    if (S.fechaMenu) S.fechaMenu();
    // destino numérico: o Lenis somaria o scroll-padding-top do <html> a um alvo-elemento (parava 88px mais baixo)
    const y = Math.max(0, Math.round(alvo.getBoundingClientRect().top + window.scrollY + CONFIG.offsetAncora));
    if (S.lenis) S.lenis.scrollTo(y, { duration: 1.3 });
    else window.scrollTo({ top: y, behavior: ENV.reduce ? "auto" : "smooth" });
    // foco vai junto (skip-link, teclado); sem anel de foco na seção inteira
    const nativo = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|DETAILS)$/.test(alvo.tagName);
    if (!nativo && !alvo.hasAttribute("tabindex")) {
      alvo.setAttribute("tabindex", "-1");
      alvo.setAttribute("data-foco-alvo", "");
    }
    try { alvo.focus({ preventScroll: true }); } catch (err) { /* ok */ }
  });
}

/* --------------------------------------------------------------------------
   4 · Header: estado rolado + barra de progresso de leitura
   -------------------------------------------------------------------------- */
function header() {
  const topbar = $("#topbar");
  if (!topbar) return;
  // onde o CSS tem animation-timeline: scroll(), a barra anda sozinha
  const precisaProgresso = !(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
  let rolado = null, prog = -1, altura = 1;
  const mede = () => { altura = Math.max(1, doc.scrollHeight - window.innerHeight); };
  const atualiza = () => {
    const y = window.scrollY;
    const r = y > 30;
    if (r !== rolado) { rolado = r; topbar.classList.toggle("is-scrolled", r); }
    if (precisaProgresso) {
      const p = clamp(y / altura, 0, 1);
      if (Math.abs(p - prog) > 0.001) { prog = p; topbar.style.setProperty("--progress", p.toFixed(4)); }
    }
  };
  mede();
  atualiza();
  window.addEventListener("scroll", atualiza, { passive: true });
  window.addEventListener("resize", () => { mede(); atualiza(); }, { passive: true });
  addEventListener("load", mede, { once: true });
  if (MOVIMENTO) ScrollTrigger.addEventListener("refresh", mede);
}

/* --------------------------------------------------------------------------
   5 · Menu do celular: tela cheia, foco preso, Esc, clique fora
   -------------------------------------------------------------------------- */
function menu() {
  const btn = $("#burger");
  const nav = $("#menuMobile");
  if (!btn || !nav) return;
  const topbar = $("#topbar");
  // a stickybar fica de fora: segue visível por cima do menu (regra do dono) e precisa continuar clicável
  const fundo = [$("main"), $(".footer"), $(".fab")].filter(Boolean);
  nav.setAttribute("data-lenis-prevent", "");   // o menu rola por conta própria em telas baixas
  let aberto = false;

  const alterna = (abrir, devolveFoco = true) => {
    if (abrir === aberto) return;
    aberto = abrir;
    // Lenis PRIMEIRO (Fase 1, 10/11/2026): stop()/start() leem a posição da rolagem. Feito depois
    // das mudanças de classe abaixo, essa leitura obrigava o navegador a recalcular a página
    // inteira dentro do clique (60–200 ms num celular comum) e de novo na pintura. Com o layout
    // ainda limpo a leitura é gratuita; o resultado é idêntico, só muda a ordem.
    if (S.lenis) abrir ? S.lenis.stop() : S.lenis.start();
    nav.classList.toggle("is-open", abrir);
    btn.setAttribute("aria-expanded", String(abrir));
    btn.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    if (topbar) topbar.classList.toggle("has-menu", abrir);
    // o resto da página sai do alcance do teclado e do leitor de tela enquanto o menu cobre tudo
    fundo.forEach(el => { el.inert = abrir; });
    if (!S.lenis) doc.style.overflow = abrir ? "hidden" : "";
    if (abrir) {
      const primeiro = $("a", nav);
      // espera o visibility:visible do CSS para o elemento aceitar foco
      requestAnimationFrame(() => primeiro && primeiro.focus({ preventScroll: true }));
    } else if (devolveFoco && nav.contains(document.activeElement)) {
      btn.focus({ preventScroll: true });
    }
  };
  S.fechaMenu = () => alterna(false, false);

  btn.addEventListener("click", () => alterna(!aberto));
  // fecha ao escolher um item (senão o menu cobre a seção de destino)
  nav.addEventListener("click", e => { if (e.target.closest("a")) alterna(false, false); });
  document.addEventListener("click", e => {
    if (aberto && !nav.contains(e.target) && !btn.contains(e.target)) alterna(false, false);
  });
  document.addEventListener("keydown", e => {
    if (!aberto) return;
    if (e.key === "Escape") { alterna(false); btn.focus({ preventScroll: true }); return; }
    if (e.key !== "Tab") return;
    // foco preso: burger + itens do menu
    const lista = [btn, ...$$("a[href], button", nav)];
    const i = lista.indexOf(document.activeElement);
    let prox;
    if (e.shiftKey) prox = i <= 0 ? lista[lista.length - 1] : lista[i - 1];
    else prox = i === -1 || i === lista.length - 1 ? lista[0] : lista[i + 1];
    e.preventDefault();
    prox.focus();
  });
  // virou desktop com o menu aberto (o CSS some com ele ≥ 1080px): libera a página
  window.addEventListener("resize", () => { if (aberto && window.innerWidth >= 1080) alterna(false, false); }, { passive: true });
}

/* --------------------------------------------------------------------------
   6 · Rotador de planos do hero (H1): 700 → 850 → 1 GIGA, flip 3D letra a letra
       Celular: parado no 700 que veio no HTML (LCP). Pontos continuam clicáveis.
   -------------------------------------------------------------------------- */
function rotador() {
  const rot = $("#rotador");
  const num = $("#rotNum");
  const dados = $("#rotData");
  if (!rot || !num || !dados) return;
  const unit = $("#rotUnit"), pre = $("#rotPre"), preco = $("#rotPreco"), extra = $("#rotExtra"), dots = $("#rotDots");
  let PLANOS;
  try { PLANOS = JSON.parse(dados.textContent); } catch (e) { return; }
  if (!Array.isArray(PLANOS) || !PLANOS.length) return;

  let idx = 0, trocando = false, timer = 0, pausadoEm = 0, sobre = false;
  const pill = () => extra && extra.querySelector(".rot__pill");
  const giraSozinho = () => window.innerWidth >= 900 && !ENV.reduce;

  /* Pontos: dentro do H1 (aria-hidden) — ficam fora da ordem de Tab para não poluir o título;
     a mesma escolha está acessível na seção de planos logo abaixo. */
  const botoes = PLANOS.map((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rot__dot";
    b.tabIndex = -1;
    b.setAttribute("aria-label", "Ver plano " + p.num + " " + p.unit);
    b.setAttribute("aria-pressed", String(i === 0));
    b.addEventListener("click", () => {
      para();
      vaiPara(i);
      if (!sobre) arma();
    });
    dots && dots.appendChild(b);
    return b;
  });
  const marca = () => botoes.forEach((b, i) => b.setAttribute("aria-pressed", String(i === idx)));

  function letras(el, txt) {
    const cs = Array.from(String(txt));
    el.textContent = "";
    cs.forEach((c, k) => {
      const s = document.createElement("span");
      s.className = "rot__ch";
      s.style.setProperty("--k", k);
      s.style.setProperty("--n", cs.length);
      s.textContent = c === " " ? " " : c;
      el.appendChild(s);
    });
    return Array.from(el.children);
  }
  // "1 GIGA": o número tem 1 dígito só — o GIGA cresce até perto do tamanho do "1" (pedido do dono 25/09).
  // A unidade cresce por escala (transform), não por font-size: nada mais no H1 se mexe (sem layout shift).
  function giga(p) {
    const on = p.unit === "GIGA";
    if (on && unit) {
      const fn = parseFloat(getComputedStyle(num).fontSize) || 0;
      const fu = parseFloat(getComputedStyle(unit).fontSize) || 0;
      if (fn && fu) rot.style.setProperty("--giga-k", (0.9 * fn / fu).toFixed(4));
    }
    rot.classList.toggle("is-giga", on);
  }
  function textos(p) {
    if (pre) pre.textContent = p.pre;
    // R$ menor e colado no valor: nunca quebra de linha sozinho
    if (preco) preco.innerHTML = "<small>R$&nbsp;</small>" + p.preco;
    const pl = pill();
    if (pl) { pl.textContent = p.extra; pl.classList.toggle("rot__pill--watch", !!p.watch); }
  }
  function direto(p) {
    num.classList.remove("is-split");
    num.textContent = p.num;
    if (unit) unit.textContent = p.unit;
    giga(p);
    textos(p);
  }

  function vaiPara(n) {
    if (n === idx || trocando) return;
    const p = PLANOS[n];
    if (!MOVIMENTO) { direto(p); idx = n; marca(); return; }
    trocando = true;
    idx = n;
    marca();
    let acabou = false;
    const fim = () => {
      if (acabou) return;
      acabou = true;
      clearTimeout(garantia);
      // volta a texto puro: devolve a varredura de luz do CSS
      direto(p);
      const leves = [pill(), pre, preco].filter(Boolean);
      gsap.set(leves, { clearProps: "transform,opacity" });
      trocando = false;
    };
    // rede de segurança: se os quadros pararem (aba oculta, página congelada), a troca termina
    const garantia = setTimeout(fim, 2600);

    num.classList.add("is-split");
    const saem = [...letras(num, num.textContent.trim()), ...(unit ? letras(unit, unit.textContent.trim()) : [])];
    const leves = [pill(), pre, preco].filter(Boolean);
    /* Troca defasada: o número sai e entra primeiro; preço e pílula só saem quando o número novo
       já está entrando (e voltam logo depois). O H1 sempre tem uma âncora na tela. */
    gsap.timeline({
      onComplete() {
        if (acabou) return;
        const entram = [...letras(num, p.num), ...(unit ? letras(unit, p.unit) : [])];
        giga(p);
        gsap.timeline({ onComplete: fim })
          .fromTo(entram, { rotationX: 90, opacity: 0 }, { rotationX: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.045 })
          .to(leves, { y: -8, opacity: 0, duration: 0.2, ease: "power2.in", stagger: 0.02 }, 0.05)
          .add(() => { if (!acabou) textos(p); }, 0.3)
          .fromTo(leves, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.05, immediateRender: false }, 0.32);
      }
    })
      .to(saem, { rotationX: -90, opacity: 0, duration: 0.34, ease: "power2.in", stagger: 0.03 });
  }

  function arma() {
    if (!giraSozinho()) return;
    pausadoEm = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      // só gira com o hero na tela e a aba visível (ninguém vê o preço trocar pelas costas)
      if (document.hidden || !S.heroVisivel || !giraSozinho()) return;
      vaiPara((idx + 1) % PLANOS.length);
    }, CONFIG.rotadorMs);
  }
  function para() { clearInterval(timer); timer = 0; pausadoEm = Date.now(); }

  // pausa no hover só onde existe hover de verdade (no toque vem pointercancel, não pointerleave)
  if (ENV.hover) {
    rot.addEventListener("pointerenter", () => { sobre = true; para(); });
    rot.addEventListener("pointerleave", () => { sobre = false; arma(); });
  }
  // watchdog: "parado" nunca é estado absorvente
  setInterval(() => {
    if (!pausadoEm || sobre || document.hidden) return;
    if (Date.now() - pausadoEm > 8000) arma();
  }, 4000);
  document.addEventListener("visibilitychange", () => { if (document.hidden) para(); else if (!sobre) arma(); });
  arma();
}

/* --------------------------------------------------------------------------
   7 · Comparador antes × depois (range nativo acessível + arrasto exato)
   -------------------------------------------------------------------------- */
function comparador() {
  const box = $("#cmp");
  const range = $("#cmpRange");
  if (!box || !range) return;
  const palco = $(".cmp__stage", box) || box;
  let ultimo = 50, arrasto = null, convite = null, mexeu = false, emToque = false;

  let largura = palco.clientWidth || 0;
  const aplica = v => {
    v = clamp(+v || 0, 0, 100);
    ultimo = v;
    box.style.setProperty("--pos", v.toFixed(2) + "%");
    if (largura) box.style.setProperty("--pos-px", (v / 100 * largura).toFixed(1) + "px");
    range.value = String(Math.round(v));
    range.setAttribute("aria-valuetext", Math.round(v) + "% internet antiga");
  };
  const paraConvite = () => { mexeu = true; if (convite) { convite.kill(); convite = null; } };
  const doPonteiro = e => {
    const r = arrasto ? arrasto.r : palco.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  };

  range.addEventListener("input", () => {
    // dedo passando por cima (rolando a página): o range nativo pula para o ponto do toque — desfaz.
    // Com o dedo, a alça só anda num arrasto horizontal confirmado ou num toque simples (pointerup).
    if (emToque && !(arrasto && arrasto.ativo)) { aplica(ultimo); return; }
    paraConvite();
    // durante o arrasto manda a posição exata do ponteiro (o range nativo erra meia alça nas pontas)
    if (arrasto && arrasto.ativo) { aplica(ultimo); return; }
    aplica(range.value);
  });
  range.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    paraConvite();
    arrasto = { id: e.pointerId, x0: e.clientX, y0: e.clientY, r: palco.getBoundingClientRect(), toque: e.pointerType === "touch", ativo: false };
    emToque = arrasto.toque;
    if (!arrasto.toque) {
      // mouse/caneta: pega na hora, no ponto exato do clique
      e.preventDefault();
      arrasto.ativo = true;
      try { range.focus({ preventScroll: true }); range.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      aplica(doPonteiro(e));
    }
  });
  range.addEventListener("pointermove", e => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    if (!arrasto.ativo) {
      // toque: só vira arrasto se o gesto for horizontal (vertical = rolar a página)
      const dx = Math.abs(e.clientX - arrasto.x0), dy = Math.abs(e.clientY - arrasto.y0);
      if (dx > 8 && dx > dy * 1.2) {
        arrasto.ativo = true;
        try { range.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      } else if (dy > 10) { arrasto = null; return; }
      else return;
    }
    aplica(doPonteiro(e));
  });
  const solta = e => {
    if (e.pointerType === "touch") setTimeout(() => { emToque = false; }, 0);
    if (!arrasto || e.pointerId !== arrasto.id) return;
    if (e.type === "pointerup" && arrasto.toque && !arrasto.ativo) aplica(doPonteiro(e));  // toque simples
    arrasto = null;
  };
  range.addEventListener("pointerup", solta);
  range.addEventListener("pointercancel", solta);

  // largura do palco em px (a alça anda por transform); medida só quando o tamanho muda
  const medeLargura = () => {
    largura = palco.clientWidth || 0;
    if (!largura) return;
    box.style.setProperty("--w-px", largura + "px");
    box.classList.add("is-px");
    aplica(ultimo);
  };
  if ("ResizeObserver" in window) new ResizeObserver(medeLargura).observe(palco);
  medeLargura();
  aplica(50);

  // convite: na 1ª vez que aparece, a alça passeia 50 → 22 → 78 → 50 (para se a pessoa mexer)
  if (MOVIMENTO) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      if (mexeu) return;
      const o = { v: 50 };
      convite = gsap.timeline({ delay: 0.3, onUpdate: () => aplica(o.v), onComplete: () => { convite = null; } })
        .to(o, { v: 22, duration: 0.8, ease: "power2.inOut" })
        .to(o, { v: 78, duration: 1.0, ease: "power2.inOut" })
        .to(o, { v: 50, duration: 0.6, ease: "power2.inOut" });
    }, { threshold: 0.5 });
    io.observe(palco);
  }
}

/* --------------------------------------------------------------------------
   8 · Contadores da seção Confiança (tempo de mercado calculado na hora)
   -------------------------------------------------------------------------- */
function contadores() {
  // tempo de mercado a partir da abertura do CNPJ (01/09/2017): nunca desatualiza nem exagera
  $$("[data-anos-desde]").forEach(el => {
    const [a, m, d] = el.dataset.anosDesde.split("-").map(Number);
    const inicio = new Date(a, m - 1, d), hoje = new Date();
    let anos = hoje.getFullYear() - inicio.getFullYear();
    const passouAniversario = hoje.getMonth() > inicio.getMonth() ||
      (hoje.getMonth() === inicio.getMonth() && hoje.getDate() >= inicio.getDate());
    if (!passouAniversario) anos--;
    el.dataset.count = String(anos);
  });

  const els = $$("[data-count]");
  if (!els.length) return;
  const fmt = (el, v) => {
    const dec = +el.dataset.decimals || 0;
    let txt = dec ? v.toFixed(dec).replace(".", ",") : Math.round(v).toString();
    if (el.dataset.format === "mil") txt = Math.round(v).toLocaleString("pt-BR");
    el.textContent = txt + (el.dataset.suffix || "");
  };
  if (!MOVIMENTO) { els.forEach(el => fmt(el, parseFloat(el.dataset.count))); return; }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, alvo = parseFloat(el.dataset.count);
      io.unobserve(el);
      const o = { v: 0 };
      // rede de segurança: frames parados no meio da contagem não deixam número intermediário
      const garantia = setTimeout(() => fmt(el, alvo), 2200);
      gsap.to(o, {
        v: alvo, duration: 1.6, ease: "expo.out",
        onUpdate: () => fmt(el, o.v),
        onComplete: () => { clearTimeout(garantia); fmt(el, alvo); }
      });
    });
  }, {
    // dispara ~140px ANTES de entrar na tela: o "zera e sobe" acontece fora do campo de visão
    threshold: 0, rootMargin: "0px 0px 140px 0px"
  });
  els.forEach(el => io.observe(el));
}

/* --------------------------------------------------------------------------
   9 · FAQ: abertura suave nos navegadores sem ::details-content (Safari/Firefox)
   -------------------------------------------------------------------------- */
function faq() {
  if (!MOVIMENTO) return;
  let nativo = false;
  try { nativo = CSS.supports("selector(::details-content)"); } catch (e) { nativo = false; }
  if (nativo) return;
  $$(".faq__item").forEach(d => {
    const s = $("summary", d), a = $(".faq__a", d);
    if (!s || !a || !a.animate) return;
    let anim = null;
    s.addEventListener("click", e => {
      e.preventDefault();
      if (anim) anim.cancel();
      const ease = "cubic-bezier(.16,1,.3,1)";
      if (d.open) {
        anim = a.animate([{ height: a.offsetHeight + "px", overflow: "hidden" }, { height: "0px", overflow: "hidden" }], { duration: 420, easing: ease });
        anim.onfinish = () => { d.open = false; anim = null; };
      } else {
        d.open = true;
        anim = a.animate([{ height: "0px", overflow: "hidden" }, { height: a.offsetHeight + "px", overflow: "hidden" }], { duration: 520, easing: ease });
        anim.onfinish = () => { anim = null; };
      }
    });
  });
}

/* --------------------------------------------------------------------------
   10 · Revelações: blocos (fade-up), grupos em cascata, títulos por linha
   -------------------------------------------------------------------------- */
function revelacoes() {
  // blocos [data-reveal] — ao terminar, o atributo sai (o CSS deixa de esconder) e o CSS reassume
  $$("[data-reveal]").forEach(el => {
    const escala = el.dataset.reveal === "scale";
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => gsap.fromTo(el,
        escala ? { opacity: 0, scale: 0.94 } : { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "expo.out",
          onComplete: () => { el.removeAttribute("data-reveal"); gsap.set(el, { clearProps: "transform,opacity" }); }
        })
    });
  });

  // grupos [data-stagger]: filhos em cascata; os cartões de plano sobem em 3D
  $$("[data-stagger]").forEach(grupo => {
    const filhos = Array.from(grupo.children);
    if (!filhos.length) return;
    const planos = grupo.classList.contains("plans");
    let faltam = filhos.length;
    const pronto = el => {
      // enquanto o grupo não termina, o CSS (.js [data-stagger] > *) ainda desce os filhos 40px e os
      // esconde: quem já entrou segura transform NEUTRO e opacity:1 inline (limpar o transform aqui
      // devolvia o item 40px para baixo, por cima do vizinho). No fim do grupo, tudo volta ao CSS.
      gsap.set(el, { y: 0, rotationX: 0, opacity: 1 });
      if (--faltam === 0) {
        grupo.removeAttribute("data-stagger");
        gsap.set(filhos, { clearProps: "transform,opacity" });
      }
    };
    ScrollTrigger.batch(filhos, {
      start: planos ? "top 90%" : "top 90%", once: true,
      onEnter: lote => gsap.fromTo(lote,
        planos ? { y: 80, rotationX: 30, opacity: 0, transformPerspective: 1200, transformOrigin: "50% 100%" } : { y: 40, opacity: 0 },
        {
          y: 0, rotationX: 0, opacity: 1,
          duration: planos ? 1.4 : 1.1, ease: "expo.out",
          stagger: { each: planos ? 0.12 : 0.08, onComplete() { pronto(this.targets()[0]); } }
        })
    });
  });
}

function titulos() {
  const els = $$("[data-split]");
  if (!els.length) return;
  if (!SplitText) { els.forEach(el => el.removeAttribute("data-split")); return; }
  const parte = () => els.forEach(el => seguro("split", () => {
    SplitText.create(el, {
      type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
      onSplit(self) {
        el.style.opacity = "1";
        return gsap.from(self.lines, {
          yPercent: 110, rotate: 2, duration: 1.1, ease: "expo.out", stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onComplete() {
            // título volta a ser texto puro (sem wrappers de linha para o resto da vida da página)
            self.revert();
            el.removeAttribute("data-split");
            el.style.opacity = "";
          }
        });
      }
    });
  }));
  // divide com a fonte final (linhas certas); a espera nunca passa de 1,2 s
  let feito = false;
  const vai = () => { if (feito) return; feito = true; parte(); ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(vai);
  setTimeout(vai, 1200);
}

/* --------------------------------------------------------------------------
   11 · Hero: progresso de saída, entrada dos ícones, cena 3D
   -------------------------------------------------------------------------- */
function heroScroll() {
  const hero = $(".hero");
  if (!hero) return;
  const copy = $(".hero__copy", hero);
  const stage = $("#heroStage");
  const desk = mq("(min-width: 900px)");
  /* Geometria medida no refresh (nada de leitura de layout por quadro):
     o palco é empurrado para baixo a K da rolagem (na tela ele anda mais devagar que a página e
     fica apresentando o Wi-Fi) até os pés encostarem no fim do hero; depois sobe com a página.
     Nunca esmaece, encolhe nem desfoca (pedido do dono, 25/09) e a máscara do texto não pega o palco. */
  const K = 0.6;
  const G = { copyTop: 0, cap: 0, sA: 1, sB: 1, desk: false };
  const mede = () => {
    const sy = window.scrollY;
    const ht = hero.getBoundingClientRect().top + sy;
    if (copy) G.copyTop = copy.getBoundingClientRect().top + sy - ht + 40 * S.heroP;
    G.desk = desk.matches && !!stage;
    if (!G.desk) return;
    // retângulo sem o translate do scrub (offset* ignoram transformações)
    let top = 0, el = stage;
    while (el && el !== hero) { top += el.offsetTop; el = el.offsetParent; }
    const hh = parseFloat(getComputedStyle(doc).getPropertyValue("--header-h")) || 72;
    G.cap = Math.max(0, hero.offsetHeight - (top + stage.offsetHeight) - 8);   // pés nunca saem da caixa do hero
    // a apresentação (giro para a oferta, ondas crescendo) termina um pouco antes de as orelhas
    // chegarem ao header; daí em diante ele só acompanha a página, inteiro e 100% visível
    const livre = top - hh * 0.45;
    const chega = K * (livre / (1 - K)) <= G.cap ? livre / (1 - K) : livre + G.cap;
    G.sA = Math.max(chega - clamp(chega * 0.5, 90, 160), 120);
    // braço (joinha): completa em ~55% da rolagem que leva a MÃO no alto (≈ 28% da altura do Milo)
    // até o header. Assim o gesto inteiro acontece com ele na tela e o joinha fica um bom trecho
    // segurado antes de a página levá-lo para cima.
    const mao = top + stage.offsetHeight * 0.28 - hh;
    const sMao = K * (mao / (1 - K)) <= G.cap ? mao / (1 - K) : mao + G.cap;
    G.sB = Math.max(sMao * 0.55, 140);
  };
  // as variáveis do scrub vão DIRETO para quem as usa (registradas sem herança no CSS): gravadas no
  // .hero, a herança recalculava o estilo do hero inteiro a cada quadro de rolagem
  const usamP = [copy, ...$$(".bgv--hero picture, .bgv--hero .bgv__video", hero),
    $(".hero__scroll", hero), $(".hero__milo", hero)].filter(Boolean);
  const sombra = $(".hero__shadow", hero);
  const pv = (el, nome, v) => {
    if (!el) return;
    const k = "_" + nome;
    if (el[k] !== v) { el[k] = v; el.style.setProperty(nome, v); }
  };
  const aplica = (p, dist) => {
    S.heroP = p;
    const s = p * dist;
    let mp;
    if (G.desk) {
      // apresentação: gira para a oferta, sobe um pouco, ondas crescem (scrub reversível).
      // Pedido do dono (25/09): o Milo NUNCA some ao rolar. Sem esmaecer, sem encolher, sem desfoque:
      // o palco anda mais devagar que a página (parallax leve) até os pés encostarem no fim do
      // hero e depois sobe junto com ela, inteiro, até sair naturalmente pelo topo da tela.
      mp = clamp(s / G.sA, 0, 1);
      S.bracoP = clamp(s / G.sB, 0, 1);
      pv(stage, "--stage-y", Math.min(K * s, G.cap).toFixed(1) + "px");
    } else {
      mp = clamp(p / 0.45, 0, 1);
    }
    S.miloP = mp;
    const hp = p.toFixed(4);
    usamP.forEach(el => pv(el, "--hero-p", hp));
    pv(sombra, "--milo-p", mp.toFixed(4));
    // borda onde o TEXTO some sob o header (máscara só no .hero__copy, coordenadas dele)
    pv(copy, "--copy-cut", (s - G.copyTop + 40 * p).toFixed(1) + "px");
    hero.classList.toggle("is-saindo", p > 0.002);
    // o mesmo progresso (scrub reversível) move o Milo e o halo de fibra
    if (S.milo) { S.milo.setProgress(progMilo()); S.milo.setArm(S.bracoP); }
    if (G.desk && S.rig2d) S.rig2d.set(S.bracoP);     // desktop sem WebGL: o rig 2D segue a mesma rolagem
    if (S.heroCena) S.heroCena.setProgress(p);
  };
  ScrollTrigger.create({
    trigger: hero, start: "top top", end: "bottom top",
    onUpdate: s => aplica(s.progress, s.end - s.start),
    onRefresh: s => { mede(); aplica(s.progress, s.end - s.start); }
  });
  // (os ícones 3D surgem pela órbita — ver orbita(); no celular nada nasce invisível)
  new IntersectionObserver(([e]) => {
    S.heroVisivel = e.isIntersecting;
    ajustaCenaHero();
  }).observe(hero);
}
/* progresso entregue ao milo3d: SÓ a apresentação, 0 → .5 (giro para a oferta, sobe/aproxima de leve,
   ondas mais fortes). Nunca passa de .5: a faixa de saída do módulo (.5 → 1: sobe mais, escala e
   esmaece) não é mais usada, o Milo fica 100% visível (ver _dev/MILO-INTEGRACAO.md, "Ajustes 25/09"). */
const MILO_P_MAX = 0.5;
const progMilo = () => clamp(S.miloP, 0, 1) * MILO_P_MAX;

function ajustaCenaHero() {
  const ativo = S.heroVisivel && !document.hidden;
  [S.heroCena, S.milo].forEach(c => {
    if (!c) return;
    try { ativo ? c.resume() : c.pause(); } catch (e) { /* ok */ }
  });
}

function cenaHero() {
  const hero = $(".hero");
  const canvas = $("#heroFiber");
  // sem a cena 3D o buquê SVG estático reaparece (no desktop ele nasce escondido à espera dela)
  const semFibra = () => hero && hero.classList.add("no-fiber");
  if (!hero || !canvas || !MOVIMENTO || ENV.saveData) return semFibra();
  if (window.innerWidth < 900 || !temWebGL()) return semFibra();
  depoisDoLoad(async () => {
    try {
      const m = await import("./hero-fiber.js");
      // halo ATRÁS do Milo: a origem fica atrás dos quadris dele (o canvas anda junto com o palco)
      const milo = $(".hero__milo");
      const cena = await m.initHeroFiber(canvas, {
        quality: ENV.fraco ? "low" : "high",
        ...(milo ? { anchor: milo, anchorScale: 0.7 } : {})
      });
      if (!cena) return semFibra();
      S.heroCena = cena;
      cena.setProgress(S.heroP);
      // init já desenhou o 1º quadro: troca o buquê SVG pelo canvas (fade no CSS)
      hero.classList.add("has-fiber");
      ajustaCenaHero();
    } catch (e) {
      console.warn("[hero-fiber] cena 3D indisponível — buquê estático", e);
      semFibra();
    }
  });
}

/* --------------------------------------------------------------------------
   11b · Milo no hero (SPEC §10): o <img> 2D oficial já está pintado; a malha 2.5D
         (js/milo3d.js) carrega como o hero-fiber (depois do load, só desktop com WebGL,
         sem reduced-motion/Save-Data) e entra com crossfade quando avisa onReady.
         Qualquer falha = fica o Milo 2D (com flutuação e ondas em CSS).
   -------------------------------------------------------------------------- */
function cenaMilo() {
  const stage = $("#heroStage");
  const canvas = $("#milo3d");
  const img = $("#miloImg");
  // sem a cena 2.5D o <img> volta a respirar em CSS (no desktop ele nasce parado à espera da malha)
  // sem a malha 2.5D: o Milo 2D respira em CSS e, com movimento, vira o rig 2D (levanta o braço e faz joinha)
  const doisD = () => { if (stage) { stage.classList.add("milo-2d"); seguro("miloRig2D", miloRig2D); } };
  if (!stage || !canvas || !MOVIMENTO || ENV.saveData) return doisD();
  if (window.innerWidth < 900 || !temWebGL()) return doisD();
  depoisDoLoad(async () => {
    let cena = null, pronto = false, avisou = false;
    const desiste = e => {
      if (e) console.warn("[milo3d] cena 2.5D indisponível — fica o Milo 2D", e);
      doisD();
      stage.classList.remove("has-milo3d");
      try { if (cena) cena.dispose(); } catch (err) { /* ok */ }
      if (S.milo === cena) S.milo = null;
      cena = null;
    };
    // crossfade: o canvas aparece e o <img> sai (CSS .has-milo3d)
    const troca = () => {
      if (pronto || !cena || S.milo !== cena) return;
      pronto = true;
      stage.classList.add("has-milo3d");
    };
    try {
      const m = await import("./milo3d.js?v=r6");
      if (!m || typeof m.initMilo !== "function") throw new Error("milo3d.js sem initMilo");
      cena = await m.initMilo(canvas, {
        quality: ENV.fraco ? "low" : "high",
        // enquadra sobre o <figure> (mesma caixa do <img>, mas sem a flutuação CSS do 2D)
        fit: img ? img.closest(".hero__milo") || img : null,
        src: (img && (img.currentSrc || img.src)) || "media/milo/milo-wifi.webp",
        onReady: () => { avisou = true; troca(); }   // pode vir antes de o init resolver
      });
      if (!cena) throw new Error("initMilo sem retorno");
      S.milo = cena;
      cena.setProgress(progMilo());
      cena.setArm(S.bracoP);
      ajustaCenaHero();
      if (avisou) troca();
      // rede de segurança: sem onReady em 6 s, desliga a cena e fica o 2D
      setTimeout(() => { if (!pronto && cena && S.milo === cena) desiste(new Error("onReady não chegou")); }, 6000);
    } catch (e) { desiste(e); }
  }, 900);
}

/* --------------------------------------------------------------------------
   11c · Milo 2D ARTICULADO (celular < 900px e desktop sem WebGL): as camadas do rig
         (media/milo/rig/m/, ~75 KB, carregadas só perto da tela) empilhadas em <img> com
         transform-origin nos pivôs do rig.json. Rolando, ele levanta o braço e faz joinha
         (mesma pose e mesma troca com "pop" do js/milo3d.js, via js/milo-rig.js). Em repouso
         as camadas compõem exatamente o Milo da arte; o <img> original só sai quando todas
         estão decodificadas. Reduced-motion / sem JS / Save-Data: fica o <img> parado.
   -------------------------------------------------------------------------- */
function miloRig2D() {
  if (S.rig2d || !MOVIMENTO || ENV.saveData) return;
  const stage = $("#heroStage");
  const fig = stage && $(".hero__milo", stage);
  const img = $("#miloImg");
  if (!fig || !img) return;
  const R = { alvo: 0, aO: 0, aC: 0, joinha: false, desde: 99, raf: 0, ultimo: 0, pronto: false, set: a => { R.alvo = clamp(+a || 0, 0, 1); R.anda(); }, anda: () => {} };
  S.rig2d = R;
  const desk = () => window.innerWidth >= 900;

  // topo do Milo no documento, sem o transform do scrub (offset* ignoram transformações)
  const topoFig = () => { let t = 0, el = fig; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };
  // celular: o gesto acompanha o próprio Milo na tela (ele fica abaixo dos CTAs): começa quando
  // ele entra e o joinha fica pronto com ele no terço de cima, segurado até sair (reversível)
  if (!desk()) {
    ScrollTrigger.create({
      // (preso ≥ 0: em telas altas, como o tablet, ele já nasce na tela e o braço começa parado)
      trigger: fig, invalidateOnRefresh: true,
      start: () => Math.max(0, topoFig() - innerHeight * 0.66),
      end: () => Math.max(0, topoFig() - innerHeight * 0.66) + innerHeight * 0.46,
      onUpdate: st => R.set(st.progress),
      onRefresh: st => R.set(st.progress)
    });
  }

  const monta = async () => {
    const { carregaRig, pop, GESTO } = await import("./milo-rig.js?v=r6");
    const rig = await carregaRig();
    const W = rig.w, H = rig.h, pc = rig.pecas;
    const pct = (v, t) => (v / t * 100).toFixed(4) + "%";
    const m = n => rig.url(n).replace(/\/rig\/([^/?]+)(\?|$)/, "/rig/m/$1$2");   // versões leves (make_mobile.py)
    // caixa inteira da peça na tela 480x600 das camadas leves: MESMA fórmula do
    // _dev/render/milo-rig/make_mobile.py (corpo e peças na mesma grade de pixels)
    const MW = 480, MH = 600, FX = MW / W, FY = MH / H;
    const camada = (n, cls, x0, y0) => {
      const w = n === "body" ? W : pc[n].w, h = n === "body" ? H : pc[n].h;
      const X0 = n === "body" ? 0 : Math.max(0, Math.floor(x0 * FX) - 2), Y0 = n === "body" ? 0 : Math.max(0, Math.floor(y0 * FY) - 2);
      const X1 = n === "body" ? MW : Math.min(MW, Math.ceil((x0 + w) * FX) + 2), Y1 = n === "body" ? MH : Math.min(MH, Math.ceil((y0 + h) * FY) + 2);
      const e = new Image();
      e.className = cls; e.alt = ""; e.decoding = "async"; e.draggable = false;
      e.width = X1 - X0; e.height = Y1 - Y0;
      Object.assign(e.style, { left: pct(X0, MW), top: pct(Y0, MH), width: pct(X1 - X0, MW), height: pct(Y1 - Y0, MH) });
      e.src = m(n);
      e.caixa = [X0, Y0, X1, Y1];
      return e;
    };
    const junta = (cls, [x, y]) => {
      const d = document.createElement("div");
      d.className = "rig__j " + cls;
      d.style.transformOrigin = `${pct(x, W)} ${pct(y, H)}`;
      return d;
    };
    const raiz = document.createElement("div");
    raiz.className = "hero__rig";
    raiz.setAttribute("aria-hidden", "true");
    const corpo = camada("body", "rig__body", 0, 0);
    const ombro = junta("rig__ombro", rig.ombro), cotovelo = junta("rig__cotovelo", rig.cotovelo);
    const punho = junta("rig__punho", rig.punho), pata = junta("rig__pata", rig.punho);
    const [Px, Py] = rig.punho, [ax, ay] = rig.ancoraJoinha;
    const joinha = camada("paw-thumbsup", "rig__joinha", Px - ax, Py - ay);
    {  // a pata de joinha gira/escala em volta da âncora (o punho), dentro da caixa dela
      const [X0, Y0, X1, Y1] = joinha.caixa;
      joinha.style.transformOrigin = `${pct(Px * FX - X0, X1 - X0)} ${pct(Py * FY - Y0, Y1 - Y0)}`;
    }
    pata.append(camada("paw-rest", "", pc["paw-rest"].rest.x, pc["paw-rest"].rest.y));
    punho.append(pata, joinha);                                            // ordem: pata, antebraço, braço
    cotovelo.append(punho, camada("forearm", "", pc.forearm.rest.x, pc.forearm.rest.y));
    ombro.append(cotovelo, camada("upperarm", "", pc.upperarm.rest.x, pc.upperarm.rest.y));
    // corpo LIMPO junto da pata (sem a sombra dela na cauda): entra quando o braço sai do repouso
    const patch = pc["body-patch"] ? camada("body-patch", "rig__patch", pc["body-patch"].rest.x, pc["body-patch"].rest.y) : null;
    if (patch) patch.style.opacity = "0";
    raiz.append(...(patch ? [corpo, patch, ombro] : [corpo, ombro]));
    const imgs = $$("img", raiz);

    // pose → transforms (ângulos do rig no sentido do CSS rotate: aplicam direto)
    const aplica = dt => {
      const kO = 1 - Math.exp(-dt * 7.5), kC = 1 - Math.exp(-dt * 5.2);   // ombro na frente, cotovelo "vem atrás"
      R.aO += (R.alvo - R.aO) * kO;
      R.aC += (R.alvo - R.aC) * kC;
      const pO = rig.pose(R.aO), pC = rig.pose(R.aC);
      const quer = R.joinha ? R.aC > GESTO.troca - GESTO.histerese : R.aC >= GESTO.troca;
      if (quer !== R.joinha) { R.joinha = quer; R.desde = dt ? 0 : 99; raiz.classList.toggle("is-joinha", quer); }
      else R.desde += dt;
      const pp = pop(R.desde, !R.joinha);
      const gb = pO.braco, ga = pC.antebraco, gp = pC.pata;
      if (patch) patch.style.opacity = rig.patch(Math.max(R.aO, R.aC)).toFixed(3);
      ombro.style.transform = `rotate(${gb.toFixed(2)}deg)`;
      cotovelo.style.transform = `rotate(${(ga - gb).toFixed(2)}deg)`;
      punho.style.transform = `rotate(${(gp - ga).toFixed(2)}deg)`;
      if (R.joinha) {
        joinha.style.transform = `rotate(${(rig.giroJoinha(ga) + pp.g).toFixed(2)}deg) scale(${pp.s.toFixed(4)})`;
        pata.style.transform = "";
      } else {
        pata.style.transform = pp.s !== 1 ? `rotate(${pp.g.toFixed(2)}deg) scale(${pp.s.toFixed(4)})` : "";
      }
      // em repouso fica o <img> ORIGINAL (pixels exatos da arte); o rig só aparece quando o braço
      // se mexe, então a troca de camadas (reamostragem do navegador) nunca é vista parada
      if (R.pronto) stage.classList.toggle("has-rig", R.aO > 0.002 || R.aC > 0.002 || R.joinha);
      return Math.abs(R.alvo - R.aO) > 1e-4 || Math.abs(R.alvo - R.aC) > 1e-4 || R.desde < 0.6;
    };
    const quadro = t => {
      R.raf = 0;
      const dt = R.ultimo ? Math.min((t - R.ultimo) / 1000, 0.05) : 1 / 60;
      R.ultimo = t;
      if (aplica(dt)) R.raf = requestAnimationFrame(quadro);
      else R.ultimo = 0;
    };
    R.anda = () => { if (!R.raf) R.raf = requestAnimationFrame(quadro); };
    R.aO = R.aC = R.alvo;
    aplica(0);

    // entra só com TODAS as camadas decodificadas (e só aparece quando o braço sai do repouso)
    fig.insertBefore(raiz, $("canvas", fig) || null);
    await Promise.all(imgs.map(e => (e.decode ? e.decode() : Promise.resolve()).catch(() => { throw new Error("camada do rig"); })));
    // a respiração em CSS do rig começa em fase com a do <img> (sem salto na troca)
    try {
      const [aImg] = img.getAnimations ? img.getAnimations() : [];
      const [aRig] = raiz.getAnimations ? raiz.getAnimations() : [];
      if (aImg && aRig) aRig.startTime = aImg.startTime;
    } catch (e) { /* ok */ }
    R.pronto = true;
    aplica(0);
    R.anda();
  };
  // só perto da tela (no celular o Milo fica abaixo dos CTAs) e depois do load
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    depoisDoLoad(() => monta().catch(err => {
      console.warn("[milo] rig 2D indisponível, fica o Milo parado da arte", err);
      stage.classList.remove("has-rig");
      const r = $(".hero__rig", fig); if (r) r.remove();
      S.rig2d = null;
    }), 800);
  }, { rootMargin: "300px 0px" });
  io.observe(fig);
}

/* ícones 3D orbitando o Milo: anel quase horizontal na altura da BARRIGA dele (pedido do dono, 25/09):
   cruza na frente do corpo e volta por TRÁS dele, longe do rosto e do roteador; a rolagem gira o anel
   e o acompanha na subida da apresentação (scrub reversível). */
function orbita() {
  const stage = $("#heroStage");
  if (!stage) return;
  const orbs = $$(".hero__orb", stage);
  if (!orbs.length) return;
  const desk = mq("(min-width: 900px)");
  const TAU = Math.PI * 2;
  const O = {
    stage, on: false, w: 0, h: 0, t: 0, intro: 0,
    itens: orbs.map((el, i) => ({ el, i, a0: (i / orbs.length) * TAU + 0.35, front: null }))
  };
  const mede = () => { O.w = stage.offsetWidth; O.h = stage.offsetHeight; };
  const liga = () => {
    O.on = desk.matches;
    // 1ª posição já calculada (invisível) ANTES de a classe mudar o layout: nada pula nem pisca
    if (O.on) { mede(); passoOrbita(O, 0, S.ptr); }
    stage.classList.toggle("is-orbit", O.on);
    if (!O.on) O.itens.forEach(it => { it.el.style.transform = ""; it.el.style.opacity = ""; it.el.classList.remove("is-front"); it.front = null; });
    mede();
  };
  if ("ResizeObserver" in window) new ResizeObserver(mede).observe(stage);
  desk.addEventListener ? desk.addEventListener("change", liga) : desk.addListener(liga);
  liga();
  S.orbita = O;
}

/* Anel em volta do corpo na altura da BARRIGA (≈ 55–62% da altura do Milo, a partir do topo),
   visto quase de lado e levemente inclinado (~6°, lado do roteador um pouco mais baixo):
   - metade da FRENTE (z > 0): passa diante da barriga (y ≈ cy + ry), no tamanho cheio, com o
     desfoque de "perto da câmera" (classe .is-front, z-index acima do Milo);
   - metade de TRÁS (z < 0): passa atrás do corpo (y ≈ cy − ry), menor, mais apagada e levemente
     desfocada (z-index abaixo do Milo: o próprio Milo esconde o ícone na travessia).
   Nenhum ícone chega ao rosto (12–40%) nem ao roteador (canto superior esquerdo): as pontas do anel
   ficam fora da silhueta e, por garantia, um ícone de trás que passe perto do roteador some suave.
   Coordenadas em frações do palco (arte 770x962); o centro do anel segue o eixo do corpo (x ≈ .56). */
const ORB = {
  fi: -6 * Math.PI / 180,   // inclinação do anel (lado esquerdo, o do roteador, um pouco mais baixo)
  cx: 0.06,                 // deslocamento do centro em relação ao meio do palco (eixo do corpo)
  rx: 0.62, ry: 0.032,      // raio horizontal (fração da largura) e "altura" do anel visto de lado
  cy: 0.56,                 // altura da barriga, fração do palco a partir do topo (a frente passa em ≈ .57–.61)
  sobe: 0.03,               // o anel sobe junto com o Milo na apresentação (milo3d sobe ~5,5% mas aproxima 6%)
  rot: [-0.04, 0.14, 0.40, 0.50]   // retângulo do roteador + mão (x0, y0, x1, y1)
};
function passoOrbita(O, dt, p) {
  O.t += dt;
  // entrada suave depois do texto (0,5 s de espera, 1,6 s de fade)
  O.intro = clamp((O.t - 0.5) / 1.6, 0, 1);
  const hp = S.miloP;
  const ang = O.t * (Math.PI * 2 / 64) + hp * 2.4;
  const rx = O.w * (ORB.rx + hp * 0.03);
  const ry = O.h * ORB.ry;
  const cx = O.w * ORB.cx;
  const cy = O.h * (ORB.cy - hp * ORB.sobe);
  const cf = Math.cos(ORB.fi), sf = Math.sin(ORB.fi);
  const ease = O.intro * O.intro * (3 - 2 * O.intro);
  const faixa = O.w * 0.24;                        // meia largura do corpo na altura da barriga
  const [rx0, ry0, rx1, ry1] = ORB.rot;
  // braço no meio do gesto: a manga cruza a faixa da órbita do lado direito (x ≈ .62–.88 do palco);
  // o ícone da FRENTE que passa ali fica menor e mais transparente (não tampa o antebraço).
  const lis = (t, a, b) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const gB = lis(S.bracoP || 0, 0.03, 0.1) * (1 - lis(S.bracoP || 0, 0.82, 0.94));
  for (const it of O.itens) {
    const th = it.a0 + ang;
    const z = Math.sin(th);                        // +1 = na frente do Milo, -1 = atrás
    const prof = (z + 1) / 2;
    const X = Math.cos(th) * rx, Y = z * ry;
    const xb = cx + X * cf - Y * sf;
    const yb = cy + X * sf + Y * cf;
    const x = xb + p.x * 16 * (0.6 + prof);
    const y = yb + Math.sin(O.t * 0.9 + it.i * 1.7) * 6 + p.y * 10 * (0.6 + prof);
    // travessia na frente da barriga: um pouco menor e mais leve (acompanha, não "tampa" o personagem)
    const ax = Math.abs(xb - cx);
    const perto = z > 0 ? z * (ax >= faixa ? 0 : 1 - ax / faixa) : 0;
    // atrás do roteador (retângulo da arte + margem do ícone): some suavemente
    let vis = 1;
    if (z < 0.1) {
      const fx = xb / O.w + 0.5, fy = yb / O.h;
      const dx = Math.max(rx0 - fx, 0, fx - rx1), dy = Math.max(ry0 - fy, 0, fy - ry1);
      const d = Math.hypot(dx, dy);
      vis = clamp(d / 0.07, 0, 1);
      vis = vis * vis * (3 - 2 * vis);
    }
    // profundidade: atrás = menor (70%) e mais apagado; na frente = tamanho cheio
    const fxb = xb / O.w + 0.5;
    const braco = z > 0 && gB > 0 ? gB * z * lis(1 - Math.abs(fxb - 0.75) / 0.13, 0, 1) : 0;
    const sc = (0.7 + 0.3 * prof) * (0.9 + 0.1 * ease) * (1 - 0.12 * perto) * (1 - 0.22 * braco);
    const rot = Math.sin(O.t * 0.6 + it.i) * 5;
    it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
    it.el.style.opacity = ((0.72 + 0.28 * prof) * (1 - 0.15 * perto) * (1 - 0.45 * braco) * vis * ease).toFixed(3);
    const frente = it.front ? z > -0.1 : z > 0.1;  // histerese: não pisca na travessia
    if (frente !== it.front) { it.front = frente; it.el.classList.toggle("is-front", frente); }
  }
}

/* --------------------------------------------------------------------------
   12 · Ponteiro: parallax (data-depth), tilt + spotlight, magnéticos
   -------------------------------------------------------------------------- */
function ponteiro() {
  if (!ENV.fino) return;
  window.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    S.ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    S.ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    S.ptr.ativo = true;
  }, { passive: true });
  doc.addEventListener("pointerleave", () => { S.ptr.tx = 0; S.ptr.ty = 0; });

  // parallax dos ícones 3D e do Milo (--dx/--dy; o CSS compõe com a flutuação idle)
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { const a = en.target.__prof; if (a) a.vis = en.isIntersecting; });
  }, { rootMargin: "100px 0px" });
  $$("[data-depth]").forEach(el => {
    const a = { el, d: parseFloat(el.dataset.depth) || 0.5, vis: false, x: 0, y: 0 };
    el.__prof = a;
    S.profundidade.push(a);
    io.observe(el);
  });

  // tilt 3D + spotlight nos cartões de plano
  $$("[data-tilt]").forEach(el => {
    el.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      el.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
      el.style.setProperty("--ry", (x * 6).toFixed(2) + "deg");
      el.style.setProperty("--mx", ((x + 1) * 50).toFixed(1) + "%");
      el.style.setProperty("--my", ((y + 1) * 50).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
  // só spotlight
  $$("[data-spot]").forEach(el => {
    el.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    });
  });

  // botões magnéticos: atração de até 8px, soltura com mola (propriedade translate, não transform)
  $$("[data-magnetic]").forEach(el => {
    const m = { el, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    el.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      m.tx = clamp(dx, -1, 1) * 8;
      m.ty = clamp(dy, -1, 1) * 6;
      S.imas.add(m);
    });
    el.addEventListener("pointerleave", () => { m.tx = 0; m.ty = 0; S.imas.add(m); });
  });
}

/* --------------------------------------------------------------------------
   13 · Marquees: inclinação e velocidade pela rolagem
   -------------------------------------------------------------------------- */
function marquees() {
  const faixa = $("#marquee");
  if (faixa) {
    const anims = $$(".marquee__track", faixa).map(t => (t.getAnimations ? t.getAnimations()[0] : null)).filter(Boolean);
    S.marquee = { el: faixa, vis: false, anims, skew: 0, rate: 1 };
    new IntersectionObserver(([e]) => { S.marquee.vis = e.isIntersecting; }).observe(faixa);
  }
  const parede = $("#wall");
  if (parede) {
    const anims = $$(".wall__track", parede).map(t => (t.getAnimations ? t.getAnimations()[0] : null)).filter(Boolean);
    S.parede = { vis: false, anims, rate: 1 };
    new IntersectionObserver(([e]) => { S.parede.vis = e.isIntersecting; }).observe(parede);
  }
}

/* --------------------------------------------------------------------------
   14 · Cobertura: fibras se desenham, bairros acendem, pulsos correm
   -------------------------------------------------------------------------- */
function mapa() {
  const box = $("#mapa");
  if (!box) return;
  const fibras = $$(".map__fiber", box).sort((a, b) => +a.dataset.edge - +b.dataset.edge);
  const nos = new Map($$(".map__node", box).map(n => [n.dataset.node, n]));
  if (!fibras.length) return;
  const DUR = 1, PASSO = 0.5;
  const total = (fibras.length - 1) * PASSO + DUR;
  // cada bairro acende quando a 1ª fibra que chega nele termina de desenhar
  const acende = new Map();
  fibras.forEach((f, i) => {
    const ini = i * PASSO, fim = ini + DUR;
    const marcaNo = (id, t) => { if (nos.has(id) && !(acende.get(id) <= t)) acende.set(id, t); };
    marcaNo(f.dataset.to, fim);
    marcaNo(f.dataset.from, ini + 0.02);
  });
  const ultimo = fibras.map(() => -1);
  const acesos = new Map();
  let desenhado = null;
  const suave = t => t * t * (3 - 2 * t);
  const render = t => {
    fibras.forEach((f, i) => {
      const k = suave(clamp((t - i * PASSO) / DUR, 0, 1));
      const off = +(1 - k).toFixed(4);
      if (off !== ultimo[i]) { ultimo[i] = off; f.style.strokeDashoffset = off; }
    });
    acende.forEach((tAcende, id) => {
      const on = t >= tAcende;
      if (acesos.get(id) !== on) { acesos.set(id, on); nos.get(id).classList.toggle("is-lit", on); }
    });
    const tudo = t >= total - 0.001;
    if (tudo !== desenhado) { desenhado = tudo; box.classList.toggle("is-drawn", tudo); }
  };
  const o = { t: 0 };
  render(0);
  gsap.to(o, {
    t: total, ease: "none",
    scrollTrigger: { trigger: box, start: "top 78%", end: "center 42%", scrub: 0.8 },
    onUpdate: () => render(o.t)
  });

  // celular: os pulsos do mapa repintam o SVG a cada quadro. Com a pessoa parada lendo (8 s sem
  // rolar nem tocar), eles "assentam" (.is-calmo pausa os loops); qualquer gesto os acorda.
  if (!ENV.hover) {
    let t = 0;
    const acorda = () => {
      if (box.classList.contains("is-calmo")) box.classList.remove("is-calmo");
      clearTimeout(t);
      t = setTimeout(() => box.classList.add("is-calmo"), 8000);
    };
    ["scroll", "pointerdown", "touchmove"].forEach(ev => window.addEventListener(ev, acorda, { passive: true }));
    acorda();
  }
}

/* --------------------------------------------------------------------------
   15 · TV e Streaming: parede de pôsteres, pilha de telas, parallax data-speed
   -------------------------------------------------------------------------- */
function watch() {
  const parede = $("#wall");
  if (parede) {
    gsap.fromTo(parede, { "--t": 1 }, {
      "--t": 0, ease: "none",
      scrollTrigger: { trigger: parede, start: "top bottom", end: "center center", scrub: 0.6 }
    });
  }
  const cartoes = $$(".wstack[data-stack] .wcard");
  cartoes.forEach(c => {
    const i = parseFloat(getComputedStyle(c).getPropertyValue("--i")) || 0;
    gsap.fromTo(c, { "--p": 0 }, {
      "--p": 1, ease: "none",
      scrollTrigger: {
        trigger: c,
        // lado a lado no desktop: o de trás pousa depois (cartão i começa e termina mais tarde)
        start: () => (window.innerWidth >= 900 ? `top+=${i * 50} bottom` : "top bottom"),
        end: () => (window.innerWidth >= 900 ? `top+=${i * 50} 45%` : "top 55%"),
        scrub: 0.6, invalidateOnRefresh: true
      }
    });
  });
  // parallax vertical por data-speed (com inércia do scrub)
  $$("[data-speed]").forEach(el => {
    const v = parseFloat(el.dataset.speed) || 0;
    if (!v) return;
    gsap.fromTo(el, { y: () => -0.5 * window.innerHeight * v }, {
      y: () => 0.5 * window.innerHeight * v, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1, invalidateOnRefresh: true }
    });
  });
}

/* --------------------------------------------------------------------------
   16 · Benefícios: o roteador Wi-Fi 6 se monta com a rolagem (pin + scrub)
   -------------------------------------------------------------------------- */
function beneficios() {
  const sec = $("#beneficios");
  if (!sec || !MOVIMENTO || ENV.saveData || !temWebGL()) return;   // senão: estático (imagem + 6 cartões)
  const pin = $(".b6__pin", sec);
  const canvas = $("#wifi6", sec);
  const viz = $(".b6__viz", sec);
  const cartoes = $$(".bcard[data-step]", sec).sort((a, b) => +a.dataset.step - +b.dataset.step);
  const cur = $("#b6Cur");
  if (!pin || !canvas || cartoes.length !== 6) return;

  let STEPS = [0.06, 0.22, 0.38, 0.54, 0.70, 0.86];
  let cena = null, ativo = -1, prog = 0, visivel = false, desistiu = false;

  sec.classList.add("is-scrub");
  const aplica = p => {
    prog = p;
    if (cena) cena.setProgress(p);
    sec.style.setProperty("--p", p.toFixed(4));
    let i = 0;
    for (let k = 0; k < STEPS.length; k++) if (STEPS[k] <= p) i = k;
    if (i !== ativo) {
      ativo = i;
      cartoes.forEach((c, k) => {
        c.classList.toggle("is-active", k === i);
        c.classList.toggle("is-past", k < i);
      });
      if (cur) cur.textContent = String(i + 1).padStart(2, "0");
    }
  };
  const st = ScrollTrigger.create({
    trigger: pin, pin: true, start: "top top",
    end: () => "+=" + Math.round(window.innerHeight * (window.innerWidth < 900 ? 2.6 : 3.5)),
    anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
    onUpdate: s => aplica(s.progress)
  });
  aplica(0);

  const ajusta = () => { if (!cena) return; (visivel && !document.hidden) ? cena.resume() : cena.pause(); };
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; ajusta(); }).observe(sec);
  document.addEventListener("visibilitychange", ajusta);

  if (viz && ENV.fino) {
    viz.addEventListener("pointermove", e => {
      if (!cena) return;
      const r = viz.getBoundingClientRect();
      cena.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    });
    viz.addEventListener("pointerleave", () => cena && cena.setPointer(0, 0));
  }

  const desiste = e => {
    if (desistiu) return;
    desistiu = true;
    console.warn("[wifi6] cena 3D indisponível — modo estático", e);
    try { if (cena) cena.dispose(); } catch (err) { /* ok */ }
    cena = null;
    st.kill(true);
    sec.classList.remove("is-scrub", "is-3d");
    sec.style.removeProperty("--p");
    cartoes.forEach(c => c.classList.remove("is-past"));
    ScrollTrigger.refresh();
  };

  // o módulo (e o three, no celular) é baixado e interpretado num momento ocioso assim que a pessoa
  // mostra que vai rolar a página (passou da 1ª tela) — longe da seção, sem gastar dados de quem só
  // vê o topo. A cena é montada ~1000px antes de a seção chegar, em fatias curtas (initWifi6 cede a
  // vez entre as etapas e compila os shaders em paralelo): nada disso trava a rolagem.
  let modulo = null;
  const carrega = () => modulo || (modulo = import("./wifi6.js?v=r1"));
  const intencao = () => {
    if (window.scrollY < window.innerHeight * 0.8) return;
    window.removeEventListener("scroll", intencao);
    const vai = () => { carrega().catch(() => {}); };
    window.requestIdleCallback ? requestIdleCallback(vai, { timeout: 2500 }) : setTimeout(vai, 300);
  };
  window.addEventListener("scroll", intencao, { passive: true });
  const perto = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    perto.disconnect();
    try {
      const m = await carrega();
      if (Array.isArray(m.STEPS) && m.STEPS.length === 6) STEPS = m.STEPS.slice();
      cena = await m.initWifi6(canvas, { onReady: () => sec.classList.add("is-3d") });
      if (!cena) throw new Error("initWifi6 sem retorno");
      ativo = -1;
      cena.setProgress(prog, true);
      aplica(prog);
      ajusta();
    } catch (err) { desiste(err); }
  }, { rootMargin: "1000px 0px" });
  perto.observe(sec);
}

/* --------------------------------------------------------------------------
   17 · Casa conectada: galeria horizontal fixada (desktop) / parallax (celular)
   -------------------------------------------------------------------------- */
function experiencia() {
  const sec = $("#experiencia");
  if (!sec) return;
  const vp = $(".exp__viewport[data-hscroll]", sec);
  const track = $(".exp__track", sec);
  const imgs = $$(".exp__panel img[data-inner]", sec);
  if (!vp || !track) return;
  const mm = gsap.matchMedia();

  mm.add("(min-width: 1080px)", () => {
    sec.classList.add("is-hscroll");
    // o recorte lateral já vem do main (overflow-x: clip). overflow:hidden no elemento fixado faz o
    // Chrome contar a entrada/saída do pin como layout shift (CLS ~1,0 medido) — aqui fica visible.
    vp.style.overflow = "visible";
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: vp, pin: true, start: "top top",
        end: () => "+=" + dist(),
        scrub: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1
      }
    });
    // parallax interno das fotos (propriedade translate: não briga com o zoom do hover em transform)
    imgs.forEach(img => ScrollTrigger.create({
      trigger: img.closest(".exp__panel"), containerAnimation: tw,
      start: "left right", end: "right left",
      onUpdate: s => { img.style.translate = (-6 + 12 * s.progress).toFixed(2) + "% 0"; }
    }));
    return () => {
      sec.classList.remove("is-hscroll");
      vp.style.overflow = "";
      imgs.forEach(img => { img.style.translate = ""; });
    };
  });

  mm.add("(max-width: 1079px)", () => {
    imgs.forEach(img => ScrollTrigger.create({
      trigger: img.closest(".exp__panel"), start: "top bottom", end: "bottom top",
      onUpdate: s => { img.style.translate = "0 " + (-5 + 10 * s.progress).toFixed(2) + "%"; }
    }));
    return () => imgs.forEach(img => { img.style.translate = ""; });
  });
}

/* --------------------------------------------------------------------------
   18 · Diferenciais (moeda VS) e CTA final (escala do título)
   -------------------------------------------------------------------------- */
function versus() {
  const v = $("#versus");
  if (!v) return;
  gsap.fromTo(v, { "--vs": 0 }, {
    "--vs": 1, ease: "none",
    scrollTrigger: { trigger: v, start: "top 80%", end: "center 45%", scrub: 0.6 }
  });
}

function final() {
  const f = $(".final");
  if (!f) return;
  // o bloco é centrado na grade com largura "encolhe para caber": com o título dividido em linhas
  // ele ficava mais estreito e alargava ao reverter o SplitText (layout shift). Largura fixa = a do HTML puro.
  const copy = $(".final__copy", f);
  if (copy) copy.style.width = "100%";
  gsap.fromTo(f, { "--s": 0.85 }, {
    "--s": 1, ease: "none",
    scrollTrigger: { trigger: f, start: "top bottom", end: "center center", scrub: 0.6 }
  });
}

/* --------------------------------------------------------------------------
   19 · Vídeos de fundo: fonte certa por orientação, lazy, pausa fora da tela
   -------------------------------------------------------------------------- */
function videos() {
  if (ENV.reduce || ENV.saveData) return;   // só o poster
  const retrato = mq("(orientation: portrait) and (max-width: 900px)").matches;
  const suf = retrato ? "720v" : "1080";
  const todos = [];

  $$(".bgv[data-video]").forEach(box => {
    const v = $("video", box);
    const nome = box.dataset.video;
    if (!v || !nome) return;
    const item = { box, v, carregado: false, naTela: false };
    todos.push(item);
    const tenta = () => {
      if (!item.carregado) return;
      if (item.naTela && !document.hidden) { const pr = v.play(); pr && pr.catch(() => {}); }
      else if (!v.paused) v.pause();
    };
    item.tenta = tenta;
    item.carrega = () => {
      if (item.carregado) return;
      item.carregado = true;
      v.muted = true;
      v.playsInline = true;
      [["webm", "video/webm"], ["mp4", "video/mp4"]].forEach(([ext, type]) => {
        const s = document.createElement("source");
        s.src = `media/video/${nome}-${suf}.${ext}`;
        s.type = type;
        v.appendChild(s);
      });
      v.addEventListener("playing", () => box.classList.add("is-playing"), { once: true });
      v.load();
      tenta();
    };
    // play/pause pela visibilidade
    new IntersectionObserver(([e]) => { item.naTela = e.isIntersecting; tenta(); }).observe(box);
    if (box.classList.contains("bgv--hero")) {
      // celular: o vídeo do hero (1,2 MB, discreto em screen) só vem em 4G bom e aparelho não-fraco,
      // ou depois do 1º gesto da pessoa — quem chega pelo anúncio e só lê a 1ª dobra fica no poster
      const cx = navigator.connection;
      const redeBoa = !cx || !cx.effectiveType || cx.effectiveType === "4g";
      if (!retrato || (redeBoa && !ENV.fraco)) depoisDoLoad(item.carrega);
      else {
        const gesto = () => {
          ["scroll", "pointerdown", "keydown"].forEach(t => window.removeEventListener(t, gesto));
          depoisDoLoad(item.carrega, 800);
        };
        ["scroll", "pointerdown", "keydown"].forEach(t => window.addEventListener(t, gesto, { passive: true, once: true }));
      }
    } else {
      const perto = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        perto.disconnect();
        item.carrega();
      }, { rootMargin: "600px 0px" });
      perto.observe(box);
    }
    if (box.classList.contains("bgv--final")) S.ctaVideo = { v, item, rate: 1 };
  });
  document.addEventListener("visibilitychange", () => todos.forEach(i => i.tenta && i.tenta()));
}

/* --------------------------------------------------------------------------
   20 · O loop único (gsap.ticker): ponteiro com inércia, velocidade do scroll,
        marquee, ímãs e playbackRate do túnel. Só escreve; nenhuma leitura de layout.
   -------------------------------------------------------------------------- */
function loop() {
  const mega = $(".rot__mega");
  const mTilt = { x: 0, y: 0 };
  // posição da rolagem SEM ler o layout a cada quadro: o valor que o Lenis já calculou
  // (window.scrollY aqui forçava recálculo síncrono de estilo depois das escritas do ScrollTrigger)
  let yAtual = window.scrollY;
  if (S.lenis) S.lenis.on("scroll", l => { yAtual = l.animatedScroll; });
  else window.addEventListener("scroll", () => { yAtual = window.scrollY; }, { passive: true });
  let ultimoY = yAtual;
  gsap.ticker.add((tempo, dtMs) => {
    const dt = Math.min(Math.max(dtMs, 1) / 1000, 0.05);

    // velocidade do scroll (px/s) suavizada
    const y = yAtual;
    const inst = (y - ultimoY) / dt;
    ultimoY = y;
    S.vel += (inst - S.vel) * (1 - Math.exp(-dt * 8));
    if (Math.abs(S.vel) < 0.5) S.vel = 0;
    const av = Math.abs(S.vel);

    // ponteiro com inércia
    const p = S.ptr;
    const k = 1 - Math.exp(-dt * 5);
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;

    for (const a of S.profundidade) {
      if (!a.vis) continue;
      const nx = +(-p.x * a.d * CONFIG.parallaxPx).toFixed(2);
      const ny = +(-p.y * a.d * CONFIG.parallaxPx).toFixed(2);
      if (nx !== a.x || ny !== a.y) {
        a.x = nx; a.y = ny;
        a.el.style.setProperty("--dx", nx + "px");
        a.el.style.setProperty("--dy", ny + "px");
      }
    }
    if (S.heroVisivel) {
      if (S.heroCena) S.heroCena.setPointer(p.x, -p.y);
      if (S.milo) S.milo.setPointer(p.x, -p.y);     // inércia já aplicada acima
      if (S.orbita && S.orbita.on) passoOrbita(S.orbita, dt, p);
    }
    // o número gigante acompanha o ponteiro em 3D (leve)
    if (mega && S.heroVisivel && ENV.fino && window.innerWidth >= 900) {
      const rx = +(-p.y * 4).toFixed(2), ry = +(p.x * 6).toFixed(2);
      if (rx !== mTilt.x || ry !== mTilt.y) {
        mTilt.x = rx; mTilt.y = ry;
        mega.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      }
    }

    // faixa: inclina e acelera com a velocidade da rolagem
    const m = S.marquee;
    if (m && m.vis) {
      const alvoSkew = clamp(-S.vel / 260, -8, 8);
      m.skew += (alvoSkew - m.skew) * (1 - Math.exp(-dt * 10));
      const sk = +m.skew.toFixed(2);
      if (sk !== m.lastSkew) { m.lastSkew = sk; m.el.style.setProperty("--skew", sk + "deg"); }
      const rate = 1 + Math.min(av / 500, 3.5);
      m.rate += (rate - m.rate) * (1 - Math.exp(-dt * 6));
      if (Math.abs(m.rate - (m.lastRate || 1)) > 0.01) { m.lastRate = m.rate; m.anims.forEach(an => { an.playbackRate = m.rate; }); }
    } else if (m && (m.lastSkew || (m.lastRate && m.lastRate !== 1))) {
      // saiu da tela: volta ao repouso de uma vez (não fica inclinada/acelerada congelada)
      m.skew = m.lastSkew = 0; m.rate = m.lastRate = 1;
      m.el.style.setProperty("--skew", "0deg");
      m.anims.forEach(an => { an.playbackRate = 1; });
    }
    const w = S.parede;
    if (w && w.vis && w.anims.length) {
      const rate = 1 + Math.min(av / 1400, 1.6);
      w.rate += (rate - w.rate) * (1 - Math.exp(-dt * 5));
      if (Math.abs(w.rate - (w.lastRate || 1)) > 0.01) { w.lastRate = w.rate; w.anims.forEach(an => { an.playbackRate = w.rate; }); }
    } else if (w && w.lastRate && w.lastRate !== 1) {
      w.rate = w.lastRate = 1;
      w.anims.forEach(an => { an.playbackRate = 1; });
    }

    // ímãs (mola levemente subamortecida)
    if (S.imas.size) {
      for (const mg of S.imas) {
        mg.vx += ((mg.tx - mg.x) * 170 - mg.vx * 16) * dt;
        mg.vy += ((mg.ty - mg.y) * 170 - mg.vy * 16) * dt;
        mg.x += mg.vx * dt;
        mg.y += mg.vy * dt;
        const parado = !mg.tx && !mg.ty && Math.abs(mg.x) < 0.05 && Math.abs(mg.y) < 0.05 && Math.abs(mg.vx) < 0.5 && Math.abs(mg.vy) < 0.5;
        if (parado) { mg.x = mg.y = mg.vx = mg.vy = 0; mg.el.style.translate = ""; S.imas.delete(mg); }
        else mg.el.style.translate = `${mg.x.toFixed(2)}px ${mg.y.toFixed(2)}px`;
      }
    }

    // túnel do CTA final acelera um pouco com a rolagem
    const c = S.ctaVideo;
    if (c && c.item.naTela && c.item.carregado && !c.v.paused) {
      const alvo = 1 + Math.min(av / 3000, 0.6);
      c.rate += (alvo - c.rate) * (1 - Math.exp(-dt * 4));
      if (Math.abs(c.rate - (c.last || 1)) > 0.02) { c.last = c.rate; try { c.v.playbackRate = c.rate; } catch (e) { /* ok */ } }
    }
  });
}

/* --------------------------------------------------------------------------
   20b · Animações CSS em loop só rodam na seção que está na tela (±200px):
         fora dela ganham .is-off (animation-play-state: paused no CSS). No celular
         isso devolve o processador parado a ~95% ocioso (pulsos do mapa, faixas, bordas…).
   -------------------------------------------------------------------------- */
function pausaFora() {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle("is-off", !e.isIntersecting));
  }, { rootMargin: "200px 0px" });
  $$("main > section, main > .marquee, .footer").forEach(el => io.observe(el));
}

/* --------------------------------------------------------------------------
   21 · Manutenção: refresh das posições quando a altura da página muda
        (fontes, FAQ aberta, imagens) — com trava contra laço de refresh
   -------------------------------------------------------------------------- */
function manutencao() {
  let alturaOk = doc.scrollHeight, t = 0;
  ScrollTrigger.addEventListener("refresh", () => { alturaOk = doc.scrollHeight; });
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (Math.abs(doc.scrollHeight - alturaOk) > 2) ScrollTrigger.refresh();
      }, 250);
    }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  // cenas 3D pausam com a aba oculta (hero-fiber também cuida de si; aqui vale para o estado do app)
  document.addEventListener("visibilitychange", ajustaCenaHero);
}

/* --------------------------------------------------------------------------
   INÍCIO — ordem das seções = ordem da página (as posições do ScrollTrigger
   dependem disso; os pins ainda têm refreshPriority)
   -------------------------------------------------------------------------- */
// teclado em uso (Tab): os anéis de foco "cheios" que dependem disso (aviso de cookies) acendem
document.addEventListener("keydown", e => { if (e.key === "Tab") doc.classList.add("teclado"); });
seguro("rastreamento", rastreamento);
if (MOVIMENTO) { seguro("css", injetaCss); seguro("lenis", suave); }
seguro("ancoras", ancoras);
seguro("header", header);
seguro("menu", menu);
seguro("rotador", rotador);
seguro("comparador", comparador);
seguro("contadores", contadores);
seguro("faq", faq);

if (MOVIMENTO) {
  seguro("hero", heroScroll);
  seguro("orbita", orbita);
  seguro("ponteiro", ponteiro);
  seguro("marquees", marquees);
  seguro("mapa", mapa);
  seguro("watch", watch);
  seguro("beneficios", beneficios);
  seguro("experiencia", experiencia);
  seguro("versus", versus);
  seguro("final", final);
  seguro("revelacoes", revelacoes);
  seguro("titulos", titulos);
  seguro("loop", loop);
  seguro("pausaFora", pausaFora);
  seguro("manutencao", manutencao);
}
seguro("videos", videos);
seguro("cenaHero", cenaHero);
seguro("cenaMilo", cenaMilo);
