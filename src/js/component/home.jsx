import React, { useState } from "react";

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

function calcular(expr) {
	try {
		const tokens = expr.match(/\d+\.?\d*|[+\-*/]/g);
		if (!tokens || tokens.length === 0) return "Error!";

		let values = tokens.map(t => (/[+\-*/]/.test(t) ? t : parseFloat(t)));

		// Primera pasada: * y /
		let i = 1;
		while (i < values.length) {
			if (values[i] === "*" || values[i] === "/") {
				const a = values[i - 1];
				const b = values[i + 1];
				if (values[i] === "/" && b === 0) return "Error!";
				values.splice(i - 1, 3, values[i] === "*" ? a * b : a / b);
			} else {
				i += 2;
			}
		}

		// Segunda pasada: + y -
		let result = values[0];
		i = 1;
		while (i < values.length) {
			const b = values[i + 1];
			if (values[i] === "+") result += b;
			else if (values[i] === "-") result -= b;
			i += 2;
		}

		if (result === undefined || isNaN(result)) return "Error!";
		return String(parseFloat(result.toFixed(10)));
	} catch {
		return "Error!";
	}
}

const Home = () => {
	const [expresion, setExpresion] = useState("0");

	const handleClick = (type, label) => {
		if (type === "clear") {
			setExpresion("0");
			return;
		}

		if (type === "delete") {
			if (expresion.length === 1 || expresion === "Error!") {
				setExpresion("0");
			} else {
				setExpresion(expresion.slice(0, -1));
			}
			return;
		}

		if (type === "equals") {
			setExpresion(calcular(expresion));
			return;
		}

		if (expresion === "0" || expresion === "Error!") {
			setExpresion(label);
		} else {
			setExpresion(expresion + label);
		}
	};

	return (
		<div className="calculadora">
			<div className="pantalla">{expresion}</div>
			{BUTTONS.map(({ label, type }) => {
				let className = "button";
				if (type === "equals") className += " button-equals";
				if (label === "0") className += " button-zero";
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
