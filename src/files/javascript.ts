import {parse} from "doctrine";
import {Types} from "../blockly";

export default async function transform(code: string, minified = false) {
	const babel = await import("@babel/core");
	const variables = new Set<string>();

	return babel.transformAsync(code, {
		minified,
		plugins: [
			{
				name: "babel-plugin-transform-scrap-async",
				visitor: {
					FunctionDeclaration(path) {
						path.node.async = true;
					},
					FunctionExpression(path) {
						path.node.async = true;
					},
					CallExpression(path) {
						if (path.parent.type !== "AwaitExpression") {
							// If this is a user-defined function, we need to bind `this` to it
							if (path.node.callee.type === "Identifier" && path.node.callee.name !== "String") {
								path.node.callee = babel.types.memberExpression(path.node.callee, babel.types.identifier("call"));
								path.node.arguments.unshift(babel.types.thisExpression());
							}

							path.replaceWith(babel.types.awaitExpression(path.node));
						}
					},
					// Endless loop protection
					WhileStatement(path) {
						if (path.node.body.type === "BlockStatement") {
							path.node.body.body.unshift(
								babel.types.expressionStatement(
									babel.types.awaitExpression(
										babel.types.newExpression(
											babel.types.identifier("Promise"),
											[
												babel.types.memberExpression(
													babel.types.identifier("Scrap"),
													babel.types.identifier("loop")
												),
											]
										)
									)
								)
							);
						}
					},
					ForStatement(path) {
						if (path.node.body.type === "BlockStatement") {
							path.node.body.body.unshift(
								babel.types.expressionStatement(
									babel.types.awaitExpression(
										babel.types.newExpression(
											babel.types.identifier("Promise"),
											[
												babel.types.memberExpression(
													babel.types.identifier("Scrap"),
													babel.types.identifier("loop")
												),
											]
										)
									)
								)
							);
						}
					},
					ForOfStatement(path) {
						if (path.node.body.type === "BlockStatement") {
							path.node.body.body.unshift(
								babel.types.expressionStatement(
									babel.types.awaitExpression(
										babel.types.newExpression(
											babel.types.identifier("Promise"),
											[
												babel.types.memberExpression(
													babel.types.identifier("Scrap"),
													babel.types.identifier("loop")
												),
											]
										)
									)
								)
							);
						}
					},
					// Scrap.StopError cannot be caught
					CatchClause(path) {
						if (!path.node.param) {
							path.node.param = babel.types.identifier("e");
						}

						path.node.body.body.unshift(
							babel.types.ifStatement(
								babel.types.binaryExpression(
									"instanceof",
									babel.types.identifier("e"),
									babel.types.memberExpression(
										babel.types.identifier("Scrap"),
										babel.types.identifier("StopError")
									)
								),
								babel.types.throwStatement(
									babel.types.identifier("e")
								),
							),
						);
					},
					// Variables with `let` or `var` are converted to `this.declareVariable`
					VariableDeclaration(path) {
						if (path.parent.type === "ForOfStatement" || path.parent.type === "ForStatement") {
							return;
						}
						if (path.node.kind === "let" || path.node.kind === "var") {
							let varType = "";

							if (path.node.leadingComments) {
								for (const {type, value} of path.node.leadingComments) {
									if (type === "CommentBlock") {
										const parsed = parse(`/*${value}*/`, {unwrap: true, tags: ["type"], recoverable: true});

										if (parsed.tags.length) {
											for (const {title, type} of parsed.tags) {
												if (title === "type" && type!.type === "NameExpression") {
													if (Types.indexOf(type!.name) > -1) {
														varType = type!.name;
													}
												}
											}
										}
									}
								}
							}

							const declarations = path.node.declarations.map((declaration) => {
								if (declaration.id.type !== "Identifier") {
									return babel.types.emptyStatement();
								}
								variables.add(declaration.id.name);
								return babel.types.expressionStatement(
									babel.types.callExpression(
										babel.types.memberExpression(
											babel.types.thisExpression(),
											babel.types.identifier("declareVariable")
										),
										[
											babel.types.stringLiteral(declaration.id.name),
											babel.types.stringLiteral(varType || "Any"),
										]
									)
								);
							});

							path.replaceWithMultiple(declarations);
						}
					},
					AssignmentExpression(path) {
						if (path.node.left.type === "Identifier") {
							if (path.node.operator === "-=") {
								var right: babel.types.Expression = babel.types.unaryExpression("-", path.node.right);
							} else if (path.node.operator === "+=" || path.node.operator === "=") {
								var right: babel.types.Expression = path.node.right;
							} else {
								return;
							}
							path.replaceWith(
								babel.types.callExpression(
									babel.types.memberExpression(
										babel.types.thisExpression(),
										babel.types.identifier(path.node.operator === "=" ? "setVariable" : "changeVariable")
									),
									[
										babel.types.stringLiteral(path.node.left.name),
										right,
									]
								)
							);
						}
					},
					Identifier(path) {
						if (variables.has(path.node.name)) {
							// Check if there is no function with the parameter
							let parent = path.parentPath;
							while (parent && parent.node.type !== "FunctionDeclaration" && parent.node.type !== "FunctionExpression") {
								parent = parent.parentPath!;
							}
							if (parent && parent.node.type === "FunctionDeclaration") {
								if (parent.node.params.some((param) => param.type === "Identifier" && param.name === path.node.name)) {
									return;
								}
							}

							// Check for for...of loops
							parent = path.parentPath;
							while (parent && parent.node.type !== "ForOfStatement") {
								parent = parent.parentPath!;
							}
							if (parent && parent.node.type === "ForOfStatement") {
								if (parent.node.left.type === "Identifier" && parent.node.left.name === path.node.name) {
									return;
								}
							}

							// Check for try...catch blocks
							parent = path.parentPath;
							while (parent && parent.node.type !== "TryStatement") {
								parent = parent.parentPath!;
							}

							if (parent && parent.node.type === "TryStatement") {
								if (parent.node.handler && parent.node.handler.param && parent.node.handler.param.type === "Identifier" && parent.node.handler.param.name === path.node.name) {
									return;
								}
							}

							path.replaceWith(
								babel.types.awaitExpression(
									babel.types.callExpression(
										babel.types.memberExpression(
											babel.types.thisExpression(),
											babel.types.identifier("getVariable")
										),
										[
											babel.types.stringLiteral(path.node.name),
										]
									)
								)
							);
						}
					},
				},
			},
		],
	});
}