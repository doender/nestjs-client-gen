import ora from 'ora';
import { Project } from 'ts-morph';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateClient } from './generator';
import { parseProject } from './parser/parser';

const main = async () => {
    const argv = yargs(hideBin(process.argv))
        .option('tsconfig', {
            alias: 'c',
            type: 'string',
            description: 'Path to tsconfig.json',
            demandOption: true,
        })
        .option('apiPath', {
            alias: 'i',
            type: 'string',
            description: 'Path to API src folder',
            demandOption: true,
        })
        .option('outputPath', {
            alias: 'o',
            type: 'string',
            description: 'Path where to write the generated client',
            demandOption: true,
        })
        .parseSync();

    const spinner = ora({ text: 'Parsing project source files...' }).start();
    const project = new Project({ tsConfigFilePath: argv.tsconfig });
    const endpoints = parseProject(project);
    const clientSourceFile = project.createSourceFile(argv.outputPath, generateClient(endpoints), { overwrite: true });
    spinner.succeed('Project parsed');

    spinner.start('Generating client...');
    clientSourceFile.fixMissingImports();
    clientSourceFile.organizeImports();
    clientSourceFile.fixUnusedIdentifiers();
    await clientSourceFile.save();
    spinner.succeed('Client generated');
};

main();
