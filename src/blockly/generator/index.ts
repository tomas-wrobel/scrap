/**
 * @license MIT
 * @fileoverview Scrap's code generator.
 * @author Tomáš Wróbel
 *
 * Inspired by Blockly's JavaScript generator.
 * Where noted, some parts are directly copied
 * from Blockly's JavaScript generator.
 */
import * as Blockly from "blockly/core";
import Order from "./order";
import {Block} from "blockly/core";
import {Sprite, type Entity} from "../../entities";
import {TryBlock} from "../mutators/mutator_try";
import {ArrayBlock} from "../mutators/mutator_array";
import {UnknownBlock} from "../blocks/unknown";
import ProcedureBlock from "../utils/procedure_block";
import {CallBlock} from "../mutators/mutator_call";

import path from "path";
import {escape, reserved} from "../../files/utils";
import {ParameterBlock} from "../mutators/mutator_parameter";

interface BlockCallback<T extends Blockly.Block = any> {
	(block: T, generator: Generator): null | string | [string, Order];
}

/**
 * This generator generates ScrapScript, a
 * JavaScript subset. ScrapScript is used
 * to interact with Scrap. It looks like
 * valid JavaScript, but it is not:
 *
 * * `this` is always bound to the current sprite or stage.
 * * `async` and `await` are never present, even where they should be.
 *
 * Scrap uses two ways to run ScrapScript:
 *
 * * Babel is used to transpile ScrapScript to JavaScript.
 * * This generator is used to generate JavaScript directly.
 *
 * This generator generates both ScrapScript and JavaScript.
 */
class Generator extends Blockly.CodeGenerator {
	static blocks: Record<string, BlockCallback> = {};
	entity?: Entity;

	// Directly copied from Blockly's JavaScript generator.
	ORDER_OVERRIDES = [
		// (foo()).bar -> foo().bar
		// (foo())[0] -> foo()[0]
		[Order.FUNCTION_CALL, Order.MEMBER],
		// (foo())() -> foo()()
		[Order.FUNCTION_CALL, Order.FUNCTION_CALL],
		// (foo.bar).baz -> foo.bar.baz
		// (foo.bar)[0] -> foo.bar[0]
		// (foo[0]).bar -> foo[0].bar
		// (foo[0])[1] -> foo[0][1]
		[Order.MEMBER, Order.MEMBER],
		// (foo.bar)() -> foo.bar()
		// (foo[0])() -> foo[0]()
		[Order.MEMBER, Order.FUNCTION_CALL],

		// !(!foo) -> !!foo
		[Order.LOGICAL_NOT, Order.LOGICAL_NOT],
		// a * (b * c) -> a * b * c
		[Order.MULTIPLICATION, Order.MULTIPLICATION],
		// a + (b + c) -> a + b + c
		[Order.ADDITION, Order.ADDITION],
		// a && (b && c) -> a && b && c
		[Order.LOGICAL_AND, Order.LOGICAL_AND],
		// a || (b || c) -> a || b || c
		[Order.LOGICAL_OR, Order.LOGICAL_OR],
	];

	constructor(readonly useBlobURLs = true) {
		// "ScrapScript" is a ES5 subset. However it supports
		// ES2015 spread operator and for-of loops.
		// ScrapScript cannot be run in a browser.

		super("ScrapScript");
		this.isInitialized = false;
		this.addReservedWords(`${reserved}`);

		this.forBlock = Generator.blocks as Blockly.CodeGenerator["forBlock"];
		this.INDENT = "    ";
	}

	init(workspace: Blockly.Workspace) {
		super.init(workspace);

		const vars = (this.entity || window.app.current).variables.map(
			([name, type]) => {
				if (this.entity) {
					return `await this.declareVariable(${JSON.stringify(name)}, "${type || "Any"}");`;
				}
				return `/** @type {${type || "*"}} */\nlet ${escape(name)};`;
			}
		);

		if (vars.length > 0) {
			this.definitions_.variables = vars.join("\n\n");
		}

		this.isInitialized = true;
	}

