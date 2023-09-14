import * as Blockly from "blockly/core";
import * as blocks from "./blocks/*.ts";
import * as fields from "./fields/*.ts";
import * as mutators from "./mutators/*.ts";

import "@blockly/field-color";
import * as En from "blockly/msg/en";

import blocksData from "./data/blocks.json";
import {Generator, Order} from "./generator";

for (const block in blocks) {
	Blockly.Blocks[block] = blocks[block].default;
}

for (const field in fields) {
	Blockly.fieldRegistry.register(field, fields[field].default);
}

for (const mutator in mutators) {
	Blockly.Extensions.registerMutator(
		mutator,
		mutators[mutator].MIXIN,
		undefined,
		mutators[mutator].blocks
	);
}

Blockly.setLocale(En);

const def = [];

/** @type {string[]} */
const allBlocks = [];

for (const type in blocksData) {
	allBlocks.push(type);

	def.push({
		type,
		...blocksData[type],
	});

	const args0 = blocksData[type].args0;
	const isEvent = !(
		"output" in blocksData[type] || "previousStatement" in blocksData[type]
	);

	if (!(type in Generator.blocks)) {
		Generator.blocks[type] = function (block, generator) {
			let code = `this.${type}`;

			if (args0 || isEvent) {
				const args = (args0 || []).map(input => {
					return (
						generator.valueToCode(block, input.name, Order.NONE) ||
						"null"
					);
				});

				if (isEvent) {
					let arg = "function () {";

					if (generator.entity) {
						arg = `async ${arg}`;
					}

					const next = block.getNextBlock();

					if (next) {
						arg +=
							"\n" +
							generator.prefixLines(
								generator.blockToCode(next),
								generator.INDENT
							);
					}

					args.push(arg + "}");
				}

				code = `${
					!generator.entity || isEvent ? "" : "await "
				}${code}(${args.join(", ")})`;
			}

			if (block.outputConnection) {
				return [code, Order.FUNCTION_CALL];
			}

			return code + ";\n";
		};
	}
}

Blockly.Extensions.register("parent_style", function () {
	this.onchange = () => {
		const parent = this.getParent();
		if (parent) {
			this.setStyle(parent.getStyleName());
			this.onchange = null;
		}
	};
});

Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE = "function";
Blockly.Msg.PROCEDURES_DEFRETURN_TITLE = "function";
Blockly.Msg.MATH_MODULO_TITLE = "%1 mod %2";

delete Blockly.Blocks.controls_if;
delete Blockly.Blocks.controls_if_else;
delete Blockly.Blocks.controls_if_elseif;
delete Blockly.Blocks.controls_if_if;

Blockly.FlyoutButton.TEXT_MARGIN_X = 20;
Blockly.FlyoutButton.TEXT_MARGIN_Y = 10;

Blockly.defineBlocksWithJsonArray(def);

export * as sprite from "./data/sprite.json";
export * as stage from "./data/stage.json";
export * as theme from "./data/theme.json";
export * from "./utils/types.ts";

export {default as plugins} from "./toolbox";
export {allBlocks, Generator, Order};