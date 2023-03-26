"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const sharp_1 = __importDefault(require("sharp"));
const ignore_1 = __importDefault(require("ignore"));
const minimist_1 = __importDefault(require("minimist"));
const cheerio = __importStar(require("cheerio"));
const css_tree_1 = __importDefault(require("css-tree"));
const fileExtensions = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"];
/**
 * @description Returns the workspace directory passed to the program via command-line and returns it
 */
function getCommandLineArguments() {
    const args = (0, minimist_1.default)(process.argv.slice(2));
    const { _, f, fixImports } = args;
    if (!args._[0]) {
        console.error('Usage: node index.js <directory>');
        process.exit(1);
    }
    const workspaceDir = path_1.default.resolve(_[0]);
    if (!fs_1.default.existsSync(workspaceDir)) {
        console.error(`Directory "${workspaceDir}" does not exist`);
        process.exit(1);
    }
    return { workspaceDir, format: f, fixImports };
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
    const $ = cheerio.load(fileString, null, true);
    $('img').toArray().forEach(el => {
        const source = $(el).attr('src');
        if (source) {
            $(el).attr('src', path_1.default.relative(path_1.default.dirname(pathToFile), conversionMap[path_1.default.join(path_1.default.dirname(pathToFile), source)]));
        }
    });
    return $.html();
}
/**
 * Returns a converted css file. It parses a css file looking for references to images,
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 */
function cssReplacer(file, conversionMap, pathToFile) {
    const ast = css_tree_1.default.parse(file);
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
function main() {
    const { workspaceDir, format, fixImports } = getCommandLineArguments();
    if (!Object.keys(sharp_1.default.format).includes(format)) {
        throw Error(`You used "${format}" for format. \n Use one of the following formats instead: \n  heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl`);
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
                    replaceInFile(file, conversionMap)(cssReplacer);
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
 * throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
   ^
    TypeError [ERR_INVALID_ARG_TYPE]: The "to" argument must be of type string. Received undefined

    It's very undescriptive and unexplanatory and it's a headache to have to figure it out each time it happens, //TODO: maybe create a try catch here?

    A good idea would be to try catch for this during image conversion instead of in the replace html stage.
 *
 */
//# sourceMappingURL=index.js.map