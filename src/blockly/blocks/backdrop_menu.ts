/**
 * @license MIT
 * @fileoverview Backdrop menu block
 * @author Tomáš Wróbel
 * 
 * Backdrop menu block is a dropdown with all the backdrops.
 * It should be always a shadow block, as it's used in the
 * switch-backdrop-to block.
 */
import * as Blockly from "blockly";
import path from "path";

export const MIXIN = {
    init(this: Blockly.Block) {
        this.setStyle("Looks");
        this.setOutput(true, "string");

        this.appendDummyInput().appendField<string>(
            new Blockly.FieldDropdown(
                () => app.entities[0].costumes.map<[string, string]>(e => {
                    const {name} = path.parse(e.name);
                    if (name.length > 12) {
                        return [name.slice(0, 12) + "...", name];
                    }
                    return [name, name];
                })
            ),
            "NAME"
        );
    }
};