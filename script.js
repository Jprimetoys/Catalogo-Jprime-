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
  masterpiece: { bg: "#4e342e", color: "#fff" },
  lego:        { bg: "#f9a825", color: "#000" },
  marvel:      { bg: "#c62828", color: "#fff" },
};

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let productos      = [];
let listaActual    = []; // productos visibles tras filtro/búsqueda
let ordenActual    = "default";
let filtroActivo   = "all";

const contenedor = document.getElementById("productos");
const contador   = document.getElementById("contador");
const toast      = document.getElementById("toast");

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

function aplicarFiltroYOrden() {
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
    lista = lista.filter(p => p.nombre.toLowerCase().includes(q));
  }

  // Orden
  if (ordenActual === "asc")  lista.sort((a, b) => precioNumero(a) - precioNumero(b));
  if (ordenActual === "desc") lista.sort((a, b) => precioNumero(b) - precioNumero(a));

  listaActual = lista;
  mostrarProductos(lista);
}

// ─── RENDER DE PRODUCTOS ──────────────────────────────────────────────────────

function mostrarProductos(lista) {
  // Actualizar contador
  const total = productos.length;
  contador.textContent = lista.length === total
    ? `${total} productos`
    : `${lista.length} de ${total} productos`;

  if (!lista.length) {
    contenedor.innerHTML = "<p style='text-align:center;padding:40px;opacity:.6'>Sin resultados.</p>";
    return;
  }

  contenedor.innerHTML = lista.map(p => {
    const img      = transformarLinkDrive(p.imagen);
    const imgHover = transformarLinkDrive(p.imagenHover) || img;
    const waMsg    = encodeURIComponent(`quisiera comprar a "${p.nombre}"`);
    const waLink   = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

    // Badges de categorías
    const tags  = p.etiquetas ? p.etiquetas.split("-").map(t => t.trim()).filter(Boolean) : [];
    const badges = tags.map(tag => `<span class="badge">${tag}</span>`).join("");

    return `
      <div class="card">
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
}

// ─── BUSCADOR ─────────────────────────────────────────────────────────────────

function buscarProducto() {
  aplicarFiltroYOrden();
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

function filtrarCategoria(categoria) {
  filtroActivo = categoria;

  // Marcar filtro activo
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.cat === categoria);
  });

  aplicarFiltroYOrden();
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
