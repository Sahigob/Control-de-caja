import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, query, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// CONFIGURACIÓN REAL DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDt5Ldo_-62A82ZmsxP5nB87LsefAPIxR0",
  authDomain: "control-de-caja-41341.firebaseapp.com",
  projectId: "control-de-caja-41341",
  storageBucket: "control-de-caja-41341.firebasestorage.app",
  messagingSenderId: "802067725052",
  appId: "1:802067725052:web:a583fab3a16d4f8025f579",
  measurementId: "G-0TZZT5GEEE"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

// ELEMENTOS DEL DOM
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const appDiv = document.getElementById("app");
const loginDiv = document.getElementById("login");
const totalCajaSpan = document.getElementById("totalCaja");
const historial = document.getElementById("historial");
const historialRetiradas = document.getElementById("historialRetiradas");
const retirarBtn = document.getElementById("retirarBtn");

// PRODUCTOS CON STOCK
const productos = [
  { nombre: "Cerveza", precio: 1.5, stock: 50 },
  { nombre: "CocaCola", precio: 1, stock: 30 },
  { nombre: "Tónica", precio: 1, stock: 20 },
  { nombre: "Vino", precio: 2, stock: 10 },
  { nombre: "Patatas", precio: 1.5, stock: 40 },
  { nombre: "Banderillas", precio: 1.5, stock: 25 }
];

let totalCaja = 0;

// LOGIN
loginBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert(err.message));
});

// REGISTRO
registerBtn.addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .catch(err => alert(err.message));
});

// DETECTAR USUARIO LOGUEADO
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

// CARGAR STOCK
async function cargarStock() {
  const prodRef = collection(db, "productos");
  for (let producto of productos) {
    const docRef = doc(prodRef, producto.nombre);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      producto.stock = docSnap.data().stock;
    } else {
      await setDoc(docRef, { stock: producto.stock });
    }
  }
  renderProductos();
}

// MOSTRAR PRODUCTOS
function renderProductos() {
  const contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";
  productos.forEach((producto, index) => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `<strong>${producto.nombre}</strong> - €${producto.precio} - Stock: ${producto.stock} `;

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

// COMPRAR PRODUCTO
async function comprar(index) {
  const producto = productos[index];
  const cantidad = parseFloat(prompt(`Cantidad (Stock disponible: ${producto.stock})`));
  if (!cantidad || cantidad <= 0) return;
  if (cantidad > producto.stock) return alert("No hay suficiente stock disponible");

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

// AGREGAR STOCK
async function agregarStock(index) {
  const producto = productos[index];
  const cantidad = parseInt(prompt("Cantidad a añadir al stock"));
  if (!cantidad || cantidad <= 0) return;

  producto.stock += cantidad;
  renderProductos();

  const prodRef = doc(db, "productos", producto.nombre);
  await updateDoc(prodRef, { stock: producto.stock });
}

// RETIRAR DINERO
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

// ACTUALIZAR TOTAL
function actualizarCaja() {
  totalCajaSpan.textContent = totalCaja.toFixed(2);
}

// HISTORIAL VENTAS
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

// HISTORIAL RETIRADAS
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
