// 📍 LÍNEA 1 → URL DEL SHEETS
const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTF7A_45x7iWTPbQse63AVIA2LEvX1G-SSi-B7jvIJ5iZrbqlNq4zQYZVJ6yajuspzBqYcsKdvVkgpH/pub?output=csv";

// 📍 LÍNEA 4 → CONTENEDOR
const contenedor = document.getElementById("productos");

// 📍 LÍNEA 7 → ARRAY GLOBAL
let productos = [];


// 📍 LÍNEA 11 → TRANSFORMAR LINKS DE DRIVE AUTOMÁTICO
function transformarLinkDrive(url) {
  if (!url) return "";

  if (url.includes("drive.google.com")) {
    const id = url.split("/d/")[1]?.split("/")[0];
    return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }

  return url.trim();
}


// 📍 LÍNEA 24 → CARGAR PRODUCTOS
async function cargarProductos() {
  try {
    const res = await fetch(URL);
    const data = await res.text();

    const filas = data.split("\n").slice(1);

    productos = filas.map(fila => {
      const columnas = fila.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

      return {
        nombre: columnas[0]?.trim(),
        precio: columnas[1]?.trim(),
        etiquetas: columnas[2]?.trim(),
        imagen: columnas[3]?.trim(),
        imagenHover: columnas[4]?.trim() // 👈 NUEVA COLUMNA PARA HOVER
      };
    });

    console.log("✅ Productos:", productos);

    mostrarProductos(productos);

  } catch (error) {
    console.error("❌ ERROR CARGANDO SHEETS:", error);
  }
}


// 📍 LÍNEA 50 → MOSTRAR PRODUCTOS
function mostrarProductos(lista) {
  contenedor.innerHTML = "";

  lista.forEach(producto => {

    const imgPrincipal = transformarLinkDrive(producto.imagen);
    const imgHover = transformarLinkDrive(producto.imagenHover);

    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <div class="img-container">
        <img 
          src="${imgPrincipal}" 
          class="img-producto"
          onmouseover="this.src='${imgHover || imgPrincipal}'"
          onmouseout="this.src='${imgPrincipal}'"
        >
      </div>

      <h3>${producto.nombre}</h3>
      <p>$${producto.precio}</p>

      <button class="btn-comprar">Comprar</button>
    `;

    contenedor.appendChild(card);
  });
}


// 📍 LÍNEA 80 → BUSCADOR
function buscarProducto() {
  const input = document.getElementById("buscador").value.toLowerCase();

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(input)
  );

  mostrarProductos(filtrados);
}


// 📍 LÍNEA 92 → FILTROS
function filtrarCategoria(categoria) {

  if (categoria === "all") {
    mostrarProductos(productos);
    return;
  }

  const filtrados = productos.filter(p => {
    if (!p.etiquetas) return false;

    const tags = p.etiquetas.split("-");
    return tags.includes(categoria);
  });

  mostrarProductos(filtrados);
}



// 📍 LÍNEA 108 → INICIAR
cargarProductos();


document.addEventListener("DOMContentLoaded", () => {
  const btnContactoFinal = document.querySelector(".btn-contacto-final");
  const opcionesContactoFinal = document.querySelector(".contacto-final-opciones");

  btnContactoFinal.addEventListener("click", () => {
    opcionesContactoFinal.classList.toggle("hidden");
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!btnContactoFinal.contains(e.target) && !opcionesContactoFinal.contains(e.target)) {
      opcionesContactoFinal.classList.add("hidden");
    }
  });
});