import * as Blockly from "blockly/core";

export const Types = ["", "Number", "String", "Boolean", "Color", "Array", "Sprite", "Date"];
export const Error = `Type must be one of void${Types.join(", ")}`;

export const TypeToShadow: Record<string, string> = {
	Number: "math_number",
	String: "iterables_string",
	Color: "color",
	Sprite: "sprite",
	Date: "date"
};

Blockly.defineBlocksWithJsonArray(
	Types.map((type, i) => ({
		type: "function_param_" + type,
		message0: `${type}${type && " "}parameter %1`,
		args0: [
			{
				type: "field_input",
				name: "NAME",
				text: `param${i + 1}`,
			},
		],
		style: "procedure_blocks",
		nextStatement: null,
		previousStatement: null,
	}))
);