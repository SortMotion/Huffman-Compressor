# Compresor Huffman Web

Una aplicación web que permite comprimir y descomprimir textos utilizando el **Algoritmo de Huffman**. 

El proyecto permite subir archivos `.txt` locales o buscar y descargar libros clásicos directamente desde Project Gutenberg (vía Gutendex). Todo el procesamiento pesado (análisis, compresión y descompresión) se ejecuta **enteramente en el navegador** utilizando Web Workers, sin necesidad de un backend tradicional.

## Tecnologías y Herramientas

Este proyecto está construido con un stack moderno enfocado en el rendimiento y la seguridad de tipos:

*   **Core:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Empaquetador:** [Vite](https://vitejs.dev/) (Rápido y ligero)
*   **Pruebas:** [Vitest](https://vitest.dev/) + Testing Library + jsdom
*   **Calidad de Código:** ESLint + Prettier
*   **Despliegue:** Vercel (Utilizado también para reescrituras de red y evitar CORS)
*   **Entorno:** Node.js 26.8.2

## Cómo clonar e iniciar el proyecto localmente

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina:

**1. Clona el repositorio**
```bash
git clone [https://github.com/SortMotion/Huffman-Compressor.git](https://github.com/SortMotion/Huffman-Compressor.git)
cd Huffman-Compressor
