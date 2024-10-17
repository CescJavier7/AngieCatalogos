<?php
use Respect\Validation\Validator as v;

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Recoger datos del formulario
    $nombre = filter_var($_POST['nombre'], FILTER_SANITIZE_STRING);
    $correo = filter_var($_POST['correo'], FILTER_VALIDATE_EMAIL);
    $telefono = filter_var($_POST['telefono'], FILTER_SANITIZE_NUMBER_INT);

    // Validar los datos de entrada
    if (empty($nombre) || empty($correo) || empty($telefono)) {
        echo "Error: Los campos son obligatorios.";
    } elseif (!preg_match("/^[a-zA-Z ]+$/", $nombre)) {
        echo "Error: El nombre debe contener solo letras y espacios.";
    } elseif (!preg_match("/^[0-9]{10}$/", $telefono)) {
        echo "Error: El teléfono debe contener solo 10 dígitos.";
    } else {
        // Configurar el correo
        $to = "javiercaiza220158@gmail.com"; // Cambia esto por tu dirección de correo
        $subject = "Nuevo formulario enviado";
        $message = "Nombre y Apellido: $nombre\nCorreo Electrónico: $correo\nNúmero de Teléfono: $telefono";
        $headers = "From: $correo";

        // Enviar el correo
        if (mail($to, $subject, $message, $headers)) {
            echo "Correo enviado con éxito.";
        } else {
            echo "Error al enviar el correo.";
        }
    }
}
?>