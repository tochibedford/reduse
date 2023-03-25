"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const ignore_1 = __importDefault(require("ignore"));
const minimist_1 = __importDefault(require("minimist"));
const cheerio_1 = __importDefault(require("cheerio"));
const fileExtensions = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"];
/**
 * @description Returns the workspace directory passed to the program via command-line and returns it
 */
function getCommandLineArguments() {
    const args = (0, minimist_1.default)(process.argv.slice(2));
    const { _, fixImports } = args;
    if (!args._[0]) {
        console.error('Usage: node index.js <directory>');
        process.exit(1);
    }
    const workspaceDir = path_1.default.resolve(_[0]);
    if (!fs_1.default.existsSync(workspaceDir)) {
        console.error(`Directory "${workspaceDir}" does not exist`);
        process.exit(1);
    }
    return { workspaceDir, fixImports };
}
/**
 * Returns a list of files in the directory that have any of the file extensions passed to the function
 *
 * @param directory - the directory of the workspace you want to scan
 * @param fileExtensions - a list of file extensions to look for in the directory
 * @param ignoreNodeModules - an optional boolean that determines whether to ignore the "node_modules" folder, Defaults to true
 */
function listRelevantFiles(directory, fileExtensions, ignoreNodeModules = true) {
    const ignoreFilePath = path_1.default.join(directory, '.gitignore');
    let ignoreRules = fs_1.default.existsSync(ignoreFilePath)
        ? (0, ignore_1.default)().add(fs_1.default.readFileSync(ignoreFilePath, 'utf8'))
        : (0, ignore_1.default)();
    ignoreRules = ignoreNodeModules ? ignoreRules.add("node_modules") : ignoreRules;
    const options = {
        cwd: directory,
        absolute: true,
    };
    const files = fileExtensions.flatMap((ext) => glob_1.default.sync(`**/*${ext}`, options));
    const fil = ignoreRules.createFilter();
    const filteredWithIgnore = files.filter(file => {
        return fil(path_1.default.relative("/", file));
    });
    console.log(`Found ${filteredWithIgnore.length} files`);
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
function convertFileListToDictionary(fileList) {
    const files = {};
    fileList.forEach(file => {
        var _a;
        files[path_1.default.extname(file)] === undefined ?
            files[path_1.default.extname(file)] = [file] :
            (_a = files[path_1.default.extname(file)]) === null || _a === void 0 ? void 0 : _a.push(file);
    });
    return files;
}
/**
 * Returns a list of image paths references in a html file
 * @param file path to a html file
 */
function findImagesInHTML(file) {
    //TODO: add support for images loaded through prefetching; i.e. <link href="image.jpeg" />
    const html = fs_1.default.readFileSync(file, 'utf8');
    const $ = cheerio_1.default.load(html);
    const imageSources = $('img').map((i, el) => {
        const source = $(el).attr('src');
        if (source) {
            //relative path between current working directory and "file"'s directory + source
            return path_1.default.join(path_1.default.relative("/", path_1.default.dirname(file)), source);
        }
        else {
            return undefined;
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
function buildImageReferenceDictionary(files) {
    var _a;
    const imageReferencesFromFiles = {};
    (_a = files['.html']) === null || _a === void 0 ? void 0 : _a.forEach(file => {
        imageReferencesFromFiles[file] = findImagesInHTML(file);
    });
    return imageReferencesFromFiles;
}
// async function convertImage(inputFilePath: string, outputFilePath: string, outputFormat: string): Promise<void> {
//   // Use Sharp to read the input image file
//   const image = sharp(inputFilePath);
//   // Use Sharp to set the output format and write to the output file path
//   await image.toFormat(outputFormat).toFile(outputFilePath);
// }
function main() {
    const { workspaceDir, fixImports } = getCommandLineArguments();
    const fileList = listRelevantFiles(workspaceDir, [...fileExtensions]);
    const files = convertFileListToDictionary(fileList);
    const imageReferencesFromFiles = buildImageReferenceDictionary(files);
    // console.log(files)
    // console.log(imageReferencesFromFiles) // should images be keys and not the files themselves?
}
main();
