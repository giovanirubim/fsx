const fs = require('fs');
const exec = require('child_process').execSync;
const accept = {};
const reject = {};
let cmd = '';
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
			total += explore(path + '\\');
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
const argMap = {
	'n': null,
	'in': null,
	'd': null,
	'id': null,
	'c': null,
	'ic': null,
	'r': null
};
const { argv } = process;
for (let i=2; i<argv.length; ++i) {
	let str = argv[i];
	if (str[0] !== '-') {
		console.log('Invalid argument ' + str);
		process.exit(1);
	}
	let name = str.substr(1);
	if (!(name in argMap)) {
		console.log('Invalid argument ' + str);
		process.exit(1);
	}
	argMap[name] = argv[++i] || null;
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
console.log(`${ explore(process.cwd() + '\\') } matches`);