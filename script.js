// =====================================================
// StudyFlow - script.js
// Orden importante: primero el ESTADO, luego las funciones,
// y al final los eventos y el arranque.
// =====================================================

// ---------- 1) ESTADO (todo declarado antes de usarse) ----------
const MINUTOS = { 'Concentración': 25, 'Descanso': 5 };
const ORDEN = { alta: 1, media: 2, baja: 3 };
const CLAVE = 'studyflow';

let modo = 'Concentración';
let segundos = MINUTOS[modo] * 60;
let intervalo = null;          // null = no hay temporizador corriendo
let tareas = [];
let minutosConcentracion = 0;

// ---------- 2) GUARDAR / CARGAR ----------
function guardar() {
  const datos = { tareas: tareas, minutosConcentracion: minutosConcentracion };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (e) { /* sin almacenamiento: la app sigue funcionando */ }
}

function cargar() {
  let texto = null;
  try { texto = localStorage.getItem(CLAVE); } catch (e) { return; }
  if (texto === null) return;
  try {
    const datos = JSON.parse(texto);
    tareas = datos.tareas || [];
    minutosConcentracion = datos.minutosConcentracion || 0;
  } catch (e) {
    localStorage.removeItem(CLAVE);   // datos dañados: empezar limpio
  }
}

// ---------- 3) TEMPORIZADOR ----------
function dibujar() {
  const m = String(Math.floor(segundos / 60)).padStart(2, '0');
  const s = String(segundos % 60).padStart(2, '0');
  document.getElementById('reloj').textContent = m + ':' + s;
  document.getElementById('modo').textContent = modo;
}

function parar() {
  clearInterval(intervalo);
  intervalo = null;
}

function sesionTerminada(minutos) {
  minutosConcentracion = minutosConcentracion + minutos;
  actualizarDashboard();
}

function tic() {
  segundos--;
  dibujar();
  if (segundos <= 0) {
    parar();
    document.getElementById('aviso').textContent = '¡Tiempo terminado! (' + modo + ')';
    if (modo === 'Concentración') sesionTerminada(MINUTOS['Concentración']);
  }
}

function iniciar() {
  if (intervalo !== null) return;                       // evita varios temporizadores
  if (segundos <= 0) segundos = MINUTOS[modo] * 60;     // si ya terminó, empieza de nuevo
  document.getElementById('aviso').textContent = '';
  document.getElementById('pausar').textContent = 'Pausar';
  dibujar();
  intervalo = setInterval(tic, 1000);
}

function pausarReanudar() {
  if (intervalo !== null) {
    parar();
    document.getElementById('pausar').textContent = 'Reanudar';
  } else {
    iniciar();
  }
}

function reiniciar() {
  parar();
  segundos = MINUTOS[modo] * 60;
  document.getElementById('pausar').textContent = 'Pausar';
  document.getElementById('aviso').textContent = '';
  dibujar();
}

function cambiarModo() {
  modo = (modo === 'Concentración') ? 'Descanso' : 'Concentración';
  reiniciar();
}

// ---------- 4) TAREAS ----------
function dibujarTareas() {
  const lista = document.getElementById('lista');
  lista.innerHTML = '';   // vaciar (seguro: no mete datos del usuario)

  if (tareas.length === 0) {
    const vacio = document.createElement('li');
    vacio.textContent = 'No hay tareas todavía. ¡Añade la primera!';
    lista.appendChild(vacio);
  }

  tareas.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'tarea ' + t.prioridad + (t.completada ? ' completada' : '');

    const texto = document.createElement('span');
    texto.textContent = t.nombre + ' · ' + t.asignatura + ' · ' + t.duracion + ' min · ' + t.prioridad;

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.textContent = t.completada ? 'Deshacer' : 'Completar';
    btnOk.addEventListener('click', () => {
      t.completada = !t.completada;
      dibujarTareas();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.textContent = 'Eliminar';
    btnDel.addEventListener('click', () => {
      tareas = tareas.filter((x) => x.id !== t.id);
      dibujarTareas();
    });

    li.append(texto, btnOk, btnDel);
    lista.appendChild(li);
  });

  contarTareas();
  actualizarDashboard();
}

