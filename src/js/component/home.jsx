	import React, { useState } from "react";
	import { calculate } from "../utils/calculate.js";
	import Screen from "./Screen.jsx";
	import Keypad from "./Keypad.jsx";

	// SEPARACIÓN ENTRE "LO QUE SE CALCULA" Y "LO QUE SE MUESTRA":
	// La expresión interna siempre usa * y / (operadores válidos en JS/cálculo).
	// formatear() traduce esos símbolos a × y ÷ SOLO al momento de renderizar.
	// El estado y el parser nunca ven × ni ÷.
	const formatear = (expr) => expr.replace(/\*/g, "×").replace(/\//g, "÷");

	// Layout idéntico a la calculadora de iOS (4 columnas, 5 filas).
	// "label" es el valor interno que maneja la lógica; "display" (opcional) es
	// lo que ve el usuario cuando difiere del label.
	const BUTTONS = [
	// Fila 1: funciones (gris claro) | operadores (naranja)
	{ label: "⌫",   type: "delete" },
	{ label: "AC",  type: "clear" },
	{ label: "%",   type: "percent" },
	{ label: "/",   display: "÷",  type: "operator" },
	// Fila 2
	{ label: "7",   type: "digit" }, { label: "8", type: "digit" }, { label: "9", type: "digit" },
	{ label: "*",   display: "×",  type: "operator" },
	// Fila 3
	{ label: "4",   type: "digit" }, { label: "5", type: "digit" }, { label: "6", type: "digit" },
	{ label: "-",   display: "−",  type: "operator" },
	// Fila 4
	{ label: "1",   type: "digit" }, { label: "2", type: "digit" }, { label: "3", type: "digit" },
	{ label: "+",   type: "operator" },
	// Fila 5
	{ label: "+/-", type: "sign" },
	{ label: "0",   type: "digit" },
	{ label: ".",   type: "digit" },
	{ label: "=",   type: "equals" },
	];

	// Extrae el último número de la expresión, incluyendo:
	//   - Negativos entre paréntesis: "(-3.5)" o "(-1.2e10)"
	//   - Positivos normales: "42", "3.14", "5.5e19"
	// Se usa para verificar si el número actual ya tiene punto decimal.
	const getNumeroActual = (expr) => {
	const match = expr.match(
		/\(-\d+\.?\d*(?:e[+-]?\d+)?\)$|(\d+\.?\d*(?:e[+-]?\d+)?)$/
	);
	return match ? match[0] : "";
	};

	// ESCALADO DINÁMICO DE FUENTE:
	// En lugar de "medir" el DOM con getBoundingClientRect, derivamos la clase CSS
	// directamente de la longitud del string que se va a mostrar.
	// Esto es posible porque los estilos en React se derivan del estado igual que
	// el contenido: cualquier cosa que dependa de los datos puede calcularse en render,
	// sin necesidad de acceder al DOM.
	//
	// Umbrales calibrados para 320px de ancho con la fuente base de 4rem:
	//    < 9 chars  → tamaño completo (default)
	//   ≥ 9 chars   → pantalla-md (~70% del tamaño base)
	//   ≥ 13 chars  → pantalla-sm (~55% del tamaño base)
	//   ≥ 16 chars  → pantalla-xs (~45% del tamaño base)
	const getFontClass = (text) => {
	const len = text.length;
	if (len >= 16) return "pantalla-xs";
	if (len >= 13) return "pantalla-sm";
	if (len >= 9)  return "pantalla-md";
	return "";
	};

	// ─────────────────────────────────────────────────────────────────────────────
	// Home es el componente "cerebro" (también llamado "contenedor" o smart component):
	// es el único con estado (useState). Los componentes hijos (Screen, Keypad) son
	// "tontos" — solo reciben datos por props y comunican eventos por callbacks.
	//
	// FLUJO UNIDIRECCIONAL DE DATOS (concepto central de React):
	//   datos bajan  →  Home pasa expresion/vistaPrevia/fontClass a Screen y Keypad
	//   eventos suben →  Keypad llama handleClick → Home actualiza estado → re-render
	// Nunca un hijo modifica directamente el estado del padre.
	// ─────────────────────────────────────────────────────────────────────────────
	const Home = () => {
	// expresion: la expresión interna. Nunca contiene × ni ÷.
	// Puede contener negativos entre paréntesis ("5+(-2)") o notación científica
	// ("5.5e19") cuando el resultado de un cálculo lo requiere.
	const [expresion, setExpresion] = useState("0");

	// vistaPrevia: expresión FORMATEADA que se calculó al presionar "=".
	// Vacío → modo "escribiendo". Con contenido → modo "mostrando resultado".
	// Esta distinción controla si el próximo dígito arranca de cero o continúa.
	const [vistaPrevia, setVistaPrevia] = useState("");

	const handleClick = (type, label) => {

		// ── LIMPIAR ──────────────────────────────────────────────────────────────
		if (type === "clear") { setExpresion("0"); setVistaPrevia(""); return; }

		// ── BORRAR ───────────────────────────────────────────────────────────────
		if (type === "delete") {
		setVistaPrevia("");
		if (expresion.length === 1 || expresion === "Error!") {
			setExpresion("0");
		} else if (/\(-\d+\.?\d*(?:e[+-]?\d+)?\)$/.test(expresion)) {
			// Si termina en un negativo "(-n)" o "(-1.5e10)", borramos todo el bloque
			// de una vez — borrarlo carácter a carácter dejaría "(-n" inválido.
			const sinNegativo = expresion.replace(/\(-\d+\.?\d*(?:e[+-]?\d+)?\)$/, "");
			setExpresion(sinNegativo || "0");
		} else {
			setExpresion(expresion.slice(0, -1));
		}
		return;
		}

		// ── IGUAL ────────────────────────────────────────────────────────────────
		if (type === "equals") {
		// Si la expresión termina en operador (ej: "5+"), quitarlo antes de calcular.
		// "5+" → calcula "5" → muestra "5". Razón: un operador sin segundo operando
		// no tiene sentido calcularlo y devolver "Error!" cuando podemos resolverlo.
		const exprLimpia = expresion.replace(/[+\-*/]$/, "") || "0";
		const resultado = calculate(exprLimpia);
		setVistaPrevia(formatear(exprLimpia));
		setExpresion(resultado);
		return;
		}

		// ── CAMBIO DE SIGNO (+/-) — operación involutiva ─────────────────────────
		// "Involutiva" significa f(f(x)) = x: "880" → "(-880)" → "880" → ...
		// Un único regex de alternación detecta Y reemplaza en un solo paso,
		// garantizando simetría. Soporta notación científica: "5.5e19" → "(-5.5e19)".
		if (type === "sign") {
		if (expresion === "0") return;
		setVistaPrevia("");
		const resultado = expresion.replace(
			/(?:\(-(\d+\.?\d*(?:e[+-]?\d+)?)\)|(\d+\.?\d*(?:e[+-]?\d+)?))$/,
			(match, numNegativo, numPositivo) =>
			numNegativo !== undefined ? numNegativo : `(-${numPositivo})`
		);
		if (resultado !== expresion) setExpresion(resultado);
		return;
		}

		// ── PORCENTAJE ────────────────────────────────────────────────────────────
		// Divide el número actual por 100. No toca el resto de la expresión.
		// Ej: "200+50" → "200+0.5"  |  "(-50)" → "(-0.5)"  |  "5.5e19" → "5.5e17"
		// Los patrones incluyen notación científica para manejar resultados previos.
		if (type === "percent") {
		if (expresion === "0") return;
		setVistaPrevia("");
		if (/\(-\d+\.?\d*(?:e[+-]?\d+)?\)$/.test(expresion)) {
			setExpresion(expresion.replace(
			/\(-(\d+\.?\d*(?:e[+-]?\d+)?)\)$/,
			(_, n) => `(-${parseFloat(n) / 100})`
			));
		} else if (/\d+\.?\d*(?:e[+-]?\d+)?$/.test(expresion)) {
			setExpresion(expresion.replace(
			/(\d+\.?\d*(?:e[+-]?\d+)?)$/,
			match => String(parseFloat(match) / 100)
			));
		}
		return;
		}

		// ── LÓGICA POST-RESULTADO ─────────────────────────────────────────────────
		// Cuando vistaPrevia está activo, la pantalla muestra un resultado.
		// El próximo input decide qué pasa:
		//   DÍGITO   → nueva expresión desde cero (el resultado se descarta)
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

		// ── OPERADOR ──────────────────────────────────────────────────────────────
		if (type === "operator") {
		// Ignorar si no hay número previo (no tiene sentido empezar con operador).
		if (expresion === "0" || expresion === "Error!") return;
		// Si ya termina en operador, reemplazar en vez de acumular.
		// Ej: "5+" → usuario cambia a "5×" → da "5*", no "5+*".
		if (/[+\-*/]$/.test(expresion)) {
			setExpresion(expresion.slice(0, -1) + label);
		} else {
			setExpresion(expresion + label);
		}
		return;
		}

		// ── DÍGITOS Y PUNTO DECIMAL ───────────────────────────────────────────────
		// Solo quedan type === "digit" (dígitos 0-9 y ".").
		// Cuatro casos en orden de prioridad:

		// CASO A: la expresión termina en operador → empieza un número nuevo.
		// Si el primer carácter del nuevo número es ".", anteponer "0": "5+." → "5+0."
		if (/[+\-*/]$/.test(expresion)) {
		setExpresion(expresion + (label === "." ? "0." : label));
		return;
		}

		// CASO B: pantalla muestra "0" o "Error!" → reemplazar con el nuevo input.
		// Si el primer input es ".", mostrar "0." en vez de solo ".".
		if (expresion === "0" || expresion === "Error!") {
		setExpresion(label === "." ? "0." : label);
		return;
		}

		// CASO C: el número actual es un cero suelto después de operador (ej: "5+0").
		// Previene ceros a la izquierda como "5+07".
		if (/(^|[+\-*/])0$/.test(expresion)) {
		if (label === "0") return;                             // "00" → sigue "0"
		if (label === ".") { setExpresion(expresion + "."); } // "5+0" + "." → "5+0."
		else { setExpresion(expresion.slice(0, -1) + label); }// "5+0" + "7" → "5+7"
		return;
		}

		// CASO D: guardia contra punto decimal duplicado en el número actual.
		// "3.5" + "." → ignorar.   "5+3.5" + "." → ignorar.
		if (label === ".") {
		const numActual = getNumeroActual(expresion).replace(/[()]/g, "").replace("-", "");
		if (numActual.includes(".")) return;
		}

		// CASO E: concatenación normal.
		setExpresion(expresion + label);
	};

	// DETALLE iOS: el botón de limpiar muestra "C" mientras hay algo escrito
	// y "AC" cuando la pantalla está en cero limpio.
	const clearLabel = expresion !== "0" ? "C" : "AC";

	// El texto que el usuario ve en pantalla. Se calcula aquí (en el padre) para
	// poder derivar también la clase de fuente, y se pasa hacia abajo por props.
	const exprFormateada = formatear(expresion);

	// La clase de escala se deriva de la longitud del texto visible.
	// No necesitamos medir el DOM — la longitud del string es suficiente.
	const fontClass = getFontClass(exprFormateada);

	return (
		<div className="calculadora">
		<Screen
			exprFormateada={exprFormateada}
			vistaPrevia={vistaPrevia}
			fontClass={fontClass}
		/>
		<Keypad
			buttons={BUTTONS}
			handleClick={handleClick}
			clearLabel={clearLabel}
		/>
		</div>
	);
	};

	export default Home;