	get protection() {
		if (!this.entity) {
			return "";
		}
		return "\n\tawait new Promise(Scrap.loop);";
	}

	protected scrub_(block: Block, code: string, opt_thisOnly?: boolean): string {
		let commentCode = "";
		// Only collect comments for blocks that aren't inline.
		if (!block.outputConnection || !block.outputConnection.targetConnection) {
			// Collect comment for this block.
			let comment = block.getCommentText();
			if (comment) {
				comment = Blockly.utils.string.wrap(comment, this.COMMENT_WRAP - 3);
				commentCode += this.prefixLines(comment + "\n", "// ");
			}
			// Collect comments for all value arguments.
			// Don't collect comments for nested statements.
			for (let i = 0; i < block.inputList.length; i++) {
				if (block.inputList[i].type === Blockly.inputTypes.VALUE) {
					const childBlock = block.inputList[i].connection?.targetBlock();
					if (childBlock) {
						comment = this.allNestedComments(childBlock);
						if (comment) {
							commentCode += this.prefixLines(comment, "// ");
						}
					}
				}
			}
		}

		const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
		const nextCode = opt_thisOnly || !block.previousConnection ? "" : this.blockToCode(nextBlock);

		return commentCode + code + nextCode;
	}

	finish(result: string): string {
		const definitions = Object.values(this.definitions_).join("\n\n");
		this.isInitialized = false;
		this.nameDB_?.reset();

		if (this.entity) {
			let code = `const ${escape(this.entity.name)} = new Scrap.`;

			const params = [
				this.getURLsFor(this.entity.costumes),
				this.getURLsFor(this.entity.sounds),
			];

			if (this.entity instanceof Sprite) {
				code += "Sprite";
				params.push(JSON.stringify(this.entity.init, null, this.INDENT));
				code += `(${params.join(", ")}, ${this.entity.current});\n`;
				code += `${escape(this.entity.name)}.addTo(Stage);\n`;
			} else {
				code += `Stage(${params.join(", ")}, ${this.entity.current});\n`;
			}

			if (result || definitions) {
				code += "(async function () {\n";
				if (definitions) {
					code += this.prefixLines(definitions, this.INDENT);
					code += "\n\n\n";
				}
				code += this.prefixLines(result, this.INDENT);
				code += `}).call(${escape(this.entity.name)});\n`;
			}

			return super.finish(code);
		} else {
			return `${definitions}${definitions && "\n\n"}${super.finish(result)}`;
		}
	}

	getURLsFor(files: File[]) {
		if (this.useBlobURLs) {
			return JSON.stringify(
				files.reduce(
					(urls, s) => ({
						...urls,
						[s.name]: URL.createObjectURL(s),
					}),
					{} as Record<string, string>
				),
				null,
				this.INDENT
			);
		} else {
			return JSON.stringify(
				files.reduce(
					(urls, s) => ({
						...urls,
						[s.name]: path.join(this.entity!.name, s.name),
					}),
					{} as Record<string, string>
				),
				null,
				this.INDENT
			);
		}
	}

	setDefinition(name: string, definition: string) {
		this.definitions_[name] = definition;
	}

	scrubNakedValue() {
		return "";
	}

	variableTarget(name: string) {
		if (this.entity!.variables.some(t => name === t[0])) {
			return "await this";
		}
		return "await this.stage";
	}
}

Generator.blocks.unknown = function (block: UnknownBlock) {
	if (block.shape === "reporter") {
		return [`/* this.${block.opcode}() */`, Order.ATOMIC];
	}
	return `/* this.${block.opcode}(); */\n`;
};

Generator.blocks.setVariable = function (block: Blockly.Block, generator) {
	if (generator.entity) {
		return `${generator.variableTarget(block.getFieldValue("VAR"))}.setVariable("${block.getFieldValue("VAR")}", ${generator.valueToCode(block, "VALUE", Order.NONE) || "null"});\n`;
	}
	return `${escape(block.getFieldValue("VAR"))} = ${generator.valueToCode(block, "VALUE", Order.NONE) || "null"};\n`;
};

