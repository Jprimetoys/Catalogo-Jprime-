// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
const WA_NUMBER  = "573158261632";
const SHEET_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTF7A_45x7iWTPbQse63AVIA2LEvX1G-SSi-B7jvIJ5iZrbqlNq4zQYZVJ6yajuspzBqYcsKdvVkgpH/pub?output=csv";
const CACHE_KEY  = "jprime_productos";
const CACHE_MINS = 60; // minutos antes de refrescar desde Sheets

// ─── COLORES DE BADGES POR CATEGORÍA ─────────────────────────────────────────
const BADGE_COLORS = {
  kingdom:     { bg: "#2e7d32", color: "#fff" },
  siege:       { bg: "#e65100", color: "#fff" },
  legacy:      { bg: "#6a1b9a", color: "#fff" },
  movieverse:  { bg: "#b71c1c", color: "#fff" },
  armada:      { bg: "#00838f", color: "#fff" },
  g1:          { bg: "#f57f17", color: "#000" },
  combiner:    { bg: "#283593", color: "#fff" },
  mainline:    { bg: "#37474f", color: "#fff" },
  legends:     { bg: "#ad1457", color: "#fff" },
  masterpiece: { bg: "#ffd700", color: "#000" },
  lego:        { bg: "#f9a825", color: "#000" },
  marvel:      { bg: "#c62828", color: "#fff" },
  "3p":        { bg: "#607d8b", color: "#fff" },
  cybertron:   { bg: "#1565c0", color: "#fff" },
  energon:     { bg: "#e53935", color: "#fff" },
  tfp:         { bg: "#8e24aa", color: "#fff" },
  cw:          { bg: "#3949ab", color: "#fff" },
  tr:          { bg: "#00897b", color: "#fff" },
  gen:         { bg: "#f4511e", color: "#fff" },
  potp:        { bg: "#6d4c41", color: "#fff" },
  aotp:        { bg: "#424242", color: "#fff" },
};

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let productos      = [];
let listaActual    = []; // productos visibles tras filtro/búsqueda
let ordenActual    = "default";
let filtroActivo   = "all";
let paginaActual   = 1;
const PRODUCTOS_POR_PAGINA = 30;

const contenedor  = document.getElementById("productos");
const contador    = document.getElementById("contador");
const paginacion  = document.getElementById("paginacion");
const toast       = document.getElementById("toast");

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
  return parseFloat(p.precio.replace(/[^0-9.]/g, "")) || 0;
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
  // 1. Intentar caché primero (carga instantánea)
  const cache = leerCache();
  if (cache) {
    productos = cache;
    aplicarFiltroYOrden();
    // Actualizar en segundo plano sin spinner
    fetchSheets(true);
    return;
  }

  // 2. Sin caché: mostrar skeleton y cargar
  mostrarSkeleton();
  await fetchSheets(false);
}

async function fetchSheets(silencioso = false) {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.text();
    productos = parsearCSV(data);
    guardarCache(productos);
    if (!silencioso) aplicarFiltroYOrden();
  } catch (err) {
    if (!silencioso) {
      contenedor.innerHTML = "<p style='text-align:center;padding:40px;color:#f66'>Error al cargar el catálogo. Verifica tu conexión.</p>";
    }
    console.error("Error cargando Sheets:", err);
  }
}

// ─── APLICAR FILTRO + ORDEN ───────────────────────────────────────────────────

