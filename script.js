// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
const WA_NUMBER  = "573158261632";
const SHEET_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTF7A_45x7iWTPbQse63AVIA2LEvX1G-SSi-B7jvIJ5iZrbqlNq4zQYZVJ6yajuspzBqYcsKdvVkgpH/pub?output=csv";
const CACHE_KEY  = "jprime_productos";
const CACHE_MINS = 60;

const ETIQUETAS_VISIBLES = new Set([
  "kingdom", "siege", "legacy", "movieverse", "armada", "g1",
  "combiner", "3p", "cybertron", "energon", "foc", "classics", "cw", "tr",
  "gen", "potp", "aotp", "mainline", "legends", "masterpiece",
  "lego", "marvel", "off"
]);

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let productos        = [];
let listaActual      = [];
let ordenActual      = "default";
let filtrosActivos   = new Set();
let paginaActual     = 1;
let imagenIntervalId = null;
let mostrandoHover   = false;
const PRODUCTOS_POR_PAGINA = 30;

const contenedor    = document.getElementById("productos");
const contador      = document.getElementById("contador");
const paginacion    = document.getElementById("paginacion");
const paginacionTop = document.getElementById("paginacion-top");
const toast         = document.getElementById("toast");

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

function transformarLinkDrive(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const id = url.split("/d/")[1]?.split("/")[0];
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : "";
  }
  return url.trim();
}