Generator.blocks.changeVariable = function (block: Blockly.Block, generator) {
	if (generator.entity) {
		return `${generator.variableTarget(block.getFieldValue("VAR"))}.changeVariable("${block.getFieldValue("VAR")}", ${generator.valueToCode(block, "VALUE", Order.NONE) || "0"});\n`;
	}
	return `${escape(block.getFieldValue("VAR"))} += ${generator.valueToCode(block, "VALUE", Order.NONE) || "null"};\n`;
};

Generator.blocks.showVariable = function (block: Blockly.Block, generator) {
	if (generator.entity) {
		return `${generator.variableTarget(block.getFieldValue("VAR"))}.showVariable("${block.getFieldValue("VAR")}");\n`;
	}
	return `this.showVariable(${escape(block.getFieldValue("VAR"))});\n`;
};

Generator.blocks.hideVariable = function (block: Blockly.Block, generator) {
	if (generator.entity) {
		return `${generator.variableTarget(block.getFieldValue("VAR"))}.hideVariable("${block.getFieldValue("VAR")}");\n`;
	}
	return `this.hideVariable(${escape(block.getFieldValue("VAR"))});\n`;
};

Generator.blocks.color = Generator.blocks.hex = function (block: Blockly.Block) {
	return [`Color.fromHex("${block.getFieldValue("COLOR")}")`, Order.ATOMIC];
};

Generator.blocks.iterables_string = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("TEXT")), Order.ATOMIC];
};

Generator.blocks.effect = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("EFFECT")), Order.ATOMIC];
};

Generator.blocks.rotationStyle = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("STYLE")), Order.ATOMIC];
};

Generator.blocks.key = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("KEY")), Order.ATOMIC];
};

Generator.blocks.costume_menu = Generator.blocks.backdrop_menu = Generator.blocks.sound = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("NAME")), Order.ATOMIC];
};
Generator.blocks.repeat = function (block: Blockly.Block, generator) {
	const times = generator.valueToCode(block, "TIMES", Order.NONE) || "0";
	const i = Blockly.Variables.generateUniqueNameFromOptions("i", window.app.current.variables.map(t => t[0]));
	return `for (let ${i} = 0; ${i} < ${times}; ${i}++) {${generator.protection}\n${generator.statementToCode(block, "STACK")}}\n`;
};

Generator.blocks.while = function (block: Blockly.Block, generator) {
	const condition = generator.valueToCode(block, "CONDITION", Order.NONE) || "false";
	return `while (${condition}) {${generator.protection}\n${generator.statementToCode(block, "STACK")}}\n`;
};

Generator.blocks.doWhile = function (block: Blockly.Block, generator) {
	const condition = generator.valueToCode(block, "CONDITION", Order.NONE) || "false";
	return `do {${generator.protection}\n${generator.statementToCode(block, "STACK")}} while (${condition});\n`;
};

Generator.blocks.getEffect = function (block: Blockly.Block, generator) {
	const effect = generator.valueToCode(block, "EFFECT", Order.NONE) || "null";
	return [`this.effects[${effect}]`, Order.MEMBER];
};

Generator.blocks.break = function () {
	return "break;\n";
};

Generator.blocks.continue = function () {
	return "continue;\n";
};

Generator.blocks.sprite = function (block: Blockly.Block, generator) {
	const name = block.getFieldValue("SPRITE");
	if (name === "this" || generator.entity) {
		return [name, Order.ATOMIC];
	}
	return ["sprite`" + name + "`", Order.ATOMIC];
};

Generator.blocks.clone = function (block: Blockly.Block, generator) {
	const sprite = generator.valueToCode(block, "SPRITE", Order.NONE);
	return `${generator.entity ? "await " : ""}${sprite}.clone();\n`;
};