function aplicarFiltroYOrden(resetPage = false) {
  if (resetPage) paginaActual = 1;
  let lista = [...productos];

  // Filtro de categoría
  if (filtroActivo !== "all") {
    lista = lista.filter(p => {
      if (!p.etiquetas) return false;
      return p.etiquetas.split("-").map(t => t.trim()).includes(filtroActivo);
    });
  }

  // Búsqueda activa
  const q = document.getElementById("buscador").value.toLowerCase().trim();
  if (q) {
    lista = lista.filter(p => {
      // Buscar en nombre
      const nombreMatch = p.nombre.toLowerCase().includes(q);
      // Buscar en etiquetas
      const etiquetasMatch = p.etiquetas && p.etiquetas.split("-").some(tag => tag.trim().toLowerCase().includes(q));
      return nombreMatch || etiquetasMatch;
    });
  }

  // Orden
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
  const inicioNum = totalFiltrados ? inicio + 1 : 0;
  const finNum = Math.min(totalFiltrados, fin);

  contador.textContent = totalFiltrados === total
    ? `${total} productos`
    : `${totalFiltrados} de ${total} productos`;

  if (!paginaLista.length) {
    contenedor.innerHTML = "<p style='text-align:center;padding:40px;opacity:.6'>Sin resultados.</p>";
    paginacion.innerHTML = "";
    return;
  }

  contenedor.innerHTML = paginaLista.map(p => {
    const img      = transformarLinkDrive(p.imagen);
    const imgHover = transformarLinkDrive(p.imagenHover) || img;
    const waMsg    = encodeURIComponent(`Quisiera comprar a "${p.nombre}"`);
    const waLink   = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

    // Badges de categorías
    const tags  = p.etiquetas ? p.etiquetas.split("-").map(t => t.trim()).filter(Boolean) : [];
    const badges = tags.map(tag => `<span class="badge">${tag}</span>`).join("");
    const isMasterpiece = tags.includes('masterpiece');
    const cardClass = `card${isMasterpiece ? ' masterpiece' : ''}`;

    return `
      <div class="${cardClass}">
        <div class="img-container">
          <img
            src="${img}"
            data-large-src="${img}"
            class="img-producto"
            alt="${p.nombre}"
            loading="lazy"
            onmouseover="this.src='${imgHover}'"
            onmouseout="this.src='${img}'"
          >
        </div>
        <h3>${p.nombre}</h3>
        <p>$${p.precio}</p>
        ${badges ? `<div class="badges">${badges}</div>` : ""}
        <div class="card-actions">
          <a href="${waLink}" target="_blank" rel="noopener noreferrer">
            <button class="btn-comprar">Comprar</button>
          </a>
        </div>
      </div>
    `;
  }).join("");

  renderPaginacion(totalPaginas);
}

// ─── BUSCADOR ─────────────────────────────────────────────────────────────────

function buscarProducto() {
  aplicarFiltroYOrden(true);
}

