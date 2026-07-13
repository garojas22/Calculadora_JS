// ¿Por qué este archivo existe separado del componente?
// Separación entre lógica de negocio y presentación.
// El componente Home sabe CUÁNDO pedir un cálculo (cuando el usuario pulsa "="),
// pero no debería saber CÓMO se calcula. Eso es responsabilidad de esta función.

/**
 * Evalúa una expresión aritmética en formato string respetando precedencia de
 * operadores (* y / antes que + y -), sin usar eval().
 * Soporta números negativos escritos como "(-n)", ej: "5+(-2)", "(-3)*4".
 *
 * @param {string} expr - Expresión a calcular, ej: "3+5*2" o "(-2)*3"
 * @returns {string} - El resultado como string, o "Error!" si la expresión es inválida
 */
export function calculate(expr) {
	try {
		// NORMALIZACIÓN PREVENTIVA — salvaguarda ante signos acumulados:
		// Si por alguna razón llegara una expresión con dobles negativos, la
		// simplificamos antes de tokenizar para no devolver "Error!" innecesariamente.
		//   "--n"    → "+n"   (menos menos = más)
		//   "-(-n)"  → "+n"   (negativo de un negativo = positivo)
		// Esto no reemplaza el fix del handler, pero actúa como red de seguridad.
		const normalizada = expr
			.replace(/--/g, "+")
			.replace(/-\(-(\d+\.?\d*)\)/g, "+$1");

		// Tokenizar: extraemos piezas de la expresión en este orden de prioridad:
		//   1. \(-\d+\.?\d*\)  → número negativo entre paréntesis, ej: "(-12)", "(-3.5)"
		//   2. \d+\.?\d*       → número positivo entero o decimal, ej: "42", "3.14"
		//   3. [+\-*/]         → un operador aritmético (un solo carácter)
		// El orden importa: si primero buscáramos [+\-*/], el "-" de "(-12)" se
		// tomaría como operador en vez de parte del número negativo.
		const tokens = normalizada.match(/\(-\d+\.?\d*\)|\d+\.?\d*|[+\-*/]/g);
		if (!tokens || tokens.length === 0) return "Error!";

		// Convertir tokens a valores operables:
		//   - Operadores (+, -, *, /) se devuelven como string (se usan en las pasadas)
		//   - Números: se parsean a float. Los negativos "(-12)" se limpian de paréntesis
		//     → "-12" → parseFloat → -12. Los positivos "12" → parseFloat → 12.
		let values = tokens.map(t => {
			if (t === "+" || t === "-" || t === "*" || t === "/") return t;
			return parseFloat(t.replace(/[()]/g, ""));
		});

		// PRIMERA PASADA: resolver * y / de izquierda a derecha.
		// Por qué primero: la precedencia matemática dice que multiplicación y división
		// tienen mayor jerarquía que suma y resta. "2+3*4" debe dar 14, no 20.
		let i = 1;
		while (i < values.length) {
			if (values[i] === "*" || values[i] === "/") {
				const a = values[i - 1];
				const b = values[i + 1];

				// División por cero: devolvemos "Error!" en vez del Infinity de JS.
				if (values[i] === "/" && b === 0) return "Error!";

				values.splice(i - 1, 3, values[i] === "*" ? a * b : a / b);
				// No incrementamos i: el resultado quedó en posición i-1,
				// el próximo operador (si existe) ahora está en posición i.
			} else {
				i += 2;
			}
		}

		// SEGUNDA PASADA: resolver + y - de izquierda a derecha.
		let result = values[0];
		i = 1;
		while (i < values.length) {
			const b = values[i + 1];
			if (values[i] === "+") result += b;
			else if (values[i] === "-") result -= b;
			i += 2;
		}

		if (result === undefined || isNaN(result)) return "Error!";

		// toFixed(10) corrige ruido de punto flotante ("0.1+0.2" → "0.3", no "0.30000000004").
		// parseFloat elimina ceros a la derecha ("3.5000000000" → "3.5").
		return String(parseFloat(result.toFixed(10)));
	} catch {
		return "Error!";
	}
}
