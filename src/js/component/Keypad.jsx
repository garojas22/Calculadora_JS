  import React from "react";

  /**
   * Componente presentacional: la grilla de botones de la calculadora.
   *
   * Props:
   *   - buttons     {Array}    array de configuración de botones (BUTTONS de home.jsx)
   *   - handleClick {Function} función del padre que procesa cada pulsación
   *   - clearLabel  {string}   "AC" o "C" según el estado actual de la expresión
   *
   * Este componente no sabe nada de la lógica de la calculadora.
   * Solo renderiza los botones y delega cada click al padre via el callback handleClick.
   * Ver la nota sobre flujo unidireccional en Screen.jsx.
   */

  // SVG fiel al ícono de borrar de iOS: pentágono redondeado apuntando a la izquierda
  // con una × adentro. Vive en Keypad porque solo este componente lo usa.
  // IMPORTANTE: el handler en home.jsx no lee el textContent del botón — usa el campo
  // `type` del array BUTTONS. Que el botón muestre un SVG no afecta la lógica.
  const DeleteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h11a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 20 20H9
              a1.5 1.5 0 0 1-1.1-.5L2.5 13a1.5 1.5 0 0 1 0-2l5.4-6.5
              A1.5 1.5 0 0 1 9 4z"/>
      <line x1="12" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="12" y2="15"/>
    </svg>
  );

  const Keypad = ({ buttons, handleClick, clearLabel }) => {
    return (
      <>
        {buttons.map(({ label, display, type }) => {
          let className = "button";
          if (type !== "digit") className += ` ${type}`;

          let contenido;
          if (type === "delete")     contenido = <DeleteIcon />;
          else if (type === "clear") contenido = clearLabel;
          else                       contenido = display || label;

          return (
            <button
              key={label}
              className={className}
              onClick={() => handleClick(type, label)}
            >
              {contenido}
            </button>
          );
        })}
      </>
    );
  };

  export default Keypad;