function renderPaginacion(totalPaginas) {
  if (!paginacion) return;
  if (totalPaginas <= 1) {
    paginacion.innerHTML = "";
    return;
  }

  const crearBoton = (page, label, active = false, disabled = false) =>
    `<button class="pagina-btn${active ? " activo" : ""}" data-page="${page}" ${disabled ? "disabled" : ""}>${label}</button>`;

  let start = Math.max(1, paginaActual - 2);
  let end = Math.min(totalPaginas, paginaActual + 2);
  if (paginaActual <= 3) {
    start = 1;
    end = Math.min(totalPaginas, 5);
  }
  if (paginaActual >= totalPaginas - 2) {
    start = Math.max(1, totalPaginas - 4);
    end = totalPaginas;
  }

  let html = "";
  html += crearBoton(paginaActual - 1, "«", false, paginaActual === 1);

  if (start > 1) {
    html += crearBoton(1, 1, paginaActual === 1);
    if (start > 2) html += `<span class="ellipsis">...</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += crearBoton(i, i, i === paginaActual);
  }

  if (end < totalPaginas) {
    if (end < totalPaginas - 1) html += `<span class="ellipsis">...</span>`;
    html += crearBoton(totalPaginas, totalPaginas, paginaActual === totalPaginas);
  }

  html += crearBoton(paginaActual + 1, "»", false, paginaActual === totalPaginas);
  paginacion.innerHTML = html;
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

function filtrarCategoria(categoria) {
  filtroActivo = categoria;

  // Marcar filtro activo
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.cat === categoria);
  });

  aplicarFiltroYOrden(true);
}

// ─── ORDEN POR PRECIO ─────────────────────────────────────────────────────────

function ordenar(tipo) {
  ordenActual = tipo;

  // Marcar botón activo
  document.querySelectorAll(".sort-btn").forEach(btn => btn.classList.remove("activo"));
  document.getElementById(`sort-${tipo === "default" ? "def" : tipo}`).classList.add("activo");

  aplicarFiltroYOrden();
}

// ─── COMPARTIR PRODUCTO ───────────────────────────────────────────────────────

function compartir(nombre, precio) {
  const texto = `${nombre} — $${precio} | Catálogo Jprime Toys`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(() => mostrarToast("¡Copiado al portapapeles!"));
  } else {
    mostrarToast("Tu navegador no soporta copiar");
  }
}

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
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function toggleBotonVolverArriba() {
  const btn = document.getElementById('btn-volver-arriba');
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Mostrar el botón cuando se haya scrolleado más de 300px
  if (scrollTop > 300) {
    btn.classList.add('visible');
    btn.classList.remove('hidden');
  } else {
    btn.classList.remove('visible');
    btn.classList.add('hidden');
  }
}

// Event listener para el scroll
window.addEventListener('scroll', toggleBotonVolverArriba);

// ─── BOTÓN CONTACTO ───────────────────────────────────────────────────────────

function toggleBotonContacto() {
  const btn = document.querySelector('.contacto-final-wrapper');
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  // Ocultar el botón cuando esté cerca del final de la página (últimos 100px)
  if (scrollTop + windowHeight >= documentHeight - 100) {
    btn.classList.add('hidden');
  } else {
    btn.classList.remove('hidden');
  }
}

// Event listener para el scroll del botón contacto
window.addEventListener('scroll', toggleBotonContacto);

// ─── EVENTOS DOM ──────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  cargarProductos();

  // Toggle filtros
  const btnFiltros   = document.getElementById("btn-filtros");
  const panelFiltros = document.getElementById("filtros-opciones");

  btnFiltros.addEventListener("click", e => {
    e.stopPropagation();
    panelFiltros.classList.toggle("hidden");
  });

  // Toggle contacto final
  const btnContacto   = document.querySelector(".btn-contacto-final");
  const panelContacto = document.querySelector(".contacto-final-opciones");
  const lightbox      = document.getElementById("lightbox");
  const lightboxImg   = document.getElementById("lightbox-img");

  btnContacto.addEventListener("click", e => {
    e.stopPropagation();
    panelContacto.classList.toggle("hidden");
  });

  if (paginacion) {
    paginacion.addEventListener("click", e => {
      const btn = e.target.closest(".pagina-btn");
      if (!btn || btn.disabled) return;
      const page = Number(btn.dataset.page);
      if (!page || page === paginaActual) return;
      paginaActual = page;
      mostrarProductos(listaActual);
    });
  }

  // Abrir imagen en lightbox al hacer clic en la portada
  contenedor.addEventListener("click", e => {
    const imagen = e.target.closest(".img-producto");
    if (!imagen) return;
    lightboxImg.src = imagen.dataset.largeSrc || imagen.src;
    lightboxImg.alt = imagen.alt || "Imagen del producto";
    lightbox.classList.remove("hidden");
  });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) {
      lightbox.classList.add("hidden");
    }
  });

  // Cerrar lightbox con el botón X
  const lightboxClose = document.getElementById("lightbox-close");
  lightboxClose.addEventListener("click", () => {
    lightbox.classList.add("hidden");
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", e => {
    if (!btnContacto.contains(e.target) && !panelContacto.contains(e.target)) {
      panelContacto.classList.add("hidden");
    }
    if (!btnFiltros.contains(e.target) && !panelFiltros.contains(e.target)) {
      panelFiltros.classList.add("hidden");
    }
  });

});
