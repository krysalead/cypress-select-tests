const ts = require('typescript');

const isTestBlock = name => node => {
	return ts.SyntaxKind[node.kind] === 'ExpressionStatement' &&
	ts.SyntaxKind[node.expression.kind] === 'CallExpression' &&
	ts.SyntaxKind[node.expression.expression.kind] === 'Identifier' &&
	node.expression.expression.escapedText === name
};

const isDescribe = isTestBlock('describe')

const isContext = isTestBlock('context')

const isIt = isTestBlock('it')

const getItsName = node => {
	return node.expression.arguments[0].text
};

const setItsName = (node, newName) => {
	node.expression.expression.escapedText = newName;
}

const spelunkFindTests = (parent, foundTestNames) => {
	parent.forEachChild((node) => {
		if (isDescribe(node) || isContext(node)) {
			foundTestNames.push(getItsName(node));
			if (node.expression.arguments.length >= 2) {
				spelunkFindTests(node.expression.arguments[1].body, foundTestNames);
			}
		} else if (isIt(node)) {
			foundTestNames.push(getItsName(node));
		}
	});
}

const findTests = (source, filename) => {
	const foundTestNames = []

	const nodes = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest);

	spelunkFindTests(nodes, foundTestNames);

	return foundTestNames;
}

const equals = x => y => String(x) === String(y);

let leaveTests;

const transformerFactory = (context) => {
	return (rootNode) => {
		function visit(node) {
			if (isDescribe(node) || isContext(node)) {
				const name = getItsName(node);

				if (!leaveTests.includes(name)) {
					return ts.createTrue();
					// return ts.createComment(`removed ${name}`);
				}
			} else if (isIt(node)) {
				const name = getItsName(node);

				if (!leaveTests.includes(name)) {
					return ts.createTrue();
					// node.body = undefined;
					// return ts.createComment(`removed ${name}`);
				}
			}

			node = ts.visitEachChild(node, visit, context);
			
			return node;
		}

		return ts.visitNode(rootNode, visit);
	};
};

// const spelunkSkipTests = (parent, leaveTests) => {
//
// 	parent.forEachChild((node) => {
// 		if (isDescribe(node) || isContext(node)) {
// 			const name = getItsName(node);
//
// 			if (!leaveTests.includes(name)) {
// 				node.body = undefined;
// 				// setItsName(node, (isDescribe(node) ? "describe" : "context") + ".skip");
// 			} else if (node.expression.arguments.length >= 2) {
// 				spelunkSkipTests(node.expression.arguments[1].body, leaveTests);
// 			}
// 		} else if (isIt(node)) {
// 			const name = getItsName(node);
//
// 			if (!leaveTests.includes(name)) {
// 				node.body = undefined;
// 				// setItsName(node, "it.skip");
// 			}
// 		}
// 	});
// }


const skipTests = (source, filename, keepTests) => {
	leaveTests = keepTests;

	if (source === undefined || source === null) {
		return '<none>';
	}

	const nodes = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest);

	const transformationResult = ts.transform(nodes, [transformerFactory]);
	const transformedSourceFile = transformationResult.transformed[0]
//	spelunkSkipTests(nodes, leaveTests);

	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

	return printer.printNode(
		ts.EmitHint.Unspecified,
		transformedSourceFile,
		undefined
	);
};

module.exports = {
	findTests,
	skipTests
};
//
// const fs = require('fs');
// const file = new String(fs.readFileSync('../test/create_gain_switch.ts', 'utf-8'));
// console.log(findTests(file, '../test/create_gain_switch.ts'));
//
// console.log(skipTests(file, 'x.ts', ['Create Gain Switch endpoint @au']));
