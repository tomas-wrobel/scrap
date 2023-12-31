/**
 * @license MIT
 * @fileoverview Defines the call mutator.
 * @author Tomáš Wróbel
 * 
 * Similar to variables, Scrap does not use Blockly's built-in
 * functions. Instead, it uses its own function blocks.
 * It is independent from the Blockly's procedure system.
 * 
 * The benefit of the Blockly's procedure system is that
 * it is more flexible and allows for more workspaces.
 * However, Scrap does not need that flexibility.
 * It would require bigger bundle size, too.
 * 
 * So instead, Scrap uses its own function blocks, which
 * works similarly to legacy Blockly's procedure system.
 * 
 * This block definition is used by the function block.
 * It ensures following:
 * * The function block has a name and a return type.
 * * The function block has parameters.
 */
import * as Blockly from "blockly/core";
import {Types} from "../utils/types";
import ProcedureBlock from "../utils/procedure_block";

export default <Partial<ProcedureBlock>>{
	params: [],

	init(this: ProcedureBlock) {
		this.inputsInline = true;
		this.setNextStatement(true, null);
		this.setStyle("procedure_blocks");
		this.setCommentText("Describe this function...");
		this.appendDummyInput("DUMMY")
			.appendField(new Blockly.FieldDropdown(Types.map(type => [type || "void", type] as [string, string])), "TYPE")
			.appendField("function")
			.appendField(new Blockly.FieldTextInput("foo"), "NAME");
		this.setMutator(
			new Blockly.icons.MutatorIcon(
				Types.map(type => "function_param_" + type),
				this
			)
		);
	},
	saveExtraState(this: ProcedureBlock) {
		return {
			name: this.getFieldValue("NAME"),
			returnType: this.getFieldValue("TYPE"),
			params: this.params,
		};
	},
	loadExtraState(this: ProcedureBlock, state: any) {
		this.params = state.params;
		this.setFieldValue(state.name, "NAME");
		this.setFieldValue(state.returnType, "TYPE");

		this.updateShape();
	},
	compose(this: ProcedureBlock, topBlock: Blockly.Block) {
		this.params = [];

		for (let block = topBlock.getNextBlock(); block; block = block.getNextBlock()) {
			if (block.type === "text_or_number_param") {
				this.params.push({
					type: ["String", "Number"], 
					name: block.getFieldValue("NAME")
				});
			} else {
				const check = block.type.slice("function_param_".length);
				const name = block.getFieldValue("NAME");
				this.params.push({type: check, name});
			}
		}

		this.updateShape();
	},
	decompose(this: ProcedureBlock, ws: Blockly.Workspace) {
		const workspace = ws as Blockly.WorkspaceSvg;
		const containerBlock = workspace.newBlock("function_header");
		containerBlock.initSvg?.();
		let connection = containerBlock.nextConnection;

		for (const {name, type} of this.params) {
			const block = workspace.newBlock(typeof type === "object" ? "text_or_number_param" : "function_param_" + type);
			block.initSvg?.();
			block.setFieldValue(name, "NAME");
			connection.connect(block.previousConnection);
			connection = block.nextConnection;
		}

		return containerBlock;
	},
	updateShape(this: ProcedureBlock) {
		const input = this.getInput("DUMMY")!;

		for (let i = 0; input.removeField("PARAM_" + i, true); i++);

		for (let i = 0; i < this.params.length; i++) {
			input.appendField(
				Blockly.fieldRegistry.fromJson({
					type: "field_param",
					var: this.params[i].name,
					varType: this.params[i].type,
				})!,
				`PARAM_${i}`
			);
		}
	},
};
