// models/usuario.js

class Usuario {
    constructor(nombre, rol, campo, password) {
        this.nombre = nombre;
        this.rol = rol;
        this.campo = campo;
        this.password = password;
    }
}

// Se expone el modelo al contexto global eliminando la sintaxis ESM (import/export)
window.Usuario = Usuario;
