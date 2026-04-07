// 1. Importaciones de los módulos de Firebase (Siempre al principio)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, onSnapshot, addDoc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 2. Configuración de tu proyecto
const firebaseConfig = {
    apiKey: "AIzaSyDt5Ldo_-62A82ZmsxP5nB87LsefAPIxR0",
    authDomain: "control-de-caja-41341.firebaseapp.com",
    projectId: "control-de-caja-41341",
    storageBucket: "control-de-caja-41341.firebasestorage.app",
    messagingSenderId: "802067725052",
    appId: "1:802067725052:web:a583fab3a16d4f8025f579"
};

// 3. Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado local
let usuarioActualEmail = null;

// --- ELEMENTOS DEL DOM ---
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

// --- LÓGICA DE AUTENTICACIÓN ---

// Iniciar Sesión
loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    
    if (!email || !pass) return alert("Por favor, rellena todos los campos");

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Error al acceder: " + error.message);
    }
});

// Cerrar Sesión
window.logout = () => {
    signOut(auth);
};

// Observador del estado del usuario (Detecta si entra o sale)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioActualEmail = user.email;
        loginSection.style.display = "none";
        appSection.style.display = "block";
        
        // Escuchar datos del usuario en tiempo real (Saldo)
        escucharDatosUsuario(user.email);
        // Cargar los productos para vender
        cargarProductos();
    } else {
        usuarioActualEmail = null;
        loginSection.style.display = "block";
        appSection.style.display = "none";
    }
});

// --- LÓGICA DE NEGOCIO ---

// 1. Escuchar el saldo del usuario en tiempo real
function escucharDatosUsuario(email) {
    const userRef = doc(db, "usuarios", email);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("user-display-name").textContent = email;
            document.getElementById("user-balance").textContent = data.saldo.toFixed(2);
        } else {
            console.error("El usuario no existe en la colección 'usuarios' de Firestore");
            alert("Error: No se encontró perfil de socio para este email.");
        }
    });
}

// 2. Cargar productos desde Firestore
function cargarProductos() {
    const productosGrid = document.getElementById("productos-grid");
    // Ordenamos por nombre
    const q = query(collection(db, "productos"), orderBy("precio", "asc"));
    
    onSnapshot(q, (snapshot) => {
        productosGrid.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const p = { id: docSnap.id, ...docSnap.data() };
            
            const card = document.createElement("div");
            card.className = "producto-card";
            card.innerHTML = `
                <img src="${p.img || 'https://via.placeholder.com/100'}" alt="${p.id}">
                <h3>${p.id}</h3>
                <p class="precio">€${p.precio.toFixed(2)}</p>
                <p class="stock">Stock: ${p.stock}</p>
                <button class="btn-comprar" onclick="realizarCompra('${p.id}', ${p.precio}, ${p.stock})">
                    Comprar ahora
                </button>
            `;
            productosGrid.appendChild(card);
        });
    });
}

// 3. Procesar la compra (Sistema de Confianza)
window.realizarCompra = async (prodId, precio, stockActual) => {
    if (!usuarioActualEmail) return;
    if (stockActual <= 0) return alert("Lo sentimos, no queda stock.");

    // Confirmación rápida
    if (!confirm(`¿Quieres comprar ${prodId} por €${precio}?`)) return;

    try {
        const userRef = doc(db, "usuarios", usuarioActualEmail);
        const userSnap = await getDoc(userRef);
        const saldoActual = userSnap.data().saldo;

        if (saldoActual < precio) {
            return alert("Saldo insuficiente. Por favor, recarga tu cuenta con el tesorero.");
        }

        // --- TRANSACCIÓN ---
        // 1. Restar saldo al usuario
        await updateDoc(userRef, {
            saldo: increment(-precio)
        });

        // 2. Restar stock al producto
        const prodRef = doc(db, "productos", prodId);
        await updateDoc(prodRef, {
            stock: increment(-1)
        });

        // 3. Registrar la venta en el historial
        await addDoc(collection(db, "ventas"), {
            usuario: usuarioActualEmail,
            producto: prodId,
            total: precio,
            fecha: new Date().toISOString()
        });

        console.log("Compra realizada con éxito");
        
    } catch (error) {
        console.error("Error en la compra:", error);
        alert("Hubo un error al procesar el pago.");
    }
};
