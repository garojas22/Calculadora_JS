// ¿Por qué este archivo existe separado del componente?
// Separación entre lógica de negocio y presentación.
// El componente Home sabe CUÁNDO pedir un cálculo (cuando el usuario pulsa "="),
// pero no debería saber CÓMO se calcula. Eso es responsabilidad de esta función.

/**
 * Evalúa una expresión aritmética en formato string respetando precedencia de
 * operadores (* y / antes que + y -), sin usar eval().
 * Soporta:
 *   - Números negativos entre paréntesis: "(-n)", ej: "5+(-2)", "(-3)*4"
 *   - Notación científica: "5.5e19", "1.2e-7", "3e+10" (resultados previos que
 *     se siguen usando en operaciones encadenadas como "5.5e18+2=")
 *
 * @param {string} expr - Expresión a calcular, ej: "3+5*2" o "(-2)*3" o "5.5e18+2"
 * @returns {string} - El resultado como string, o "Error!" si la expresión es inválida
 */
export function calculate(expr) {
	try {
		// NORMALIZACIÓN PREVENTIVA — salvaguarda ante signos acumulados:
		//   "--n"        → "+n"  (menos menos = más)
		//   "-(-n)"      → "+n"  (negativo de un negativo = positivo)
		//   "-(-1.5e10)" → "+1.5e10"
		const normalizada = expr
			.replace(/--/g, "+")
			.replace(/-\(-(\d+\.?\d*(?:e[+-]?\d+)?)\)/g, "+$1");

		// TOKENIZACIÓN — extraemos piezas en orden de prioridad:
		//   1. \(-\d+\.?\d*(?:e[+-]?\d+)?\)  → negativo entre paréntesis, ej: "(-12)", "(-1.5e10)"
		//   2. \d+\.?\d*(?:e[+-]?\d+)?        → número positivo, con decimal y/o exponente opcional
		//                                         ej: "42", "3.14", "5.5e19", "1.2e-7", "3e+10"
		//   3. [+\-*/]                          → un operador aritmético
		//
		// ¿Por qué importa el orden? Si buscáramos operadores primero, el "-" de "(-12)"
		// se tomaría como operador de resta, y el "+" de "3e+10" como suma.
		// La notación científica con "e[+-]?\d+" se trata como parte del número, no como
		// operadores sueltos, gracias a que el patrón del número la captura completa.
		const tokens = normalizada.match(
			/\(-\d+\.?\d*(?:e[+-]?\d+)?\)|\d+\.?\d*(?:e[+-]?\d+)?|[+\-*/]/g
		);
		if (!tokens || tokens.length === 0) return "Error!";

		// Convertir tokens a valores operables:
		//   Operadores → string (se usan en las pasadas siguientes)
		//   Números    → float. Los negativos "(-12)" se limpian de paréntesis → "-12" → -12.
		//                parseFloat entiende notación científica nativamente: "5.5e19" → 5.5e19.
		let values = tokens.map(t => {
			if (t === "+" || t === "-" || t === "*" || t === "/") return t;
			return parseFloat(t.replace(/[()]/g, ""));
		});

		// PRIMERA PASADA: resolver * y / de izquierda a derecha.
		// Por qué primero: la precedencia matemática exige que * y / tengan mayor
		// jerarquía que + y -. "2+3*4" debe dar 14, no 20.
		let i = 1;
		while (i < values.length) {
			if (values[i] === "*" || values[i] === "/") {
				const a = values[i - 1];
				const b = values[i + 1];
				if (values[i] === "/" && b === 0) return "Error!";
				values.splice(i - 1, 3, values[i] === "*" ? a * b : a / b);
				// No incrementamos i: el resultado quedó en i-1,
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

		// FORMATO DEL RESULTADO
		//
		// Umbral para notación científica (estilo iOS: "5.5555555e19"):
		//   |result| >= 1e16  → enteros de 16+ dígitos, ya no caben en pantalla en decimal
		//   0 < |result| < 1e-7 → decimales con 7+ ceros a la izquierda, igualmente largos
		//
		// Por qué 1e16 y 1e-7: son los límites donde el decimal resulta tan largo que incluso
		// con la fuente mínima (pantalla-xs) supera los ~16 caracteres disponibles.
		// JavaScript usa notación fija para |n| < 1e21, así que sin este umbral mostraríamos
		// "55000000000000000000" (20 caracteres) en vez de "5.5e19".
		if (Math.abs(result) >= 1e16 || (result !== 0 && Math.abs(result) < 1e-7)) {
			// toExponential(7) → 7 decimales en la mantisa = 8 cifras significativas
			// ".replace(/\.?0+e/, 'e')" elimina ceros finales: "1.0000000e+5" → "1e+5"
			// ".replace('e+', 'e')"     elimina el "+" del exponente, estilo iOS: "5.5e19"
			return result.toExponential(7)
				.replace(/\.?0+e/, "e")
				.replace("e+", "e");
		}

		// Para resultados en rango normal: toPrecision(10) limita a 10 cifras significativas.
		// Esto evita "3.3333333333333335" (ruido de punto flotante) y decimales que llenan pantalla.
		// parseFloat elimina ceros finales: "3.300000000" → "3.3".
		// Si parseFloat produce su propia notación científica (para números cerca de 1e-7),
		// le limpiamos el "+" del exponente para mantener consistencia de formato.
		const str = String(parseFloat(result.toPrecision(10)));
		return str.includes("e") ? str.replace("e+", "e") : str;
	} catch {
		return "Error!";
	}
}
