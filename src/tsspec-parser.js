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

const spelunkFindTests = (parent, foundTestNames, parentNameTree) => {
	parent.forEachChild((node) => {
		if (isDescribe(node) || isContext(node)) {
			if (node.expression.arguments.length >= 2) {
				const newParentNameTree = [...parentNameTree];
				newParentNameTree.push(getItsName(node));
				spelunkFindTests(node.expression.arguments[1].body, foundTestNames, newParentNameTree);
			}
		} else if (isIt(node)) {
			foundTestNames.push([...parentNameTree, getItsName(node)]);
		}
	});
}

const findTests = (source, filename) => {
	const foundTestNames = []

	const nodes = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest);

	spelunkFindTests(nodes, foundTestNames, []);

	// this is an array of arrays of tree paths
	return foundTestNames;
}

const equals = x => y => String(x) === String(y);

let leaveTests;

const findSuites = (node) => {
	if (node === undefined) {
		return [];
	}

	if (isDescribe(node) || isContext(node)) {
		return [...findSuites(node.parent), getItsName(node)];
	}
}

const transformerFactory = (context) => {
	return (rootNode) => {
		function visit(node) {
			if (isDescribe(node) || isContext(node)) {
				const name = [...findSuites(node.parent), getItsName(node)];

				if (!leaveTests.some(equals(name))) {
					return ts.createTrue();
					// return ts.createComment(`removed ${name}`);
				}
			} else if (isIt(node)) {
				const name = getItsName(node);

				if (!leaveTests.some(equals(name))) {
					return ts.createTrue();
				}
			}

			node = ts.visitEachChild(node, visit, context);
			
			return node;
		}

		return ts.visitNode(rootNode, visit);
	};
};


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
// const file = new String(fs.readFileSync('../cypress/integration/custom_attribute_spec.ts', 'utf-8'));
// console.log(findTests(file, '../test/create_gain_switch.ts'));
//
// console.log(skipTests(file, 'x.ts', ['Unsettling']));
