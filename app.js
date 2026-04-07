import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, addDoc, query, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = { /* TU CONFIG DE ANTES */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let socioActivo = null;

// --- INICIO: CARGAR LISTA DE SOCIOS ---
function cargarSocios() {
    onSnapshot(collection(db, "socios"), (snapshot) => {
        const lista = document.getElementById("lista-socios");
        lista.innerHTML = "";
        snapshot.forEach(docSnap => {
            const socio = { id: docSnap.id, ...docSnap.data() };
            const btn = document.createElement("button");
            btn.className = "socio-card";
            btn.innerHTML = `<strong>${socio.id}</strong><br>Saldo: €${socio.saldo.toFixed(2)}`;
            btn.onclick = () => seleccionarSocio(socio);
            lista.appendChild(btn);
        });
    });
}

function seleccionarSocio(socio) {
    socioActivo = socio;
    document.getElementById("socios-section").classList.add("hidden");
    document.getElementById("productos-section").classList.remove("hidden");
    document.getElementById("user-info").classList.remove("hidden");
    document.getElementById("current-user-name").textContent = socio.id;
    document.getElementById("current-user-balance").textContent = `€${socio.saldo.toFixed(2)}`;
    cargarProductos();
}

// --- COMPRA DE PRODUCTO ---
function cargarProductos() {
    onSnapshot(collection(db, "productos"), (snapshot) => {
        const grid = document.getElementById("grid-productos");
        grid.innerHTML = "";
        snapshot.forEach(docSnap => {
            const p = { id: docSnap.id, ...docSnap.data() };
            const btn = document.createElement("div");
            btn.className = "producto-card-touch";
            btn.innerHTML = `
                <img src="${p.img || 'https://via.placeholder.com/80'}">
                <h4>${p.id}</h4>
                <p>€${p.precio.toFixed(2)}</p>
            `;
            btn.onclick = () => realizarVenta(p);
            grid.appendChild(btn);
        });
    });
}

async function realizarVenta(producto) {
    if (socioActivo.saldo < producto.precio) {
        return alert("¡Uy! No tienes saldo suficiente. Avisa al tesorero.");
    }

    try {
        // 1. Restar saldo al socio
        const socioRef = doc(db, "socios", socioActivo.id);
        await updateDoc(socioRef, { saldo: increment(-producto.precio) });

        // 2. Restar stock al producto
        const prodRef = doc(db, "productos", producto.id);
        await updateDoc(prodRef, { stock: increment(-1) });

        // 3. Registrar la venta
        await addDoc(collection(db, "ventas"), {
            socio: socioActivo.id,
            producto: producto.id,
            total: producto.precio,
            fecha: new Date().toISOString()
        });

        alert(`¡Gracias ${socioActivo.id}! Disfruta tu ${producto.id}`);
        window.location.reload(); // Volver al inicio para el siguiente socio
    } catch (e) {
        alert("Error al registrar: " + e.message);
    }
}

// --- GESTIÓN (ADMIN) ---
window.addMember = async () => {
    const nombre = document.getElementById("member-name").value;
    const carga = parseFloat(document.getElementById("member-initial-cash").value) || 0;
    if(!nombre) return;
    
    // Si el socio ya existe, suma el saldo nuevo al anterior
    const socioRef = doc(db, "socios", nombre);
    await setDoc(socioRef, { saldo: increment(carga) }, { merge: true });
    alert("Saldo actualizado");
};

// Botón de salir (logout manual)
window.logout = () => window.location.reload();

// Iniciar aplicación
cargarSocios();