function parsearCSV(texto) {
  return texto.split("\n").slice(1).map(fila => {
    const col = fila.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    return {
      nombre:      col[0]?.replace(/"/g, "").trim() || "",
      precio:      col[1]?.replace(/"/g, "").trim() || "",
      etiquetas:   col[2]?.replace(/"/g, "").trim() || "",
      imagen:      col[3]?.replace(/"/g, "").trim() || "",
      imagenHover: col[4]?.replace(/"/g, "").trim() || ""
    };
  }).filter(p => p.nombre);
}

function precioNumero(p) {
  return parseFloat(p.precio.replace(/\./g, "").replace(/,/g, "").replace(/[^0-9]/g, "")) || 0;
}

function formatearPrecio(num) {
  return num.toLocaleString("es-CO");
}

// ─── CACHÉ LOCAL ──────────────────────────────────────────────────────────────

function guardarCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

function leerCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_MINS * 60 * 1000) return data;
  } catch (_) {}
  return null;
}

// ─── SKELETON LOADING ─────────────────────────────────────────────────────────

function mostrarSkeleton(n = 8) {
  contenedor.innerHTML = Array(n).fill(`
    <div class="card skeleton">
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
      <div class="skeleton-btn"></div>
    </div>
  `).join("");
}

// ─── CARGA DESDE GOOGLE SHEETS ────────────────────────────────────────────────

async function cargarProductos() {
  const cache = leerCache();
  if (cache) {
    productos = cache;
    aplicarFiltroYOrden();
    fetchSheets(true);
    return;
  }
  mostrarSkeleton();
  await fetchSheets(false);
}

async function fetchSheets(silencioso = false) {
  // Intentar con URL directa primero, luego con proxy CORS como respaldo.
  // El proxy es necesario en algunos hostings donde el navegador bloquea
  // las redirecciones de Google Sheets por falta de cabeceras CORS intermedias.
  const URLS_A_INTENTAR = [
    SHEET_URL,
    "https://corsproxy.io/?" + encodeURIComponent(SHEET_URL),
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(SHEET_URL)
  ];

  for (const url of URLS_A_INTENTAR) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.text();
      if (!data || data.trim().length === 0) throw new Error("Respuesta vacía");
      productos = parsearCSV(data);
      if (productos.length === 0) throw new Error("Sin productos en el CSV");
      guardarCache(productos);
      if (!silencioso) aplicarFiltroYOrden();
      return; // éxito — salir
    } catch (err) {
      console.warn("Falló intento con URL:", url.substring(0, 60) + "...", "|", err.message);
    }
  }

  // Todos los intentos fallaron
  if (!silencioso) {
    contenedor.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <p style="color:#f66;font-size:16px;margin-bottom:8px;">
          ⚠️ No se pudo cargar el catálogo.
        </p>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;">
          Verifica tu conexión a internet e intenta de nuevo.
        </p>
        <button onclick="location.reload()" style="
          margin-top:16px;padding:10px 24px;border:none;border-radius:25px;
          background:linear-gradient(45deg,#096b91,#00c6ff);color:#fff;
          font-family:inherit;font-weight:600;cursor:pointer;font-size:14px;">
          Reintentar
        </button>
      </div>`;
  }
  console.error("Error final: todos los intentos de carga fallaron.");
}

// ─── APLICAR FILTRO + ORDEN ───────────────────────────────────────────────────

function aplicarFiltroYOrden(resetPage = false) {
  if (resetPage) paginaActual = 1;
  let lista = [...productos];

  if (filtrosActivos.size > 0) {
    lista = lista.filter(p => {
      if (!p.etiquetas) return false;
      const tags = p.etiquetas.split("-").map(t => t.trim());
      return [...filtrosActivos].every(f => tags.includes(f));
    });
  }

  const q = document.getElementById("buscador").value.toLowerCase().trim();
  if (q) {
    lista = lista.filter(p => {
      const nombreMatch = p.nombre.toLowerCase().includes(q);
      const etiquetasMatch = p.etiquetas && p.etiquetas.split("-").some(tag => tag.trim().toLowerCase().includes(q));
      return nombreMatch || etiquetasMatch;
    });
  }

  if (ordenActual === "asc")  lista.sort((a, b) => precioNumero(a) - precioNumero(b));
  if (ordenActual === "desc") lista.sort((a, b) => precioNumero(b) - precioNumero(a));

  listaActual = lista;
  mostrarProductos(lista);
}

// ─── RENDER DE PRODUCTOS ──────────────────────────────────────────────────────

function mostrarProductos(lista) {
  const total = productos.length;
  const totalFiltrados = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / PRODUCTOS_POR_PAGINA));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const fin = inicio + PRODUCTOS_POR_PAGINA;
  const paginaLista = lista.slice(inicio, fin);

  contador.textContent = totalFiltrados === total
    ? `${total} productos`
    : `${totalFiltrados} de ${total} productos`;

  if (!paginaLista.length) {
    contenedor.innerHTML = "<p style='text-align:center;padding:40px;opacity:.6'>Sin resultados.</p>";
    if (paginacion)    paginacion.innerHTML = "";
    if (paginacionTop) paginacionTop.innerHTML = "";
    return;
  }

  contenedor.innerHTML = paginaLista.map(p => {
    const img      = transformarLinkDrive(p.imagen);
    const imgHover = transformarLinkDrive(p.imagenHover) || img;
    const waMsg    = encodeURIComponent(`Quisiera comprar a "${p.nombre}"`);
    const waLink   = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

    const tags = p.etiquetas ? p.etiquetas.split("-").map(t => t.trim()).filter(Boolean) : [];
    const hasOff = tags.includes("off");
    const isMasterpiece = tags.includes("masterpiece");
    const cardClass = `card${isMasterpiece ? " masterpiece" : ""}`;

    const badgesHTML = tags
      .filter(tag => ETIQUETAS_VISIBLES.has(tag))
      .map(tag => `<span class="badge">${tag}</span>`)
      .join("");

    let precioHTML;
    if (hasOff) {
      const original = precioNumero(p);
      const conDesc  = Math.round(original * 0.9);
      precioHTML = `
        <p class="precio-original">$${formatearPrecio(original)}</p>
        <p class="precio-descuento">$${formatearPrecio(conDesc)}<span class="badge-off">-10%</span></p>
      `;
    } else {
      precioHTML = `<p>$${formatearPrecio(precioNumero(p))}</p>`;
    }

    const tieneHover = imgHover && imgHover !== img;

    return `
      <div class="${cardClass}">
        <div class="img-container">
          <img
            src="${img}"
            data-src="${img}"
            data-large-src="${img}"
            ${tieneHover ? `data-hover-src="${imgHover}"` : ""}
            class="img-producto"
            alt="${p.nombre}"
            loading="lazy"
          >
        </div>
        <h3>${p.nombre}</h3>
        ${precioHTML}
        ${badgesHTML ? `<div class="badges">${badgesHTML}</div>` : ""}
        <div class="card-actions">
          <a href="${waLink}" target="_blank" rel="noopener noreferrer">
            <button class="btn-comprar">Comprar</button>
          </a>
        </div>
      </div>
    `;
  }).join("");

  renderPaginacion(totalPaginas);
  iniciarAlternanciaImagenes();
}

// ─── ALTERNANCIA DE IMÁGENES ──────────────────────────────────────────────────

function iniciarAlternanciaImagenes() {
  if (imagenIntervalId) clearInterval(imagenIntervalId);
  mostrandoHover = false;

  imagenIntervalId = setInterval(() => {
    mostrandoHover = !mostrandoHover;
    const imgs = document.querySelectorAll(".img-producto[data-hover-src]");
    if (!imgs.length) return;
    imgs.forEach(img => { img.style.opacity = "0"; });
    setTimeout(() => {
      imgs.forEach(img => {
        img.src = mostrandoHover ? img.dataset.hoverSrc : img.dataset.src;
        img.style.opacity = "1";
      });
    }, 600);
  }, 5000);
}

// ─── BUSCADOR ─────────────────────────────────────────────────────────────────

function buscarProducto() {
  const val = document.getElementById("buscador").value;
  document.getElementById("btn-limpiar").classList.toggle("hidden", !val);
  aplicarFiltroYOrden(true);
}

function limpiarBusqueda() {
  document.getElementById("buscador").value = "";
  document.getElementById("btn-limpiar").classList.add("hidden");
  aplicarFiltroYOrden(true);
}

// ─── PAGINACIÓN ───────────────────────────────────────────────────────────────

const GROUP_SIZE = 4;

function renderPaginacion(totalPaginas) {
  if (totalPaginas <= 1) {
    if (paginacion)    paginacion.innerHTML = "";
    if (paginacionTop) paginacionTop.innerHTML = "";
    return;
  }

  const grupoActual = Math.ceil(paginaActual / GROUP_SIZE);
  const inicio      = (grupoActual - 1) * GROUP_SIZE + 1;
  const fin         = Math.min(grupoActual * GROUP_SIZE, totalPaginas);

  let html = "";
  html += `<button class="pagina-btn" data-page="${paginaActual - 1}" ${paginaActual === 1 ? "disabled" : ""}>«</button>`;
  for (let i = inicio; i <= fin; i++) {
    html += `<button class="pagina-btn${i === paginaActual ? " activo" : ""}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="pagina-btn" data-page="${paginaActual + 1}" ${paginaActual === totalPaginas ? "disabled" : ""}>»</button>`;

  if (paginacion)    paginacion.innerHTML    = html;
  if (paginacionTop) paginacionTop.innerHTML = html;
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

function filtrarCategoria(categoria) {
  if (categoria === "all") {
    filtrosActivos.clear();
  } else {
    if (filtrosActivos.has(categoria)) {
      filtrosActivos.delete(categoria);
    } else {
      filtrosActivos.add(categoria);
    }
  }
  actualizarBotonesActivos();
  aplicarFiltroYOrden(true);
}

function actualizarBotonesActivos() {
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    const cat = btn.dataset.cat;
    if (cat === "all") {
      btn.classList.toggle("activo", filtrosActivos.size === 0);
    } else {
      btn.classList.toggle("activo", filtrosActivos.has(cat));
    }
  });
}

// ─── ORDEN POR PRECIO ─────────────────────────────────────────────────────────

function ordenar(tipo) {
  ordenActual = tipo;
  document.querySelectorAll(".sort-btn").forEach(btn => btn.classList.remove("activo"));
  document.getElementById(`sort-${tipo === "default" ? "def" : tipo}`).classList.add("activo");
  aplicarFiltroYOrden();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function mostrarToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden", "oculto");
  setTimeout(() => {
    toast.classList.add("oculto");
    setTimeout(() => toast.classList.add("hidden"), 400);
  }, 2200);
}

// ─── BOTÓN VOLVER ARRIBA ──────────────────────────────────────────────────────

function volverArriba() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleBotonVolverArriba() {
  const btn = document.getElementById("btn-volver-arriba");
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  if (scrollTop > 300) {
    btn.classList.add("visible");
    btn.classList.remove("hidden");
  } else {
    btn.classList.remove("visible");
    btn.classList.add("hidden");
  }
}

window.addEventListener("scroll", toggleBotonVolverArriba);

// ─── BUSCADOR STICKY ──────────────────────────────────────────────────────────

function gestionarBuscadorSticky() {
  const searchWrapper = document.querySelector(".search-wrapper");
  const filterRow     = document.querySelector(".filter-row");
  if (!searchWrapper || !filterRow) return;
  const limite = filterRow.getBoundingClientRect().bottom + window.scrollY;
  searchWrapper.classList.toggle("sticky", window.scrollY > limite);
}

window.addEventListener("scroll", gestionarBuscadorSticky);

// ─── EVENTOS DOM ──────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  cargarProductos();

  const btnFiltros   = document.getElementById("btn-filtros");
  const panelFiltros = document.getElementById("filtros-opciones");
  const btnEscalas   = document.getElementById("btn-escalas");
  const panelEscalas = document.getElementById("escalas-opciones");

  btnFiltros.addEventListener("click", e => {
    e.stopPropagation();
    panelFiltros.classList.toggle("hidden");
    panelEscalas.classList.add("hidden");
  });

  btnEscalas.addEventListener("click", e => {
    e.stopPropagation();
    panelEscalas.classList.toggle("hidden");
    panelFiltros.classList.add("hidden");
  });

  const btnContacto   = document.querySelector(".btn-contacto-final");
  const panelContacto = document.querySelector(".contacto-final-opciones");
  const lightbox      = document.getElementById("lightbox");
  const lightboxImg   = document.getElementById("lightbox-img");

  btnContacto.addEventListener("click", e => {
    e.stopPropagation();
    panelContacto.classList.toggle("hidden");
  });

  const manejarPaginacion = e => {
    const btn = e.target.closest(".pagina-btn");
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    if (!page || page === paginaActual) return;
    paginaActual = page;
    mostrarProductos(listaActual);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (paginacion)    paginacion.addEventListener("click", manejarPaginacion);
  if (paginacionTop) paginacionTop.addEventListener("click", manejarPaginacion);

  contenedor.addEventListener("click", e => {
    const imagen = e.target.closest(".img-producto");
    if (!imagen) return;
    lightboxImg.src = imagen.dataset.largeSrc || imagen.src;
    lightboxImg.alt = imagen.alt || "Imagen del producto";
    lightbox.classList.remove("hidden");
  });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) lightbox.classList.add("hidden");
  });

  document.getElementById("lightbox-close").addEventListener("click", () => {
    lightbox.classList.add("hidden");
  });

  document.addEventListener("click", e => {
    if (!btnContacto.contains(e.target) && !panelContacto.contains(e.target)) {
      panelContacto.classList.add("hidden");
    }
    if (!btnFiltros.contains(e.target) && !panelFiltros.contains(e.target)) {
      panelFiltros.classList.add("hidden");
    }
    if (!btnEscalas.contains(e.target) && !panelEscalas.contains(e.target)) {
      panelEscalas.classList.add("hidden");
    }
  });

});
