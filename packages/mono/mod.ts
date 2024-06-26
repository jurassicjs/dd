import { parseArgs } from "@std/cli/parse_args";
import { existsSync } from "@std/fs";
import chalk from "npm:chalk@5.3.0";

const parsedArgs = parseArgs(Deno.args);
const command = parsedArgs._[0] as string;
const promises = [];
const colors: string[] = [
  "#007FFF", // Blue
  "#00FF00", // Green
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#90EE90", // Light Green
  "#4169E1", // Royal Blue
];

let colorCounter = 0;

const denoConfigPath = `${Deno.cwd()}/deno.json`;
if (existsSync(denoConfigPath)) {
  const denoConfigText = await Deno.readTextFile(denoConfigPath);
  const denoConfig = JSON.parse(denoConfigText);

  // Continue using your denoConfig object
  const workspaces = denoConfig.workspaces;

  if (!workspaces?.length || workspaces.length === 0) {
    console.error(chalk.bgRed("No workspaces found in deno.json"));
    Deno.exit(1);
  }

  for (const workspace of workspaces) {
    const chalkName = chalk.hex(colors[colorCounter]);
    console.log(chalkName('Running task in: ', workspace, '\n'));
    // Start the server in a separate async function
    const promise = (async () => {
      const cmd = new Deno.Command(Deno.execPath(), {
        args: ["task", command],
        cwd: workspace,
        stderr: "piped",
        stdout: "piped",
      })
      const proc = cmd.spawn(); // Spawn the process

      // Read stdout in chunks
      const stdoutReader = proc.stdout.getReader();
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        console.log(chalkName(`Output from ${workspace}:`), text);
      }

      // Read stderr in chunks 
      const stderrReader = proc.stderr.getReader();
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;

        const text = new TextDecoder().decode(value, {stream:true});
        console.log('***********************')
        console.error(`Error from ${workspace}:`, text);
      }


      // Wait for the server to finish for error handling (no promises)
      const { code, stdout, stderr } = await cmd.output();
      const stdoutString = new TextDecoder().decode(stdout);
      console.log(`Output from ${workspace}:`, stdoutString);

      if (code !== 0) {
        const stderrString = new TextDecoder().decode(stderr);

        console.error('error code: ', code);
        console.error('error: ', stderrString);
        Deno.exit(code);
      }
      console.log(new TextDecoder().decode(stdout))
      return new TextDecoder().decode(stdout);
    })();

    // Add the promise to the array
    promises.push(promise);
    colorCounter++;
  }

  const cool = promises
  console.log('promises: ',promises, promises.length, cool)
  // Wait for all servers to finish
  const res = await Promise.all(promises);

  console.log("All tasks completed successfully.", res);

} else {
  console.error("Error: deno.json not found in the current working directory.");
}
