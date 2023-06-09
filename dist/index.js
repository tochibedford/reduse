#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandLineArguments = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const sharp_1 = __importDefault(require("sharp"));
const chalk_1 = __importDefault(require("chalk"));
const ignore_1 = __importDefault(require("ignore"));
const css_tree_1 = __importDefault(require("css-tree"));
const minimist_1 = __importDefault(require("minimist"));
const fileExtensions = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"];
/**
 * Confirms that workspaceDir is a Directory. Returns `true` if it is, and `false` if it isn't
 * @param workspaceDir
 */
function confirmDirectory(workspaceDir) {
    if (!fs_1.default.existsSync(workspaceDir)) {
        console.error(chalk_1.default.bgRed(`Directory "${chalk_1.default.bold.underline(workspaceDir)}" does not exist`));
        return false;
    }
    try {
        const stat = fs_1.default.statSync(workspaceDir);
        if (stat.isFile()) {
            console.error(chalk_1.default.bgRed(`The path you provided: ${chalk_1.default.underline.bold(workspaceDir)} is a file.\nDirect file conversion is not supported yet`));
            return false;
        }
        else if (stat.isDirectory()) {
            return true;
        }
        return true;
    }
    catch (err) {
        if (err) {
            console.error(chalk_1.default.bgRed(err));
            return false;
        }
    }
}
/**
 * @description Returns the workspace directory passed to the program via command-line and returns it
 */
function getCommandLineArguments(argsIn) {
    const args = (0, minimist_1.default)(argsIn);
    const { _, f, fixImports } = args;
    if (!args._[0]) {
        console.error(chalk_1.default.bgRed('Usage: node index.js <directory>'));
        return false;
    }
    const workspaceDir = path_1.default.resolve(_[0]);
    const directoryConfirmed = confirmDirectory(workspaceDir);
    if (directoryConfirmed) {
        return { workspaceDir, format: f, fixImports };
    }
    else {
        return false;
    }
}
exports.getCommandLineArguments = getCommandLineArguments;
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
 * Converts a compatible image type to another compatible type.
 *
 * Compatible formats are: ```heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl```
 *
 * @param inputFilePath - a string representing file path to image to be converted
 * @param outputFilePath - a string representing file path where new image is to be written to
 * @param outputFormat - a string representing the image format of `outputFilePath`. See compatible types above.
 */
function convertImage(inputFilePath, outputFilePath, outputFormat) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use Sharp to read the input image file
        const image = (0, sharp_1.default)(inputFilePath);
        // Use Sharp to set the output format and write to the output file path
        try {
            yield image.toFormat(outputFormat).toFile(outputFilePath);
        }
        catch (_a) {
            console.log(`Same file input -> output ${inputFilePath}`);
        }
    });
}
/**
 * Converts images in given workspace directory to specified output format and returns a conversion map, which is an object with the shape:
 * ```
 * {
 *  "path/to/original/image1": "path/to/converted/image1",
 *  "path/to/original/image2": "path/to/converted/image2",
 *    ...
 * }
 * ```
 *
 * Compatible formats are: ```heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl```
 *
 * @param workspaceDir - a string representing the workspace direectory of the project to be converted
 * @param outputFormat - a string representing the image format of `outputFilePath`. See compatible types above.
 */
function convertImagesInDirectory(workspaceDir, outputFormat) {
    const conversionMap = {};
    const imageFilesList = listRelevantFiles(workspaceDir, [
        "avif",
        "dz",
        "fits",
        "gif",
        "heif",
        "input",
        "jpeg",
        "jpg",
        "jp2",
        "jxl",
        "magick",
        "openslide",
        "pdf",
        "png",
        "ppm",
        "raw",
        "svg",
        "tiff",
        "tif",
        "v",
        "webp"
    ]);
    imageFilesList.forEach(imageFilePath => {
        const extname = path_1.default.extname(imageFilePath);
        const basename = path_1.default.basename(imageFilePath, extname);
        const outputPath = path_1.default.join(path_1.default.dirname(imageFilePath), `${basename}.${outputFormat}`);
        convertImage(imageFilePath, outputPath, outputFormat);
        conversionMap[imageFilePath] = outputPath;
    });
    return conversionMap;
}
/**
 * Opens a file to be passed and returns a function that accepts a replacer (html, css, scss, js, jsx, ts, tsx).
 * Passing a replacer to the returned function replaces image references in the opened file then writes a modified file.
 * @param pathToFile
 * @param conversionMap
 * @returns
 */
