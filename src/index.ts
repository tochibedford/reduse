import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import ignore from 'ignore';
import minimist from 'minimist';
import * as cheerio from 'cheerio';

type IRecognizedFiles = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"]
const fileExtensions: IRecognizedFiles = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"];

/**
 * @description Returns the workspace directory passed to the program via command-line and returns it
 */
function getCommandLineArguments(): string {
    const args = minimist(process.argv.slice(2));

    if (!args._[0]) {
        console.error('Usage: node index.js <directory>');
        process.exit(1);
    }

    const workspaceDir = path.resolve(args._[0]);

    if (!fs.existsSync(workspaceDir)) {
        console.error(`Directory "${workspaceDir}" does not exist`);
        process.exit(1);
    }

    return workspaceDir
}

/**
 * Returns a list of files in the directory that have any of the file extensions passed to the function
 * 
 * @param directory - the directory of the workspace you want to scan
 * @param fileExtensions - a list of file extensions to look for in the directory
 * @param ignoreNodeModules - an optional boolean that determines whether to ignore the "node_modules" folder, Defaults to true
 */
function listRelevantFiles(directory: string, fileExtensions: string[], ignoreNodeModules = true) {
    const ignoreFilePath = path.join(directory, '.gitignore');
    let ignoreRules = fs.existsSync(ignoreFilePath)
        ? ignore().add(fs.readFileSync(ignoreFilePath, 'utf8'))
        : ignore();
    ignoreRules = ignoreNodeModules ? ignoreRules.add("node_modules") : ignoreRules
    const options = {
        cwd: directory,
        absolute: true,
    };
    const files = fileExtensions.flatMap((ext) => glob.sync(`**/*${ext}`, options));
    const fil = ignoreRules.createFilter()
    const filteredWithIgnore = files.filter(file => {
        return fil(path.relative("/", file))
    })
    console.log(`Found ${filteredWithIgnore.length} files:`);
    return filteredWithIgnore;
}

/**
 * Converts a list of file paths to a dictionary/object that has it's keys as file extensions and it's values as the file paths 
 * 
 * @example 
 * const fileDict = convertFileListToDictionary(["C:\\a.js", "C:\\b.jsx"])
 * console.log(fileDict) 
 * //{
 * // '.js': ["C:\\a.js"], '.jsx': ["C:\\b.jsx"]
 * //}
 * 
 * @param fileList 
 * @returns 
 */
function convertFileListToDictionary(fileList: string[]) {
    const files: {
        [key in typeof fileExtensions[number]]?: string[]
    } = {}

    fileList.forEach(file => {
        files[path.extname(file) as typeof fileExtensions[number]] === undefined ?
            files[path.extname(file) as typeof fileExtensions[number]] = [file] :
            files[path.extname(file) as typeof fileExtensions[number]]?.push(file)
    })

    return files
}

/**
 * Returns a list of image paths references in a html file
 * @param file path to a html file
 */
function findImagesInHTML(file: string) {
    //TODO: add support for images loaded through prefetching; i.e. <link href="image.jpeg" />
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html);

    const imageSources = $('img').map((i, el) => {
        const source = $(el).attr('src')
        if (source) {
            //relative path between current working directory and "file"'s directory + source
            return path.join(path.relative("/", path.dirname(file)), source)
        } else {
            return undefined
        }
    }).get();

    return imageSources;
}

/**
 * Returns a dictionary of image references 
 * //more details to come
 * @param files - an object/dictionary that has it's keys as file extensions and it's values as the file paths
 * @returns 
 */
function buildImageReferenceDictionary(files: { [key in typeof fileExtensions[number]]?: string[] }) {
    const imageReferencesFromFiles: {
        [key: string]: string[]
    } = {}

    files['.html']?.forEach(file => {
        imageReferencesFromFiles[file] = findImagesInHTML(file)
    })

    return imageReferencesFromFiles
}


// test with // C:\Users\user\Documents\PRog\fountain-baby
function main() {
    const workspaceDir = getCommandLineArguments()

    const fileList = listRelevantFiles(workspaceDir, [...fileExtensions])

    const files = convertFileListToDictionary(fileList)

    const imageReferencesFromFiles = buildImageReferenceDictionary(files)

    console.log(files)
    console.log(imageReferencesFromFiles) // should images be keys and not the files themselves?
}

main();
