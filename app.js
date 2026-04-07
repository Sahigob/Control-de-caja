import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Configuración Firebase
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
const productosDiv = document.getElementById("productos");

const showAddProductBtn = document.getElementById("showAddProductBtn");
const addProductForm = document.getElementById("addProductForm");
const addNewProductBtn = document.getElementById("addNewProductBtn");

// Login y registro
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
});

registerBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
});

// Variables
let totalCaja = 0;
let productos = [];

// Mostrar formulario añadir producto
showAddProductBtn.addEventListener("click", () => {
  addProductForm.style.display = addProductForm.style.display === "none" ? "block" : "none";
});

// Añadir producto nuevo
addNewProductBtn.addEventListener("click", async () => {
  const nombre = document.getElementById("newName").value;
  const precio = parseFloat(document.getElementById("newPrice").value);
  const stock = parseInt(document.getElementById("newStock").value);
  const img = document.getElementById("newImg").value;

  if (!nombre || !precio || !stock) return alert("Datos incorrectos");

  const prodRef = doc(db, "productos", nombre);
  await setDoc(prodRef, { precio, stock, img });

  document.getElementById("newName").value = "";
  document.getElementById("newPrice").value = "";
  document.getElementById("newStock").value = "";
  document.getElementById("newImg").value = "";

  addProductForm.style.display = "none";
});

// Detectar usuario logueado
onAuthStateChanged(auth, user => {
  if (user) {
    loginDiv.style.display = "none";
    appDiv.style.display = "block";
    cargarProductos();
    cargarHistorial();
    cargarRetiradas();
  } else {
    loginDiv.style.display = "block";
    appDiv.style.display = "none";
  }
});

// Cargar productos desde Firestore
function cargarProductos() {
  const q = query(collection(db, "productos"), orderBy("nombre"));
  onSnapshot(q, snapshot => {
    productos = [];
    snapshot.forEach(doc => {
      productos.push({ nombre: doc.id, ...doc.data() });
    });
    renderProductos();
  });
}

// Renderizar botones de productos
function renderProductos() {
  productosDiv.innerHTML = "";
  productos.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `<img src="${p.img}" alt="${p.nombre}"><br>${p.nombre}<br>€${p.precio}<br>Stock: ${p.stock}`;
    div.onclick = () => manejarProducto(p);
    productosDiv.appendChild(div);
  });
}

// Manejar click en producto
async function manejarProducto(producto) {
  const accion = prompt("¿Quieres vender o añadir stock? (v/s)").toLowerCase();
  if (accion === "v") {
    const cantidad = parseInt(prompt(`Cantidad a vender (Stock: ${producto.stock})`));
    if (!cantidad || cantidad <= 0 || cantidad > producto.stock) return alert("Cantidad incorrecta");
    const total = cantidad * producto.precio;
    totalCaja += total;
    actualizarCaja();

    producto.stock -= cantidad;
    const prodRef = doc(db, "productos", producto.nombre);
    await updateDoc(prodRef, { stock: producto.stock });

    await addDoc(collection(db, "ventas"), {
      producto: producto.nombre,
      cantidad,
      total,
      fecha: new Date().toISOString(),
      usuario: auth.currentUser.email
    });
  } else if (accion === "s") {
    const cantidad = parseInt(prompt("Cantidad a añadir al stock"));
    if (!cantidad || cantidad <= 0) return alert("Cantidad incorrecta");
    producto.stock += cantidad;
    const prodRef = doc(db, "productos", producto.nombre);
    await updateDoc(prodRef, { stock: producto.stock });
  }
}

// Actualizar total en caja
function actualizarCaja() {
  totalCajaSpan.textContent = totalCaja.toFixed(2);
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
