const fs = require("fs");
const path = require("path");
const tsspecParser = require('./tsspec-parser');
const { grepPickTests } = require('./grep-pick-tests');
const specParser = require('./spec-parser');

async function* walk(dir, cypressConfig) {
	for await (const d of await fs.promises.opendir(dir, cypressConfig)) {
		const entry = path.join(dir, d.name);
		if (d.isDirectory()) yield* walk(entry, cypressConfig);
		else if (d.isFile() && (!cypressConfig.env['grep-filter'] || d.name.includes(cypressConfig.env['grep-filter'])) ) yield entry;
	}
}

// Then, use it with a simple async for loop
async function precypressFilter(argv) {
	const cypressConfig = JSON.parse(fs.readFileSync('./cypress.json'));

	const env = cypressConfig.env || {};

	for(let count = 0; count < argv.length; count ++) {
		if (argv[count] === '--env') {
			const fields = argv[count+1].split(',');
			for(const field of fields) {
				const parts = field.split('=');
				env[parts[0]] = parts.length > 1 ? parts[1].trim() : '';
			}
		}
	}

	cypressConfig.env = env;

	const files = [];
	for await (const p of walk('./cypress/integration', cypressConfig)) {
		const source = fs.readFileSync(p).toString();
		const testNames = p.endsWith('.js') ? specParser.findTests(source) : tsspecParser.findTests(source, p);
		if (grepPickTests(p, testNames, cypressConfig)) {
			files.push(p);
		}
	}

	cypressConfig.testFiles = files;

	fs.writeFileSync('cypress-grep.json', JSON.stringify(cypressConfig));
}

module.exports = precypressFilter;