Generator.blocks.parameter = function (block: ParameterBlock, generator) {
	if (block.isVariable_ && generator.entity) {
		return [`${generator.variableTarget(block.getFieldValue("VAR"))}.getVariable("${block.getFieldValue("VAR")}")`, Order.MEMBER];
	}
	return [escape(block.getFieldValue("VAR")), Order.ATOMIC];
};

Generator.blocks.event = function (block: Blockly.Block) {
	return [JSON.stringify(block.getFieldValue("EVENT")), Order.ATOMIC];
};

Generator.blocks.tryCatch = function (block: TryBlock, generator) {
	let code = "try {\n";
	code += generator.statementToCode(block, "TRY");

	if (block.catch) {
		if (typeof block.catch === "string") {
			const variable = escape(block.catch);
			code += `} catch (${variable}) {\n`;

			if (generator.entity) {
				code += `\tif (${variable} instanceof Scrap.StopError) throw ${variable};`;
			}
		} else if (generator.entity) {
			code += "} catch (e) {\n\tif (e instanceof Scrap.StopError) throw e;\n";
		} else {
			code += "} catch {\n";
		}
		code += generator.statementToCode(block, "CATCH");
	}

	if (block.finally) {
		code += "} finally {\n";
		code += generator.statementToCode(block, "FINALLY");
	}

	return code + "}\n";
};

Generator.blocks.throw = function (block: Blockly.Block, generator) {
	const error = generator.valueToCode(block, "ERROR", Order.NONE) || "null";
	return `throw ${error};\n`;
};

Generator.blocks.stop = function () {
	return "Scrap.stop();\n";
};

Generator.blocks.controls_if = function (block, generator) {
	// If/elseif/else condition.
	let code = "";

	for (let i = 0; block.getInput("IF" + i); i++) {
		const conditionCode = generator.valueToCode(block, "IF" + i, Order.NONE) || "false";
		const branchCode = generator.statementToCode(block, "DO" + i);
		code += `${i ? " else " : ""}if (${conditionCode}) {\n${branchCode}}`;
	}

	if (block.getInput("ELSE")) {
		code += ` else {\n${generator.statementToCode(block, "ELSE")}}`;
	}
	return code + "\n";
};

Generator.blocks.foreach = function (block: Blockly.Block, generator) {
	const item = escape(block.getFieldValue("VAR"));
	const iterable = generator.valueToCode(block, "ITERABLE", Order.NONE) || "[]";
	return `for (const ${item} of ${iterable}) {${generator.protection}\n${generator.statementToCode(block, "DO")}}\n`;
};

Generator.blocks.property = function (block: Blockly.Block, generator) {
	return [`${generator.valueToCode(block, "SPRITE", Order.MEMBER)}.${block.getFieldValue("PROPERTY")}`, Order.MEMBER];
};

Generator.blocks.isTurbo = function () {
	return ["Scrap.isTurbo", Order.MEMBER];
};

Generator.blocks.array = function (block: ArrayBlock, generator) {
	const items: string[] = [];
	for (let i = 0; i < block.items.length; i++) {
		const item = block.items[i];
		if (item === "iterable") {
			items.push(`...${generator.valueToCode(block, `ADD${i}`, Order.NONE) || "[]"}`);
		} else {
			items.push(generator.valueToCode(block, `ADD${i}`, Order.NONE) || "null");
		}
	}
	return [`[${items.join(", ")}]`, Order.ATOMIC];
};

Generator.blocks.length = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	return [`${array}.length`, Order.MEMBER];
};

Generator.blocks.reverse = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	return [`${array}.reverse()`, Order.MEMBER];
};

Generator.blocks.join = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	const separator = generator.valueToCode(block, "SEPARATOR", Order.NONE) || '""';
	return [`${array}.join(${separator})`, Order.MEMBER];
};

Generator.blocks.includes = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	const item = generator.valueToCode(block, "ITEM", Order.NONE) || "null";
	return [`${array}.includes(${item})`, Order.MEMBER];
};

