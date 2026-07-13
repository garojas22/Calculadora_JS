// useState: hook de React para manejar estado local dentro de un componente funcional.
// useEffect: hook para ejecutar código con "efectos secundarios" — cosas que ocurren
// fuera del render normal, como agregar event listeners al DOM.
import React, { useState, useEffect } from "react";

// La función de cálculo vive en utils/calculate.js — separamos lógica de negocio
// de la lógica de presentación. Este componente no sabe cómo se calcula, solo cuándo pedirlo.
import { calculate } from "../utils/calculate.js";

// Configuración de los botones como datos, no como JSX hardcodeado.
// Ventaja: si mañana querés agregar un botón o cambiar un label, solo tocás este array.
// Cada botón tiene un "type" que el handler usa para decidir qué acción tomar.
const BUTTONS = [
	{ label: "C", type: "clear" },
	{ label: "⌫", type: "delete" },
	{ label: "/", type: "operator" },
	{ label: "*", type: "operator" },
	{ label: "7", type: "digit" },
	{ label: "8", type: "digit" },
	{ label: "9", type: "digit" },
	{ label: "-", type: "operator" },
	{ label: "4", type: "digit" },
	{ label: "5", type: "digit" },
	{ label: "6", type: "digit" },
	{ label: "+", type: "operator" },
	{ label: "1", type: "digit" },
	{ label: "2", type: "digit" },
	{ label: "3", type: "digit" },
	{ label: "=", type: "equals" },
	{ label: "0", type: "digit" },
	{ label: ".", type: "digit" },
];

const Home = () => {
	// useState("0"): el estado inicial de la pantalla es el string "0".
	// React re-renderiza el componente cada vez que setExpresion es llamado con un nuevo valor.
	// Usamos un solo string para toda la expresión ("12+8", "3.14*2") porque la calculadora
	// muestra la expresión completa en pantalla mientras el usuario la escribe.
	const [expresion, setExpresion] = useState("0");

	// Handler central que recibe el tipo de botón y su label.
	// Toda la lógica de qué hace cada botón vive acá — un solo lugar para buscar si algo falla.
	const handleClick = (type, label) => {
		if (type === "clear") {
			setExpresion("0");
			return;
		}

		if (type === "delete") {
			// Si queda un solo carácter o hay un error, volver a cero en vez de quedar vacío
			if (expresion.length === 1 || expresion === "Error!") {
				setExpresion("0");
			} else {
				setExpresion(expresion.slice(0, -1));
			}
			return;
		}

		if (type === "equals") {
			// Delegamos el cálculo a la función externa — este componente no sabe el "cómo"
			setExpresion(calculate(expresion));
			return;
		}

		// Guardia contra doble punto decimal en el número actual.
		// Cuando el usuario escribe "3.5" y pulsa "." otra vez, no tiene sentido agregarlo.
		// Técnica: dividimos la expresión por el último operador para aislar el número
		// que se está escribiendo ahora. Si ese número ya tiene un ".", ignoramos el input.
		// Ejemplo: expresion = "12+3.5", split por [+\-*/] → ["12", "3.5"], pop() → "3.5"
		// "3.5".includes(".") → true → ignoramos.
		if (label === ".") {
			const numeroActual = expresion.split(/[+\-*/]/).pop();
			if (numeroActual.includes(".")) return;
		}

		// Si la pantalla muestra "0" o "Error!", reemplazamos en vez de concatenar.
		// Si no, concatenamos el nuevo carácter a la expresión existente.
		if (expresion === "0" || expresion === "Error!") {
			// Caso especial: si el primer carácter es un operador (ej: el usuario pulsa "+"),
			// lo dejamos concatenar igual para permitir expresiones como "-5" en el futuro.
			// Por ahora simplemente reemplazamos el "0" con lo que se presionó.
			setExpresion(label);
		} else {
			setExpresion(expresion + label);
		}
	};

	// useEffect: registramos el listener de teclado como efecto secundario.
	// ¿Por qué no directamente en el render? Porque window.addEventListener no tiene nada
	// que ver con la UI de React — es una operación "fuera" del árbol de componentes.
	// useEffect es el lugar correcto para este tipo de interacciones con el DOM externo.
	useEffect(() => {
		const onKeyDown = (e) => {
			const tecla = e.key;

			// Dígitos del 0 al 9
			if (tecla >= "0" && tecla <= "9") {
				handleClick("digit", tecla);
			// Operadores aritméticos
			} else if (["+", "-", "*", "/"].includes(tecla)) {
				handleClick("operator", tecla);
			// Punto decimal
			} else if (tecla === ".") {
				handleClick("digit", ".");
			// Enter o "=" calculan el resultado
			} else if (tecla === "Enter" || tecla === "=") {
				handleClick("equals", "=");
			// Backspace borra el último carácter
			} else if (tecla === "Backspace") {
				handleClick("delete", "⌫");
			// Escape o C/c limpian la pantalla
			} else if (tecla === "Escape" || tecla === "c" || tecla === "C") {
				handleClick("clear", "C");
			}
		};

		window.addEventListener("keydown", onKeyDown);

		// CLEANUP — función de retorno del useEffect.
		// ¿Por qué es obligatorio hacer esto? Porque useEffect se re-ejecuta cada vez
		// que cambia `expresion` (ver el array de dependencias abajo). Sin cleanup,
		// cada vez que el usuario pulsa una tecla se agregaría UN NUEVO listener sin
		// eliminar el anterior. Después de 10 teclas habría 10 listeners activos,
		// cada uno disparando handleClick — la calculadora se comportaría de manera errática.
		// El cleanup remueve el listener ANTES de que el efecto se re-ejecute.
		return () => window.removeEventListener("keydown", onKeyDown);

		// Array de dependencias: [expresion]
		// ¿Por qué está expresion aquí? Porque handleClick usa expresion en su cuerpo
		// (para comparar, para hacer slice, etc.). Si no lo incluimos, el closure que
		// captura handleClick vería siempre el valor de expresion del primer render ("0"),
		// nunca el valor actualizado — esto se llama "stale closure" (closure desactualizado).
		// Al listar expresion aquí, React sabe que cuando expresion cambie, debe correr
		// el cleanup del efecto anterior y registrar un listener fresco con el valor nuevo.
	}, [expresion]);

	return (
		<div className="calculadora">
			<div className="pantalla">{expresion}</div>

			{/* Generamos los botones iterando el array BUTTONS.
			    key={label} es requerido por React para identificar cada elemento de la lista
			    de forma eficiente al re-renderizar. */}
			{BUTTONS.map(({ label, type }) => {
				let className = "button";
				// Clases especiales para los botones que tienen tamaño diferente en la grilla
				if (type === "equals") className += " button-equals"; // span 2 filas
				if (label === "0") className += " button-zero";       // span 2 columnas
				return (
					<button
						key={label}
						className={className}
						onClick={() => handleClick(type, label)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
};

export default Home;
