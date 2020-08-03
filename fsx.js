const fs = require('fs');
const exec = require('child_process').execSync;
const accept = {};
const reject = {};
let cmd = '';
let recursive = false;
const explore = (dir) => {
	if (accept.dir && !accept.dir.test(dir)) {
		return 0;
	}
	if (reject.dir && reject.dir.test(dir)) {
		return 0;
	}
	let total = 0;
	fs.readdirSync(dir).forEach(name => {
		let path = dir + name;
		let lstat = null;
		try {
			lstat = fs.lstatSync(path);
		} catch(err) {
			return;
		}
		if (lstat.isDirectory()) {
			if (recursive) {
				total += explore(path + '\\');
			}
			return;
		}
		if (accept.name && !accept.name.test(name)) {
			return;
		}
		if (reject.name && reject.name.test(name)) {
			return;
		}
		if (accept.content || reject.content) {
			const content = fs.readFileSync(path).toString();
			if (accept.content && !accept.content.test(content)) {
				return;
			}
			if (reject.content && reject.content.test(content)) {
				return;
			}
		}
		total += 1;
		if (!cmd) {
			console.log(path);
			return;
		}
		if (path.includes(' ') && path[0] !== '"') {
			path = `"${path}"`;
		}
		let res = exec(cmd.replace(/\$path/g, path)).toString().trim();
		if (res) {
			console.log(res);
		}
	});
	return total;
};
const argMap = {};
const nArgArg = {};
const addArg = (names, nArgs, def) => {
	names.forEach(name => {
		argMap[name] = def;
		nArgArg[name] = nArgs;
	});
};
addArg(['n', 'name'], 1, null);
addArg(['in', 'ignore-name'], 1, null);
addArg(['d', 'dir', 'directory'], 1, null);
addArg(['id', 'ignore-dir', 'ignore-directory'], 1, null);
addArg(['c', 'content'], 1, null);
addArg(['ic', 'ignore-content'], 1, null);
addArg(['r', 'run'], 1, null);
addArg(['R', 'recursive'], 0, false);
const { argv } = process;
let root = null;
for (let i=2; i<argv.length; ++i) {
	let str = argv[i];
	if (str[0] !== '-') {
		if (root) {
			console.log('Invalid argument ' + str);
			process.exit(1);
		} else {
			root = str;
			continue;
		}
	}
	let name = str.substr(1);
	if (!(name in argMap)) {
		console.log('Invalid argument ' + str);
		process.exit(1);
	}
	if (nArgArg[name]) {
		argMap[name] = argv[++i] || null;
	} else {
		argMap[name] = true;
	}
}
const regexArg = (name) => {
	let arg = (argMap[name]||'').trim();
	if (!arg) return null;
	if (arg[0] !== '/') {
		arg = `/${ arg }/`;
	}
	let flags = arg.match(/\/[gimuys]*$/);
	if (!flags) {
		console.log('Invalid regex ' + argMap[name].trim());
		process.exit(1);
	}
	flags = flags[0].substr(1);
	let regex = arg.match(/^\/(.*)\/[gimuys]*$/)[1];
	try {
		return new RegExp(regex, flags);
	} catch(err) {
		console.log('Invalid regex ' + argMap[name].trim());
		console.log({ regex, flags });
		process.exit(1);
	}
};
accept.dir = regexArg('d');
reject.dir = regexArg('id');
accept.name = regexArg('n');
reject.name = regexArg('in');
accept.content = regexArg('c');
reject.content = regexArg('ic');
cmd = argMap.r;
recursive = argMap.R;
if (!root) {
	root = process.cwd() + '\\';
} else if (root.includes(':')) {
	root = root.replace(/\\$/, '') + '\\';
} else {
	root = process.cwd() + `\\${ root.replace(/(^\\)|(\\$)/g, '') }\\`;
	while (root.includes('\\.\\')) {
		root = root.replace('\\.\\', '\\');
	}
	let regex = /\\[^\\]+\\\.\.\\/;
	while (regex.test(root)) {
		root = root.replace(regex, '\\');
	}
}
console.log(`${ explore(root) } matches`);