Generator.blocks.slice = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	const start = generator.valueToCode(block, "START", Order.NONE) || "0";
	const end = generator.valueToCode(block, "TO", Order.NONE) || "0";
	return [`${array}.slice(${start}, ${end})`, Order.MEMBER];
};

Generator.blocks.indexOf = function (block: Blockly.Block, generator) {
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	const item = generator.valueToCode(block, "ITEM", Order.NONE) || "null";
	return [`${array}.indexOf(${item})`, Order.MEMBER];
};

Generator.blocks.string = function (block: Blockly.Block, generator) {
	return [`String(${generator.valueToCode(block, "VALUE", Order.NONE) || "null"})`, Order.FUNCTION_CALL];
};

Generator.blocks.number = function (block: Blockly.Block, generator) {
	return [`Number(${generator.valueToCode(block, "VALUE", Order.NONE) || "null"})`, Order.FUNCTION_CALL];
};

Generator.blocks.function = function (block: ProcedureBlock, generator) {
	const name = escape(block.getFieldValue("NAME"));
	const type = block.getFieldValue("TYPE");
	const comment = block.getCommentText();
	const nextBlock = block.getNextBlock();

	const params: string[] = [];
	let code = "/**\n";

	if (comment) {
		code += generator.prefixLines(comment, " * ") + "\n";
	}

	for (const param of block.params) {
		const name = escape(param.name);
		code += ` * @param {${param.type || "*"}} ${name}\n`;
		params.push(name);
	}

	code += ` * @returns {${type || "void"}}\n */\n`;

	if (generator.entity) {
		code += "async ";
	}

	code += `function ${name}(${params.join(", ")}) {\n`;

	if (nextBlock) {
		code += generator.prefixLines(generator.blockToCode(nextBlock) as string, generator.INDENT);
	}

	generator.setDefinition("%" + name, code + "}\n");
	return null;
};

Generator.blocks.motion_angle = function (block: Blockly.Block) {
	return [block.getFieldValue("VALUE"), Order.ATOMIC];
};

Generator.blocks.text_or_number = function (block: Blockly.Block) {
	const value = block.getFieldValue("VALUE");

	if (value === "") {
		return ['""', Order.ATOMIC];
	}

	if (!isNaN(Number(value))) {
		return [value, Order.ATOMIC];
	}

	return [JSON.stringify(value), Order.ATOMIC];
};

Generator.blocks.call = function (block: CallBlock, generator) {
	let code = escape(block.getFieldValue("NAME"));
	const args = block.params_.map((_, i) => generator.valueToCode(block, "PARAM_" + i, Order.NONE) || "null");
	if (generator.entity) {
		args.unshift("this");
		code = `await ${code}.call`;
	}
	code += `(${args.join(", ")})`;
	if (block.outputConnection) {
		return [code, Order.FUNCTION_CALL];
	} else {
		return code + ";\n";
	}
};

Generator.blocks.return = function (block: Blockly.Block, generator) {
	const hasInput = !!block.getInput("VALUE");

	if (hasInput) {
		return `return ${generator.valueToCode(block, "VALUE", Order.NONE) || "null"};\n`;
	} else {
		return "return;\n";
	}
};

Generator.blocks.arithmetics = function (block: Blockly.Block, generator) {
	const operator = block.getFieldValue("OP");

	let order: Order;

	switch (operator) {
		case "**":
			order = Order.EXPONENTIATION;
			break;
		case "+":
		case "-":
			order = Order.ADDITION;
			break;
		case "*":
		case "/":
		case "%":
			order = Order.MULTIPLICATION;
			break;
		default:
			order = Order.NONE;
			break;
	}

	const left = generator.valueToCode(block, "A", order) || "0";
	const right = generator.valueToCode(block, "B", order) || "0";

	return [`${left} ${operator} ${right}`, order];
};

