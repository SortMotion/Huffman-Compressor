import { MAX_INPUT_BYTES } from '../contracts/constants';
import { formatBytes } from './utils';

export interface UserMessage {
  title: string;
  message: string;
}

const LIMIT = formatBytes(MAX_INPUT_BYTES);

const MESSAGES: Record<string, Record<string, UserMessage>> = {
  HuffmanError: {
    INVALID_TREE: {
      title: 'Diccionario inválido',
      message: 'La tabla de códigos de Huffman no corresponde con los datos.',
    },
    INVALID_BITS: {
      title: 'Datos dañados',
      message: 'Los datos comprimidos contienen una secuencia de bits que no es válida.',
    },
    TRUNCATED: {
      title: 'Datos incompletos',
      message: 'Los datos comprimidos terminan antes de lo esperado.',
    },
  },
  FormatError: {
    BAD_MAGIC: {
      title: 'No es un archivo .ycoma',
      message: 'El archivo no empieza con la firma "HUF!" del formato .ycoma.',
    },
    UNSUPPORTED_VERSION: {
      title: 'Versión no soportada',
      message: 'El archivo se creó con una versión del formato que esta app no conoce.',
    },
    TRUNCATED: {
      title: 'Archivo incompleto',
      message: 'El archivo .ycoma está cortado. Vuelve a descargarlo o a generarlo.',
    },
    INCONSISTENT: {
      title: 'Archivo dañado',
      message: 'La cabecera del archivo .ycoma tiene datos que no cuadran entre sí.',
    },
    TOO_LARGE: {
      title: 'Archivo demasiado grande',
      message: `El límite es de ${LIMIT} por archivo.`,
    },
    INVALID_NAME: {
      title: 'Nombre no válido',
      message: 'El nombre del archivo es demasiado largo (máximo 255 bytes) o no es UTF-8.',
    },
  },
  SourceError: {
    NETWORK: {
      title: 'Sin conexión',
      message: 'No se pudo contactar al servidor de libros. Revisa tu conexión e intenta de nuevo.',
    },
    HTTP: {
      title: 'El servidor respondió con un error',
      message: 'Gutendex o Project Gutenberg no respondieron bien. Intenta de nuevo en un momento.',
    },
    NO_TEXT: {
      title: 'Libro sin texto plano',
      message: 'Este libro no tiene una versión .txt disponible. Prueba con otro.',
    },
    ABORTED: { title: 'Descarga cancelada', message: 'Cancelaste la descarga del libro.' },
    TOO_LARGE: {
      title: 'Libro demasiado grande',
      message: `El libro supera el límite de ${LIMIT}.`,
    },
  },
};

/**
 * Traduce cualquier error de la app a un mensaje para el usuario.
 * Se basa en `name` y `code` (no en `instanceof`) para funcionar también con
 * errores que llegan del Web Worker.
 */
export function toUserMessage(err: unknown): UserMessage {
  if (err && typeof err === 'object') {
    const { name, code, message } = err as { name?: string; code?: string; message?: string };
    if (name === 'AbortError') {
      return { title: 'Operación cancelada', message: 'La operación se canceló.' };
    }
    const known = name && code ? MESSAGES[name]?.[code] : undefined;
    if (known) return known;
    if (message) return { title: 'Ocurrió un error', message };
  }
  return { title: 'Ocurrió un error', message: 'Algo salió mal. Intenta de nuevo.' };
}

/** `true` si el error es una cancelación hecha por el usuario (no hay que mostrarla). */
export function isAbort(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  const code = (err as { code?: string } | null)?.code;
  return name === 'AbortError' || (name === 'SourceError' && code === 'ABORTED');
}
