import React, { useState, useEffect, useRef } from "react";
import { calculate } from "../utils/calculate.js";

// SEPARACIÓN ENTRE "LO QUE SE CALCULA" Y "LO QUE SE MUESTRA":
// La expresión interna siempre usa * y / (operadores válidos de JS).
// formatear() traduce esos símbolos a × y ÷ SOLO al momento de renderizar.
// El estado y el parser nunca ven × ni ÷.
const formatear = (expr) => expr.replace(/\*/g, "×").replace(/\//g, "÷");

// SVG fiel al ícono de borrar de iOS: pentágono redondeado apuntando a la izquierda
// con una × adentro. Se define como componente para poder usarlo en el JSX del botón.
// IMPORTANTE: el handler NO lee el textContent del botón — usa el campo `type` del
// array BUTTONS. Que el botón muestre un SVG en vez de texto no afecta la lógica.
const DeleteIcon = () => (
	<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
		stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
		strokeLinejoin="round">
		<path d="M9 4h11a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 20 20H9
		         a1.5 1.5 0 0 1-1.1-.5L2.5 13a1.5 1.5 0 0 1 0-2l5.4-6.5
		         A1.5 1.5 0 0 1 9 4z"/>
		<line x1="12" y1="9" x2="17" y2="15"/>
		<line x1="17" y1="9" x2="12" y2="15"/>
	</svg>
);

// Layout idéntico a la calculadora de iOS (4 columnas, 5 filas).
// "label" es el valor interno que maneja la lógica; "display" (opcional) es
// lo que ve el usuario en el botón cuando difiere del label.
const BUTTONS = [
	// Fila 1: funciones (gris claro) | operadores (naranja)
	{ label: "⌫",   type: "delete" },
	{ label: "AC",  type: "clear" },
	{ label: "%",   type: "percent" },
	{ label: "/",   display: "÷",  type: "operator" },
	// Fila 2
	{ label: "7",   type: "digit" },
	{ label: "8",   type: "digit" },
	{ label: "9",   type: "digit" },
	{ label: "*",   display: "×",  type: "operator" },
	// Fila 3
	{ label: "4",   type: "digit" },
	{ label: "5",   type: "digit" },
	{ label: "6",   type: "digit" },
	{ label: "-",   display: "−",  type: "operator" },
	// Fila 4
	{ label: "1",   type: "digit" },
	{ label: "2",   type: "digit" },
	{ label: "3",   type: "digit" },
	{ label: "+",   type: "operator" },
	// Fila 5
	{ label: "+/-", type: "sign" },
	{ label: "0",   type: "digit" },
	{ label: ".",   type: "digit" },
	{ label: "=",   type: "equals" },
];

// Extrae el último número de la expresión, manejando tanto "12" como "(-12)".
// Se usa para verificar si el número actual ya tiene punto decimal.
const getNumeroActual = (expr) => {
	const match = expr.match(/\(-\d+\.?\d*\)$|(\d+\.?\d*)$/);
	return match ? match[0] : "";
};

const Home = () => {
	// expresion: la expresión interna. Nunca contiene × ni ÷.
	// Puede contener negativos entre paréntesis: "5+(-2)".
	const [expresion, setExpresion] = useState("0");

	// vistaPrevia: expresión FORMATEADA que se calculó al presionar "=".
	// Cuando está vacío → modo "escribiendo".
	// Cuando tiene contenido → modo "mostrando resultado".
	// Esta distinción controla si el próximo dígito arranca de cero o continúa.
	const [vistaPrevia, setVistaPrevia] = useState("");

	// Referencia al div del texto principal para controlar su scroll desde JS.
	const pantallaRef = useRef(null);

	const handleClick = (type, label) => {

		// ── LIMPIAR ──────────────────────────────────────────────────────────
		if (type === "clear") {
			setExpresion("0");
			setVistaPrevia("");
			return;
		}

		// ── BORRAR ───────────────────────────────────────────────────────────
		if (type === "delete") {
			setVistaPrevia("");
			if (expresion.length === 1 || expresion === "Error!") {
				setExpresion("0");
			} else if (/\(-\d+\.?\d*\)$/.test(expresion)) {
				// Si la expresión termina en un negativo "(-n)", borramos todo el
				// bloque de una vez — borrar carácter por carácter dejaría "(-n" inválido.
				const sinNegativo = expresion.replace(/\(-\d+\.?\d*\)$/, "");
				setExpresion(sinNegativo || "0");
			} else {
				setExpresion(expresion.slice(0, -1));
			}
			return;
		}

		// ── IGUAL ────────────────────────────────────────────────────────────
		if (type === "equals") {
			// BUG FIX #3: si la expresión termina en operador (ej: "5+"), quitarlo
			// antes de calcular. "5+" → calcula "5" → muestra "5".
			// Razón: un operador colgante no tiene segundo operando, no tiene sentido
			// calcularlo y devolver "Error!" cuando podemos resolverlo elegantemente.
			const exprLimpia = expresion.replace(/[+\-*/]$/, "") || "0";
			const resultado = calculate(exprLimpia);
			setVistaPrevia(formatear(exprLimpia));
			setExpresion(resultado);
			return;
		}

		// ── CAMBIO DE SIGNO (+/-) — operación involutiva ─────────────────────
		// "Involutiva" significa f(f(x)) = x: "880" → "(-880)" → "880" → ...
		// Se usa un único regex de alternación para detectar Y reemplazar en una
		// sola operación, garantizando simetría (el bug anterior usaba dos regex
		// separados que podían divergir y acumular signos).
		if (type === "sign") {
			if (expresion === "0") return;
			setVistaPrevia("");
			const resultado = expresion.replace(
				/(?:\(-(\d+\.?\d*)\)|(\d+\.?\d*))$/,
				(match, numNegativo, numPositivo) =>
					numNegativo !== undefined ? numNegativo : `(-${numPositivo})`
			);
			if (resultado !== expresion) setExpresion(resultado);
			return;
		}

		// ── PORCENTAJE ────────────────────────────────────────────────────────
		// Divide el número actual por 100. No toca el resto de la expresión.
		// Ej: "200+50" → "200+0.5"  |  "(-50)" → "(-0.5)"
		if (type === "percent") {
			if (expresion === "0") return;
			setVistaPrevia("");
			if (/\(-\d+\.?\d*\)$/.test(expresion)) {
				setExpresion(expresion.replace(/\(-(\d+\.?\d*)\)$/, (_, n) =>
					`(-${parseFloat(n) / 100})`
				));
			} else if (/\d+\.?\d*$/.test(expresion)) {
				setExpresion(expresion.replace(/(\d+\.?\d*)$/, match =>
					String(parseFloat(match) / 100)
				));
			}
			return;
		}

		// ── LÓGICA POST-RESULTADO ─────────────────────────────────────────────
		// Cuando vistaPrevia está activo, la pantalla muestra un resultado.
		// El próximo input decide qué pasa:
		//   DÍGITO → nueva expresión desde cero (el resultado se descarta)
		//   OPERADOR → continúa operando sobre el resultado (ej: 25 → "+" → "25+")
		if (vistaPrevia) {
			setVistaPrevia("");
			if (type === "digit") {
				setExpresion(label);
			} else if (type === "operator") {
				setExpresion(expresion === "Error!" ? "0" : expresion + label);
			}
			return;
		}

		// ── OPERADOR ──────────────────────────────────────────────────────────
		if (type === "operator") {
			// BUG FIX #1 y #2: antes, los operadores se concatenaban sin control,
			// permitiendo "5++" o convertir el "0" inicial en "+".

			// #2: ignorar operadores cuando no hay número previo.
			// No tiene sentido empezar una expresión con un operador.
			if (expresion === "0" || expresion === "Error!") return;

			// #1: si la expresión ya termina en operador, REEMPLAZAR en vez de acumular.
			// Ej: el usuario escribió "5+" y quiere cambiar a "5×" → da "5*", no "5+*".
			if (/[+\-*/]$/.test(expresion)) {
				setExpresion(expresion.slice(0, -1) + label);
			} else {
				setExpresion(expresion + label);
			}
			return;
		}

		// ── DÍGITOS Y PUNTO DECIMAL ───────────────────────────────────────────
		// A partir de aquí solo quedan type === "digit" (dígitos 0-9 y ".").
		// Manejamos cuatro situaciones distintas en orden de prioridad:

		// CASO A: la expresión termina en operador → empieza un número nuevo.
		// BUG FIX #5: si el primer carácter del nuevo número es ".", anteponer "0"
		// para que quede "5+0." en vez del feo "5+." que el parser ignoraría.
		if (/[+\-*/]$/.test(expresion)) {
			setExpresion(expresion + (label === "." ? "0." : label));
			return;
		}

		// CASO B: pantalla muestra "0" o "Error!" → reemplazar con el nuevo input.
		// BUG FIX #4: si el primer input es ".", mostrar "0." en vez de solo ".".
		if (expresion === "0" || expresion === "Error!") {
			setExpresion(label === "." ? "0." : label);
			return;
		}

		// CASO C: el número actual es un cero suelto (ej: "5+0").
		// BUG FIX #6: prevenir ceros a la izquierda como "5+07".
		// El regex /(^|[+\-*/])0$/ detecta un "0" que está al inicio o justo
		// después de un operador, sin dígitos previos que lo conviertan en "10", "20", etc.
		if (/(^|[+\-*/])0$/.test(expresion)) {
			if (label === "0") return;                              // "00" → sigue "0"
			if (label === ".") {
				setExpresion(expresion + ".");                      // "5+0" + "." → "5+0."
			} else {
				setExpresion(expresion.slice(0, -1) + label);      // "5+0" + "7" → "5+7"
			}
			return;
		}

		// CASO D: guardia contra punto decimal duplicado en el número actual.
		// Ej: "3.5" + "." → ignorar. "5+3.5" + "." → ignorar.
		if (label === ".") {
			const numActual = getNumeroActual(expresion).replace(/[()]/g, "").replace("-", "");
			if (numActual.includes(".")) return;
		}

		// CASO E: concatenación normal.
		setExpresion(expresion + label);
	};

	// Scroll al final de la pantalla cuando cambia la expresión.
	// scrollLeft = scrollWidth mueve el viewport al extremo derecho (último carácter),
	// sin tocar el orden natural del texto (a diferencia del antiguo direction: rtl).
	useEffect(() => {
		if (pantallaRef.current) {
			pantallaRef.current.scrollLeft = pantallaRef.current.scrollWidth;
		}
	}, [expresion]);

	// DETALLE iOS: el botón de limpiar muestra "C" mientras hay algo escrito
	// y "AC" cuando la pantalla está en cero limpio.
	const clearLabel = expresion !== "0" ? "C" : "AC";

	return (
		<div className="calculadora">
			<div className="pantalla">
				{/* Vista previa SIEMPRE renderizada (sin condicional &&) para que el
				    layout no salte cuando aparece o desaparece. El espacio está reservado
				    por min-height en CSS aunque el div esté vacío. */}
				<div className="vista-previa">{vistaPrevia}</div>

				<div className="pantalla__expr" ref={pantallaRef}>
					{formatear(expresion)}
				</div>
			</div>

			{BUTTONS.map(({ label, display, type }) => {
				let className = "button";
				if (type !== "digit") className += ` ${type}`;

				let contenido;
				if (type === "delete")      contenido = <DeleteIcon />;
				else if (type === "clear")  contenido = clearLabel;
				else                        contenido = display || label;

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
		</div>
	);
};

export default Home;
