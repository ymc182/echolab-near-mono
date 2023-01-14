const sh = require("shelljs");

const calledFromDir = sh.pwd().toString();

sh.cd(__dirname);

const debug = process.argv.pop() === "--debug";

const buildCmd = debug
	? "cargo build --target wasm32-unknown-unknown"
	: "cargo build --target wasm32-unknown-unknown --release";

const { code } = sh.exec(buildCmd);

const cargoFile = require("toml").parse(
	require("fs").readFileSync("./Cargo.toml", "utf-8")
);

const contracts = cargoFile.workspace.members;
console.log(cargoFile.workspace.members);
function copyOutput(member) {
	const memberName = member.split("/")[1];
	const link = `${calledFromDir}/out/${memberName}.wasm`;
	const mode = debug ? "debug" : "release";
	const outFile = `./target/wasm32-unknown-unknown/${mode}/${memberName}.wasm`;
	sh.rm("-f", link);
	// fixes #831: copy-update instead of linking .- sometimes sh.ln does not work on Windows
	sh.cp("-u", outFile, link);
}

// Assuming this is compiled from the root project directory, link the compiled
// contract to the `out` folder –
// When running commands like `near deploy`, near-cli looks for a contract at
// <CURRENT_DIRECTORY>/out/main.wasm
if (code === 0) {
	const linkDir = `${calledFromDir}/out`;
	sh.mkdir("-p", linkDir);

	for (let member of contracts) {
		copyOutput(member);
	}
}

// TODO: Migrate every package to near_sdk ^4.0.0 so we can undo this hack.
// See Cargo.toml for this. Some packages cannot belong in the same workspace.
/* const extraneousMembers = ["./nft_staking"];

for (const member of extraneousMembers) {
	sh.cd(member);

	const { code } = sh.exec(buildCmd);
	if (code != 0) process.exit(code);

	copyOutput(member);

	sh.cd("..");
} */

// exit script with the same code as the build command
process.exit(code);