function replaceInFile(pathToFile, conversionMap) {
    const fileString = fs_1.default.readFileSync(pathToFile, 'utf8');
    return function (replacer) {
        const modifiedFile = replacer(fileString, conversionMap, pathToFile);
        fs_1.default.writeFileSync(pathToFile, modifiedFile);
    };
}
/**
 * Returns a converted html file. It parses a html file looking for references to images,
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 */
function htmlReplacer(fileString, conversionMap, pathToFile) {
    const regex = /(?<=<img.+)(?<=src=["']).+?(?=['"])/g;
    const output = fileString.replace(regex, (match) => {
        const conversion = conversionMap[path_1.default.join(path_1.default.dirname(pathToFile), match)];
        if (conversion) {
            const newPath = path_1.default.relative(path_1.default.dirname(pathToFile), conversion).replace("\\", "/");
            return `${newPath}`;
        }
        else {
            return match;
        }
    });
    return output;
}
/**
 * Returns a converted css file. It parses a css file looking for references to images,
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 */
function cssReplacer(fileString, conversionMap, pathToFile) {
    const ast = css_tree_1.default.parse(fileString);
    css_tree_1.default.walk(ast, (node) => {
        if (node.type === 'Declaration' && (node.property === 'background-image' || node.property === 'background')) {
            css_tree_1.default.walk(node.value, {
                visit: "Url",
                enter: (urlNode) => {
                    const source = urlNode.value;
                    const newPath = path_1.default.relative(path_1.default.dirname(pathToFile), conversionMap[path_1.default.join(path_1.default.dirname(pathToFile), source)]);
                    urlNode.value = newPath;
                }
            });
        }
    });
    return css_tree_1.default.generate(ast);
}
function scssReplacer(fileString, conversionMap, pathToFile) {
    const regex = /(?<=url\()[^)]+(?=\))/g; // a regex string to match url("a.jpg") or url(a.jpg) but alwaysreturn everything inside the parentheses(i.e "a.jpg" and a.jpg)
    const output = fileString.replace(regex, (originalMatch, _) => {
        const stringStartEnd = [0, originalMatch.length];
        if (originalMatch.endsWith('"') || originalMatch.endsWith("'")) {
            stringStartEnd[1] -= 1;
        }
        if (originalMatch.startsWith('"') || originalMatch.startsWith("'")) {
            stringStartEnd[0] += 1;
        }
        const match = originalMatch.slice(...stringStartEnd);
        const conversion = conversionMap[path_1.default.join(path_1.default.dirname(pathToFile), match)];
        if (conversion) {
            const newPath = path_1.default.relative(path_1.default.dirname(pathToFile), conversion).replace("\\", "/");
            return `"${newPath}"`;
        }
        else {
            return originalMatch;
        }
    });
    return output;
}
function jsReplacer(fileString, conversionMap, pathToFile) {
    const regex = /(?<=from.['"]).+(?=['"])/g;
    const output = fileString.replace(regex, (match) => {
        const conversion = conversionMap[path_1.default.join(path_1.default.dirname(pathToFile), match)];
        if (conversion) {
            const newPath = path_1.default.relative(path_1.default.dirname(pathToFile), conversion).replace("\\", "/");
            return `${newPath}`;
        }
        else {
            return match;
        }
    });
    return output;
}
function main() {
    const cmdArg = getCommandLineArguments(process.argv.slice(2));
    if (!cmdArg) {
        return;
    }
    const { workspaceDir, format, fixImports } = cmdArg;
    if (!Object.keys(sharp_1.default.format).includes(format)) {
        console.error(chalk_1.default.bold(chalk_1.default.white.bgRed(`You used ${format} for format.`)) + chalk_1.default.rgb(50, 200, 70)("\n Use one of the following formats instead: \n  heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl"));
        return;
    }
    const conversionMap = convertImagesInDirectory(workspaceDir, format);
    console.log(`Converted ${Object.keys(conversionMap).length} images (See conversion map below): `);
    console.log(conversionMap);
    if (!fixImports) {
        return;
    }
    const fileList = listRelevantFiles(workspaceDir, [...fileExtensions]);
    const files = convertFileListToDictionary(fileList);
    Object.entries(files).forEach(([key, value]) => {
        switch (key) {
            case ".html":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(htmlReplacer);
                });
                break;
            case ".css":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(scssReplacer);
                });
                break;
            case ".scss":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(scssReplacer);
                });
                break;
            case ".js":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer);
                });
                break;
            case ".jsx":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer);
                });
                break;
            case ".ts":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer);
                });
                break;
            case ".tsx":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer);
                });
                break;
            default:
                console.log(`No support for ${key} files just yet`);
                break;
        }
    });
}
main();
/**
 * Currently a Type error occurs when a file points to a non-existent image reference in html (e.g a deleted image or broken link of some sort):
 * throw new ERR_INVALID_ARG_TYPE(name, 'string', value)
   ^
    TypeError [ERR_INVALID_ARG_TYPE]: The "to" argument must be of type string. Received undefined

    It's very undescriptive and unexplanatory and it's a headache to have to figure it out each time it happens, //TODO: maybe create a try catch here?

    A good idea would be to try catch for this during image conversion instead of in the replace html stage.
 *
 */
//# sourceMappingURL=index.js.map