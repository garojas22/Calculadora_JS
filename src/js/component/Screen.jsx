import React, { useEffect, useRef } from "react";

/**
 * Componente presentacional: la pantalla de la calculadora.
 *
 * Props:
 *   - exprFormateada {string}  la expresión ya formateada para mostrar (× en vez de *, ÷ en vez de /)
 *   - vistaPrevia    {string}  la operación anterior al "=", o "" cuando no hay resultado activo
 *   - fontClass      {string}  clase CSS de escala ("pantalla-md" | "pantalla-sm" | "pantalla-xs" | "")
 *
 * Este componente es "presentacional" (también llamado "tonto" o dumb component):
 * no toma decisiones ni tiene useState. Solo muestra lo que el padre le pasa.
 *
 * ¿Por qué el estado vive en el padre (Home) y no acá?
 * Flujo unidireccional de datos — el principio central de React:
 *   - Los datos "bajan" de padre a hijo por props.
 *   - Los eventos "suben" de hijo a padre por callbacks (funciones pasadas como props).
 * Un hijo nunca modifica directamente el estado del padre; en su lugar, llama
 * una función que el padre le pasó, y el padre decide si actualizar su estado.
 * Esto hace el flujo de datos predecible y fácil de depurar.
 *
 * La única excepción aquí son el useRef y useEffect para el auto-scroll:
 * son un efecto secundario de la presentación (mover el scroll), no lógica de negocio.
 * No afectan el estado de la app, por eso viven aquí junto a lo que renderizan.
 */
const Screen = ({ exprFormateada, vistaPrevia, fontClass }) => {
  const pantallaRef = useRef(null);

  // Auto-scroll al último carácter cada vez que cambia el texto mostrado.
  // scrollLeft = scrollWidth mueve el viewport al extremo derecho,
  // sin invertir el orden del texto (a diferencia del antiguo "direction: rtl").
  useEffect(() => {
    if (pantallaRef.current) {
      pantallaRef.current.scrollLeft = pantallaRef.current.scrollWidth;
    }
  }, [exprFormateada]);

  return (
    <div className={`pantalla${fontClass ? ` ${fontClass}` : ""}`}>
      {/* Vista previa SIEMPRE renderizada (sin condicional &&) para que el
          layout no salte cuando aparece o desaparece. El espacio está
          reservado por min-height en CSS aunque el div esté vacío. */}
      <div className="vista-previa">{vistaPrevia}</div>

      <div className="pantalla__expr" ref={pantallaRef}>
        {exprFormateada}
      </div>
    </div>
  );
};

export default Screen;
