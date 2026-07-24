
/*FUNCIÓN para redirigir productos y precios a WS */

function sendWhatsAppMessage(button) {
  // Obtén el nombre del producto y el precio desde los atributos personalizados
  const productName = button.getAttribute('data-product-name');
  const productPrice = button.getAttribute('data-product-price');
  
  // Construye el mensaje para enviar
  const message = `Hola, estoy interesad@ en el producto: ${productName}, el cuál tiene un valor de: ${productPrice}, me gustaría obtener información.`;

  // Reemplaza con el número de WhatsApp (con el código de país, sin signos de + o -)
  const phoneNumber = '593980441321'; // Reemplaza con el número real

  // Crea la URL de WhatsApp con el mensaje prellenado
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  // Abre WhatsApp en una nueva pestaña
  window.open(whatsappUrl, '_blank');
}

'use strict';



/**
 * add event on element
 */

const addEventOnElem = function (elem, type, callback) {
  if (elem.length > 1) {
    for (let i = 0; i < elem.length; i++) {
      elem[i].addEventListener(type, callback);
    }
  } else {
    elem.addEventListener(type, callback);
  }
}



/**
 * navbar toggle
 */

const navTogglers = document.querySelectorAll("[data-nav-toggler]");
const navbar = document.querySelector("[data-navbar]");
const navbarLinks = document.querySelectorAll("[data-nav-link]");
const overlay = document.querySelector("[data-overlay]");

const toggleNavbar = function () {
  navbar.classList.toggle("active");
  overlay.classList.toggle("active");
}

addEventOnElem(navTogglers, "click", toggleNavbar);

const closeNavbar = function () {
  navbar.classList.remove("active");
  overlay.classList.remove("active");
}

addEventOnElem(navbarLinks, "click", closeNavbar);



/**
 * header sticky & back top btn active
 */

const header = document.querySelector("[data-header]");
const backTopBtn = document.querySelector("[data-back-top-btn]");

const headerActive = function () {
  if (window.scrollY > 150) {
    header.classList.add("active");
    backTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    backTopBtn.classList.remove("active");
  }
}

addEventOnElem(window, "scroll", headerActive);

let lastScrolledPos = 0;

const headerSticky = function () {
  if (lastScrolledPos >= window.scrollY) {
    header.classList.remove("header-hide");
  } else {
    header.classList.add("header-hide");
  }

  lastScrolledPos = window.scrollY;
}

addEventOnElem(window, "scroll", headerSticky);



/**
 * scroll reveal effect
 */

const sections = document.querySelectorAll("[data-section]");

const scrollReveal = function () {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].getBoundingClientRect().top < window.innerHeight / 2) {
      sections[i].classList.add("active");
    }
  }
}

scrollReveal();

addEventOnElem(window, "scroll", scrollReveal);

/* SCRIPT PARA EL TIEMPO - OFERTA*/
// Define la fecha y hora de la cuenta regresiva
var deadline = new Date("November 19, 2024 00:00:00").getTime();

// Función para redirigir a WhatsApp
function redirectToWhatsApp() {
    var message = "Estoy interesad@ por la oferta especial, OHM SOUL + Desodorante, por un valor de $30.00. Me gustaría obtener más información";
    var phoneNumber = "593980441321"; // Reemplaza con el número de teléfono deseado
    var whatsappUrl = "https://wa.me/" + phoneNumber + "?text=" + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank");
}

// Actualiza la cuenta regresiva cada segundo
var x = setInterval(function() {
    var now = new Date().getTime();
    var t = deadline - now;

    // Calcula los días, horas, minutos y segundos restantes
    var days = Math.floor(t / (1000 * 60 * 60 * 24));
    var hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((t % (1000 * 60)) / 1000);

    // Muestra los resultados en los elementos HTML
    document.getElementById("day").innerHTML = days;
    document.getElementById("hour").innerHTML = hours;
    document.getElementById("minute").innerHTML = minutes;
    document.getElementById("second").innerHTML = seconds;

    // Si la cuenta regresiva ha terminado
    if (t < 0) {
        clearInterval(x);
        document.getElementById("timer").innerHTML = "¡TIEMPO EXPIRADO!";
        document.getElementById("day").innerHTML = '0';
        document.getElementById("hour").innerHTML = '0';
        document.getElementById("minute").innerHTML = '0';
        document.getElementById("second").innerHTML = '0';

        // Desactiva el botón
        var button = document.getElementById("whatsapp-button");
        button.innerHTML = "Tiempo Expirado, pronto habrá una nueva oferta";
        button.classList.add("disabled"); // Agregar una clase para estilizarlo como deshabilitado
        button.onclick = null; // Deshabilitar el evento onclick
    }
}, 1000);
