// ¿Por qué este archivo existe separado del componente?
// Separación entre lógica de negocio y presentación.
// El componente Home sabe CUÁNDO pedir un cálculo (cuando el usuario pulsa "="),
// pero no debería saber CÓMO se calcula. Eso es responsabilidad de esta función.
// Ventaja práctica: si mañana querés cambiar cómo se calcula (por ejemplo, agregar
// soporte para paréntesis), no tocás el componente — solo este archivo.

/**
 * Evalúa una expresión aritmética en formato string respetando precedencia de
 * operadores (* y / antes que + y -), sin usar eval().
 *
 * @param {string} expr - Expresión a calcular, ej: "3+5*2"
 * @returns {string} - El resultado como string, o "Error!" si la expresión es inválida
 */
export function calculate(expr) {
	try {
		// Tokenizar: extraemos números (con decimales) y operadores como piezas separadas.
		// El regex /\d+\.?\d*|[+\-*/]/g hace dos cosas:
		//   \d+\.?\d*  → captura números enteros o decimales (ej: "3", "3.14")
		//   [+\-*/]    → captura un operador como un token individual
		const tokens = expr.match(/\d+\.?\d*|[+\-*/]/g);
		if (!tokens || tokens.length === 0) return "Error!";

		// Convertir cada token: si es operador lo dejamos como string, si es número
		// lo convertimos a float para poder operar matemáticamente después.
		let values = tokens.map(t => (/[+\-*/]/.test(t) ? t : parseFloat(t)));

		// PRIMERA PASADA: resolver * y / de izquierda a derecha.
		// Por qué primero: la precedencia matemática dice que multiplicación y división
		// tienen mayor jerarquía que suma y resta. "2+3*4" debe dar 14, no 20.
		// Técnica: cuando encontramos un * o /, reemplazamos los tres elementos
		// (a, operador, b) por el resultado, achicando el array en el proceso.
		let i = 1;
		while (i < values.length) {
			if (values[i] === "*" || values[i] === "/") {
				const a = values[i - 1];
				const b = values[i + 1];

				// Caso especial: división por cero. En JS daría Infinity, nosotros
				// preferimos mostrar "Error!" para que la UI sea clara.
				if (values[i] === "/" && b === 0) return "Error!";

				// splice(inicio, cuántos borrar, reemplazo): reemplaza a, op, b por el resultado
				values.splice(i - 1, 3, values[i] === "*" ? a * b : a / b);
				// No incrementamos i: el nuevo valor quedó en i-1, el siguiente operador
				// (si existe) está ahora en la misma posición i.
			} else {
				i += 2; // Saltamos: número actual + operador siguiente
			}
		}

		// SEGUNDA PASADA: resolver + y - de izquierda a derecha.
		// Para este punto, el array solo contiene números y los operadores + y -.
		let result = values[0];
		i = 1;
		while (i < values.length) {
			const b = values[i + 1];
			if (values[i] === "+") result += b;
			else if (values[i] === "-") result -= b;
			i += 2;
		}

		// Guardarnos de resultados inválidos (ej: expresión que termina en operador → NaN)
		if (result === undefined || isNaN(result)) return "Error!";

		// toFixed(10) evita ruido de punto flotante como "0.1+0.2 = 0.30000000004".
		// parseFloat luego elimina los ceros a la derecha ("3.5000000000" → "3.5").
		return String(parseFloat(result.toFixed(10)));
	} catch {
		// Si algo inesperado rompe el parser, no queremos que la app explote.
		return "Error!";
	}
}
