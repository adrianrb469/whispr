# whispr

## Proyecto 2 - Cifrado de Información CC3078

### Universidad del Valle de Guatemala

#### Project Developers

- **Adrian Rodriguez**
- **Daniel Gomez 21429**
- **Esteban Donis**
- **Abner Ivan Garcia**

End-to-end encrypted messaging app built with a focus on privacy, simplicity, and modern UX.

## Infraestructura

Para la infraestructura del servidor se utilizó la arquitectura servicio-controlador, un patrón ampliamente adoptado en aplicaciones backend modernas por su separación clara de responsabilidades. Esta arquitectura nos permite desacoplar la lógica de negocio (servicios) de la lógica de enrutamiento y respuesta HTTP (controladores), favoreciendo así la escalabilidad, mantenibilidad y facilidad para realizar pruebas unitarias o integración. Además, se empleó el patrón modular para organizar la aplicación en distintos dominios funcionales, lo cual mejora significativamente la estructura del código y facilita el trabajo colaborativo entre desarrolladores.

Cada uno de los features principales del servidor (como autenticación, blockchain, conversaciones, mensajería, usuario, etc.) se encuentra encapsulado en carpetas independientes dentro del proyecto. Estas carpetas incluyen sus propios controladores, servicios, esquemas de datos (schemas) y enrutadores, permitiendo un desarrollo ágil y ordenado.

## Features

### Autenticación Segura

- **Registro y Login Estándar:** Permite a los usuarios registrarse e iniciar sesión con nombre de usuario y contraseña.
- **OAuth 2.0 con GitHub:** Integración para autenticación mediante cuentas de GitHub.
- **Autenticación Multi-Factor (MFA):** Soporte para MFA basado en TOTP (Time-based One-Time Password) para una capa adicional de seguridad. Incluye funcionalidades para configuración, verificación, activación y reseteo de MFA. Si el MFA está activado, el login se realiza hasta después de haber verificado el TOTP, hasta ese momento la sesión obtiene access_token & refresh_token.
- **JSON Web Tokens (JWT):** Gestión de sesiones segura utilizando JWT para tokens de acceso y tokens de refresco.
  - Tokens de acceso con expiración de 1 hora.
  - Tokens de refresco con expiración de 3 horas.
  - Validación y refresco de tokens implementado.
- **Protección de sesiones con JWT y Refresh Tokens.** (Requisito general cubierto por la implementación de JWT)

### Cifrado de Mensajes

- **Mensajes individuales:** Cifrado con AES-256 + RSA/ECC.
- **Chats grupales:** Uso de clave simétrica AES-256-GCM compartida.
- **(EXTRA) Intercambio de claves seguro con X3DH (Signal Protocol).**

### Firma Digital y Hashing

- **Mensajes firmados:** Uso de ECDSA con la clave privada del usuario para firmar mensajes.
- **Verificación de integridad:** Implementación de SHA-256 o SHA-3 para asegurar la integridad de los mensajes.

### Mini Blockchain para Registro de Mensajes

- **Hash encadenado:** Para prevenir la manipulación de mensajes.
- **Registros inmutables:** Las transacciones de mensajes se registran de forma inmutable.

## Getting Started

### Prerequisites

- Node.js (versión recomendada LTS)
- npm (generalmente se instala con Node.js)

### Installation & Running the Server

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/adrianrb469/whispr
    cd whispr
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the necessary environment variables (e.g., `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, database credentials, etc.). Refer to the source code or a sample env file if available for required variables.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

### Installation & Running the Client

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/estebandonis/whispr_front-Cyphers
    cd whispr_front-Cyphers
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the necessary environment variables (e.g., `VITE_GITHUB_CLIENT_ID`, `VITE_SERVER_URL`). Refer to the source code or a sample env file if available for required variables.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
