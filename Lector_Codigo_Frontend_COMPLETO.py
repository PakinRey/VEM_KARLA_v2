from pathlib import Path
import os

# --- MEJORA: Se añade el parámetro `archivos_excluidos` ---
def compilar_codigo_en_md(directorio_inicio: Path, archivo_salida: Path, extensiones: list, directorios_excluidos: list, archivos_excluidos: list):
    """
    Recorre un directorio en busca de archivos con las extensiones dadas,
    lee su contenido y lo escribe en un archivo Markdown.
    Ignora los directorios y archivos especificados en las listas de exclusión.

    Args:
        directorio_inicio (Path): La ruta del directorio desde donde empezar a buscar.
        archivo_salida (Path): La ruta del archivo .md donde se guardará todo.
        extensiones (list): Una lista de extensiones de archivo a buscar (ej. ['js', 'jsx']).
        directorios_excluidos (list): Una lista de nombres de directorios a ignorar.
        archivos_excluidos (list): Una lista de nombres de archivo a ignorar (ej. ['package-lock.json']).
    """
    print(f"Buscando archivos en: {directorio_inicio.resolve()}")
    print(f"Extensiones a incluir: {extensiones}")
    print(f"Directorios a excluir: {directorios_excluidos}")
    print(f"Archivos a excluir: {archivos_excluidos}")

    # --- MEJORA: Convertir listas de exclusión a sets para búsquedas más rápidas ---
    set_directorios_excluidos = set(directorios_excluidos)
    set_archivos_excluidos = set(archivos_excluidos)

    # Mapeo de extensiones a identificadores de lenguaje de Markdown
    lang_map = {
        'js': 'javascript',
        'jsx': 'jsx',
        'css': 'css',
        'html': 'html',
        'json': 'json',
        'py': 'python',
        'md': 'markdown',
        'scss': 'scss',
        'sass': 'sass'
    }

    try:
        with archivo_salida.open('w', encoding='utf-8') as f_salida:
            f_salida.write(f"# Compilación de Código del Proyecto: {directorio_inicio.name}\n\n")
            
            archivos_encontrados = []
            for ext in extensiones:
                archivos_encontrados.extend(directorio_inicio.rglob(f'*.{ext}'))

            # --- LÓGICA DE FILTRADO MEJORADA ---
            archivos_filtrados = []
            for ruta_archivo in archivos_encontrados:
                # Condición 1: El nombre del archivo NO debe estar en la lista de exclusión de archivos.
                if ruta_archivo.name in set_archivos_excluidos:
                    continue  # Saltar al siguiente archivo

                # Condición 2: Ninguna parte de la ruta debe ser un directorio excluido.
                # any() devuelve True si encuentra al menos una coincidencia.
                partes_ruta = set(ruta_archivo.parts)
                if not partes_ruta.isdisjoint(set_directorios_excluidos):
                    continue # Saltar al siguiente archivo si hay un directorio excluido en la ruta

                # Si pasa ambos filtros, se añade a la lista.
                archivos_filtrados.append(ruta_archivo)
            
            if not archivos_filtrados:
                print("No se encontraron archivos con las extensiones especificadas (después de filtrar).")
                f_salida.write("## No se encontraron archivos relevantes en este proyecto.\n")
                return

            print(f"Se encontraron {len(archivos_filtrados)} archivos. Compilando en Markdown...")

            # Ordenamos para un resultado consistente
            for ruta_archivo in sorted(archivos_filtrados):
                try:
                    ruta_relativa = ruta_archivo.relative_to(directorio_inicio)
                    extension = ruta_archivo.suffix.lstrip('.')
                    # Usa el mapeo o la propia extensión si no está en el mapa
                    lenguaje = lang_map.get(extension, extension)

                    f_salida.write(f"---\n\n")
                    f_salida.write(f"## Archivo: `{ruta_relativa}`\n\n")
                    f_salida.write(f"```{lenguaje}\n")
                    
                    contenido = ruta_archivo.read_text(encoding='utf-8')
                    f_salida.write(contenido)

                    f_salida.write("\n```\n\n")

                except Exception as e:
                    error_msg = f"No se pudo leer el archivo: {ruta_archivo}. Error: {e}"
                    print(error_msg)
                    f_salida.write(f"// {error_msg}\n\n")

            print(f"¡Éxito! ✨ Todo el código se ha guardado en: {archivo_salida.resolve()}")

    except IOError as e:
        print(f"Error al escribir en el archivo de salida: {e}")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

if __name__ == "__main__":
    # El script se ejecutará en el directorio donde está guardado este archivo .py
    directorio_script = Path(__file__).parent.resolve()
    
    # Nombre del archivo de salida.
    nombre_salida = "codigo_proyecto_VEM_Karla.md"
    ruta_salida = directorio_script / nombre_salida

    # Extensiones de archivo que quieres incluir.
    extensiones_a_buscar = ['js', 'jsx', 'html', 'css', 'json', 'md', 'ts', 'tsx']
    
    # Directorios que quieres excluir de la búsqueda.
    directorios_a_excluir = ['node_modules', 'dist', '.git', '.vscode', 'build']

    # --- NUEVO: Archivos específicos que quieres excluir por su nombre exacto ---
    archivos_a_excluir = ['package-lock.json']

    # Se llama a la función con el nuevo argumento
    compilar_codigo_en_md(
        directorio_script, 
        ruta_salida, 
        extensiones_a_buscar, 
        directorios_a_excluir,
        archivos_a_excluir  # Se pasa la nueva lista
    )