function contarTareas() {
  const hechas = tareas.filter((t) => t.completada).length;
  const pendientes = tareas.length - hechas;
  document.getElementById('contador').textContent =
    'Pendientes: ' + pendientes + ' · Completadas: ' + hechas;
}

// ---------- 5) PLAN DE ESTUDIO ----------
function generarPlan(disponible) {
  const pendientes = tareas
    .filter((t) => !t.completada)
    .sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad]);

  const plan = [];
  let usado = 0;
  pendientes.forEach((t) => {
    if (usado + t.duracion <= disponible) {   // ¿cabe completa?
      plan.push(t);
      usado = usado + t.duracion;
    }
  });
  return { plan: plan, usado: usado };
}

// ---------- 6) DASHBOARD ----------
function minutosAHoras(min) {
  return (min / 60).toFixed(1);   // 90 -> '1.5'
}

function actualizarDashboard() {
  const completadas = tareas.filter((t) => t.completada).length;
  const pendientes = tareas.length - completadas;

  document.getElementById('statPendientes').textContent = pendientes;
  document.getElementById('statCompletadas').textContent = completadas;
  document.getElementById('statMinutos').textContent = minutosConcentracion;
  document.getElementById('statHoras').textContent = minutosAHoras(minutosConcentracion) + ' h';

  const sinDatos = (tareas.length === 0 && minutosConcentracion === 0);
  document.getElementById('sinDatos').textContent =
    sinDatos ? 'Aún no hay datos. Añade una tarea o inicia un Pomodoro.' : '';

  guardar();
}

// ---------- 7) EVENTOS ----------
document.getElementById('iniciar').addEventListener('click', iniciar);
document.getElementById('pausar').addEventListener('click', pausarReanudar);
document.getElementById('reiniciar').addEventListener('click', reiniciar);
document.getElementById('cambiar').addEventListener('click', cambiarModo);

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();   // evita que la página se recargue
  const nombre = document.getElementById('nombre').value.trim();
  const asignatura = document.getElementById('asignatura').value.trim();
  const prioridad = document.getElementById('prioridad').value;
  const duracion = Number(document.getElementById('duracion').value);
  const error = document.getElementById('error');

  if (nombre === '' || asignatura === '') {
    error.textContent = 'Completa el nombre y la asignatura.';
    return;
  }
  if (!(duracion > 0)) {
    error.textContent = 'La duración debe ser mayor que 0.';
    return;
  }
  error.textContent = '';

  tareas.push({
    id: Date.now(),
    nombre: nombre,
    asignatura: asignatura,
    prioridad: prioridad,
    duracion: duracion,
    completada: false
  });
  e.target.reset();     // limpia el formulario
  dibujarTareas();
});

document.getElementById('ordenar').addEventListener('click', () => {
  tareas.sort((a, b) => ORDEN[a.prioridad] - ORDEN[b.prioridad]);
  dibujarTareas();
});

document.getElementById('planear').addEventListener('click', () => {
  const disponible = Number(document.getElementById('disponible').value);
  const resumen = document.getElementById('resumenPlan');
  const lista = document.getElementById('plan');
  lista.innerHTML = '';

  if (!(disponible > 0)) {
    resumen.textContent = 'Escribe cuántos minutos tienes disponibles.';
    return;
  }
  const resultado = generarPlan(disponible);
  if (resultado.plan.length === 0) {
    resumen.textContent = 'Ninguna tarea pendiente cabe en ese tiempo.';
    return;
  }
  resultado.plan.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t.nombre + ' (' + t.duracion + ' min, ' + t.prioridad + ')';
    lista.appendChild(li);
  });
  resumen.textContent = 'Plan: ' + resultado.usado + ' de ' + disponible + ' minutos.';
});

// ---------- 8) ARRANQUE ----------
cargar();
dibujarTareas();   // también actualiza contador y dashboard
dibujar();         // el reloj del temporizador