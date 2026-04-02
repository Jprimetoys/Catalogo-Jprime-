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
  
];

function mostrarProductos(lista) {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  lista.forEach(p => {
    contenedor.innerHTML += `
      <div class="card">
        <h3>${p.nombre}</h3>
        <p>$${p.precio}</p>
        <img src="${p.imagen}" class="img-producto">
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