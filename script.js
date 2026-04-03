const productos = [
  {
    nombre: "Jazz G2",
    precio: 90000,
    etiquetas: ["legacy","mainline"],
    imagen: "Imagenes/jazzg2.jpg"
  },
  {
    nombre: "Elita 1/Netflix",
    precio: 105000,
    etiquetas: ["g1","mainline"],
    imagen: "Imagenes/elita1netf.jpg"
  },
  {
    nombre: "Bumblebee Special Ops",
    precio: 125000,
    etiquetas: ["movieverse","mainline"],
    imagen: "Imagenes/bbbsp1.jpg",
    imagenHover: "Imagenes/bbbsp2.jpg"
  },
  {
    nombre: "Origins Bumblebee",
    precio: 85000,
    etiquetas: ["g1","mainline","legacy"],
    imagen: "Imagenes/bbbnave.jpg"
  },
  {
    nombre: "Laser cycle",
    precio: 75000,
    etiquetas: ["legacy","mainline"],
    imagen: "Imagenes/Laserc.jpg"
  },
  {
    nombre: "Marvel legends: Groot",
    precio: 105000,
    etiquetas: ["marvel"],
    imagen: "Imagenes/groot.jpg"
  },
  {
    nombre: "DOTM Optimus Prime",
    precio: 70000,
    etiquetas: ["mainline","movieverse"],
    imagen: "Imagenes/optdotm.jpg"
  },
 {
    nombre: "Hound AOE",
    precio: 70000,
    etiquetas: ["mainline","movieverse"],
    imagen: "Imagenes/houndaoe.jpg"
  },
 {
    nombre: "Bumblebee movie 1",
    precio: 60000,
    etiquetas: ["mainline","movieverse"],
    imagen: "Imagenes/bbbmv1.jpg"
  },
  {
    nombre: "Bruticus foc + Add",
    precio: 350000,
    etiquetas: ["combiner","mainline"],
    imagen: "Imagenes/bruticusfoc.jpg"
  },
  {
    nombre: "RTS Optimus Prime",
    precio: 60000,
    etiquetas: ["mainline"],
    imagen: "Imagenes/laserprime1.jpg",
    imagenHover: "Imagenes/laserprime2.jpg"
  },
];

const btnFiltros = document.getElementById("btn-filtros");
const filtrosOpciones = document.getElementById("filtros-opciones");

btnFiltros.addEventListener("click", () => {
  filtrosOpciones.classList.toggle("hidden");
});

function mostrarProductos(lista) {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = ""; // limpiar antes de insertar

  lista.forEach(p => {
    contenedor.innerHTML += `
      <div class="card">
        <div class="img-container">
          <img src="${p.imagen}" 
               class="img-producto"
               onmouseover="this.src='${p.imagenHover || p.imagen}'"
               onmouseout="this.src='${p.imagen}'"
               alt="${p.nombre}">
        </div>
        <h3>${p.nombre}</h3>
        <p>$${p.precio.toLocaleString()}</p>
        <a href="https://wa.me/573158261632?text=Hola,%20quiero%20a%20${encodeURIComponent(p.nombre)}" target="_blank">
          <button class="btn-comprar">Comprar</button>
        </a>
      </div>
    `;
  });
}

// FILTRAR POR ETIQUETA
function filtrar(tipo) {
  if (tipo === "all") {
    mostrarProductos(productos);
  } else {
    const filtrados = productos.filter(p => p.etiquetas.includes(tipo));
    mostrarProductos(filtrados);
  }
}

// BUSCAR POR NOMBRE
function buscar() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(texto));
  mostrarProductos(filtrados);
}

// Cargar al inicio
mostrarProductos(productos);