import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, query, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔹 Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDt5Ldo_-62A82ZmsxP5nB87LsefAPIxR0",
  authDomain: "control-de-caja-41341.firebaseapp.com",
  projectId: "control-de-caja-41341",
  storageBucket: "control-de-caja-41341.firebasestorage.app",
  messagingSenderId: "802067725052",
  appId: "1:802067725052:web:a583fab3a16d4f8025f579",
  measurementId: "G-0TZZT5GEEE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// DOM
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const appDiv = document.getElementById("app");
const loginDiv = document.getElementById("login");
const totalCajaSpan = document.getElementById("totalCaja");
const historial = document.getElementById("historial");
const historialRetiradas = document.getElementById("historialRetiradas");
const retirarBtn = document.getElementById("retirarBtn");

// Productos iniciales
const productos = [
  { nombre: "Cerveza", precio: 1.5, stock: 50 },
  { nombre: "CocaCola", precio: 1, stock: 30 },
  { nombre: "Tónica", precio: 1, stock: 20 },
  { nombre: "Vino", precio: 2, stock: 10 },
  { nombre: "Patatas", precio: 1.5, stock: 40 },
  { nombre: "Banderillas", precio: 1.5, stock: 25 }
];

let totalCaja = 0;

// Login
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
});

// Registrar
registerBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
});

// Detectar usuario logueado
onAuthStateChanged(auth, user => {
  if (user) {
    loginDiv.style.display = "none";
    appDiv.style.display = "block";
    cargarStock();
    cargarHistorial();
    cargarRetiradas();
  } else {
    loginDiv.style.display = "block";
    appDiv.style.display = "none";
  }
});

// Cargar stock y renderizar
async function cargarStock() {
  const prodRef = collection(db, "productos");
  let primerCarga = false;

  for (let producto of productos) {
    const docRef = doc(prodRef, producto.nombre);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      producto.stock = docSnap.data().stock;
    } else {
      await setDoc(docRef, { stock: producto.stock });
      primerCarga = true;
    }
  }

  renderProductos();

  if (primerCarga) {
    const q = query(collection(db, "productos"));
    onSnapshot(q, snapshot => {
      snapshot.forEach(doc => {
        const prod = productos.find(p => p.nombre === doc.id);
        if (prod) prod.stock = doc.data().stock;
      });
      renderProductos();
    });
  }
}

// Renderizar productos
function renderProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  productos.forEach((producto, index) => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `<strong>${producto.nombre}</strong><br>€${producto.precio}<br>Stock: ${producto.stock}`;

    const venderBtn = document.createElement("button");
    venderBtn.textContent = "Vender";
    venderBtn.onclick = () => comprar(index);
    div.appendChild(venderBtn);

    const stockBtn = document.createElement("button");
    stockBtn.textContent = "+ Stock";
    stockBtn.onclick = () => agregarStock(index);
    div.appendChild(stockBtn);

    contenedor.appendChild(div);
  });
}

// Comprar
async function comprar(index) {
  const producto = productos[index];
  const cantidad = parseFloat(prompt(`Cantidad (Stock disponible: ${producto.stock})`));
  if (!cantidad || cantidad <= 0) return;
  if (cantidad > producto.stock) return alert("No hay suficiente stock");

  const total = producto.precio * cantidad;
  totalCaja += total;
  actualizarCaja();

  producto.stock -= cantidad;
  renderProductos();

  const prodRef = doc(db, "productos", producto.nombre);
  await updateDoc(prodRef, { stock: producto.stock });

  await addDoc(collection(db, "ventas"), {
    producto: producto.nombre,
    cantidad,
    total,
    fecha: new Date().toISOString(),
    usuario: auth.currentUser.email
  });
}

// Agregar stock
async function agregarStock(index) {
  const producto = productos[index];
  const cantidad = parseInt(prompt("Cantidad a añadir al stock"));
  if (!cantidad || cantidad <= 0) return;

  producto.stock += cantidad;
  renderProductos();

  const prodRef = doc(db, "productos", producto.nombre);
  await updateDoc(prodRef, { stock: producto.stock });
}

// Retirar dinero
retirarBtn.addEventListener("click", async () => {
  const nombre = document.getElementById("nombreRetirada").value;
  const cantidad = parseFloat(document.getElementById("cantidadRetirada").value);
  if (!nombre || !cantidad || cantidad <= 0) return alert("Datos incorrectos");

  totalCaja -= cantidad;
  actualizarCaja();

  await addDoc(collection(db, "retiradas"), {
    nombre,
    cantidad,
    fecha: new Date().toISOString(),
    usuario: auth.currentUser.email
  });

  document.getElementById("nombreRetirada").value = "";
  document.getElementById("cantidadRetirada").value = "";
});

// Actualizar total
function actualizarCaja() {
  totalCajaSpan.textContent = totalCaja.toFixed(2);
}

// Historial ventas
function cargarHistorial() {
  const q = query(collection(db, "ventas"), orderBy("fecha"));
  onSnapshot(q, snapshot => {
    historial.innerHTML = "";
    totalCaja = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${data.producto} x${data.cantidad} = €${data.total} (${data.usuario})`;
      historial.appendChild(li);
      totalCaja += data.total;
    });
    actualizarCaja();
  });
}

// Historial retiradas
function cargarRetiradas() {
  const q = query(collection(db, "retiradas"), orderBy("fecha"));
  onSnapshot(q, snapshot => {
    historialRetiradas.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.textContent = `${data.nombre} retiró €${data.cantidad} (${data.usuario})`;
      historialRetiradas.appendChild(li);
      totalCaja -= data.cantidad;
    });
    actualizarCaja();
  });
}
