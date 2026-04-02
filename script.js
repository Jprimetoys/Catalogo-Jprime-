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
  etiquetas: ["legacy","mainline"],
  imagen: "Imagenes/bbbsp1.jpg",
  imagenHover: "Imagenes/bbbsp2.jpg"
},
  
];

function mostrarProductos(lista) {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  lista.forEach(p => {
    contenedor.innerHTML += `
      <div class="card">
        <h3>${p.nombre}</h3>
        <p>$${p.precio.toLocaleString()}</p>
        <img src="${p.imagen}" 
     class="img-producto"
     onmouseover="this.src='${p.imagenHover || p.imagen}'"
     onmouseout="this.src='${p.imagen}'">
        <a href="https://wa.me/573158261632?text=Hola,%20quiero%20el%20${p.nombre}" target="_blank">
  <button class="btn-comprar">Comprar</button>
</a>
      </div>
    `;
  });
}

function filtrar(tipo) {
  if (tipo === "all") {
    mostrarProductos(productos);
  } else {
    const filtrados = productos.filter(p =>
      p.etiquetas.includes(tipo)
    );
    mostrarProductos(filtrados);
  }
}

// cargar al inicio
mostrarProductos(productos);