Generator.blocks.compare = function (block: Blockly.Block, generator) {
	const operator = block.getFieldValue("OP");

	let order: Order;

	switch (operator) {
		case "==":
		case "!=":
			order = Order.EQUALITY;
			break;
		case ">":
		case "<":
		case ">=":
		case "<=":
			order = Order.RELATIONAL;
			break;
		default:
			order = Order.NONE;
			break;
	}

	const left = generator.valueToCode(block, "A", order) || "0";
	const right = generator.valueToCode(block, "B", order) || "0";

	return [`${left} ${operator} ${right}`, order];
};

Generator.blocks.not = function (block: Blockly.Block, generator) {
	return [`!${generator.valueToCode(block, "BOOL", Order.LOGICAL_NOT) || "false"}`, Order.LOGICAL_NOT];
};

Generator.blocks.boolean = function (block: Blockly.Block) {
	return [block.getFieldValue("BOOL"), Order.ATOMIC];
};

Generator.blocks.math_number = function (block: Blockly.Block) {
	return [block.getFieldValue("NUM"), Order.ATOMIC];
};

Generator.blocks.math = function (block: Blockly.Block, generator) {
	const number = generator.valueToCode(block, "NUM", Order.NONE) || "0";
	return [`Math.${block.getFieldValue("OP")}(${number})`, Order.FUNCTION_CALL];
};

Generator.blocks.constant = function (block: Blockly.Block) {
	return [block.getFieldValue("CONSTANT"), Order.ATOMIC];
};

Generator.blocks.operation = function (block: Blockly.Block, generator) {
	const operator = block.getFieldValue("OP");

	let order: Order;

	switch (operator) {
		case "&&":
			order = Order.LOGICAL_AND;
			break;
		case "||":
			order = Order.LOGICAL_OR;
			break;
		default:
			order = Order.NONE;
			break;
	}

	const left = generator.valueToCode(block, "A", order) || "false";
	const right = generator.valueToCode(block, "B", order) || "false";

	return [`${left} ${operator} ${right}`, order];
};

Generator.blocks.logic_negate = function (block: Blockly.Block, generator) {
	return [generator.valueToCode(block, "BOOL", Order.LOGICAL_NOT) || "false", Order.LOGICAL_NOT];
};

Generator.blocks.random = function () {
	return ["Math.random()", Order.FUNCTION_CALL];
};

Generator.blocks.item = function (block: Blockly.Block, generator) {
	const index = generator.valueToCode(block, "INDEX", Order.NONE) || "0";
	const array = generator.valueToCode(block, "ITERABLE", Order.MEMBER) || "[]";
	return [`${array}[${index}]`, Order.MEMBER];
};

Generator.blocks.rgb = function (block: Blockly.Block, generator) {
	const r = generator.valueToCode(block, "RED", Order.NONE) || "0";
	const g = generator.valueToCode(block, "GREEN", Order.NONE) || "0";
	const b = generator.valueToCode(block, "BLUE", Order.NONE) || "0";

	return [`Color.fromRGB(${r}, ${g}, ${b})`, Order.FUNCTION_CALL];
};

Generator.blocks.date = function (blockly: Blockly.Block) {
	return [`new Date("${blockly.getFieldValue("DATE")}")`, Order.FUNCTION_CALL];
};

Generator.blocks.today = function () {
	return ["new Date()", Order.FUNCTION_CALL];
};

Generator.blocks.dateProperty = function (block: Blockly.Block, generator) {
	return [
		`${generator.valueToCode(block, "DATE", Order.MEMBER)}.${block.getFieldValue("PROPERTY")}()`,
		Order.FUNCTION_CALL,
	];
};

Generator.blocks.alert = function (block: Blockly.Block, generator) {
	const message = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
	return `window.alert(${message});\n`;
};

Generator.blocks.prompt = function (block: Blockly.Block, generator) {
	const message = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
	return [`window.prompt(${message})`, Order.FUNCTION_CALL];
};

Generator.blocks.confirm = function (block: Blockly.Block, generator) {
	const message = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
	return [`window.confirm(${message})`, Order.FUNCTION_CALL];
};

export {Order, Generator};
