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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
const ignore_1 = __importDefault(require("ignore"));
const minimist_1 = __importDefault(require("minimist"));
const cheerio = __importStar(require("cheerio"));
const fileExtensions = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"];
function getCommandLineArguments() {
    const args = (0, minimist_1.default)(process.argv.slice(2));
    if (!args._[0]) {
        console.error('Usage: node index.js <directory>');
        process.exit(1);
    }
    const workspaceDir = path.resolve(args._[0]);
    if (!fs.existsSync(workspaceDir)) {
        console.error(`Directory "${workspaceDir}" does not exist`);
        process.exit(1);
    }
    return workspaceDir;
}
function listRelevantFiles(where, fileExtensions, ignoreNodeModules = true) {
    const ignoreFilePath = path.join(where, '.gitignore');
    let ignoreRules = fs.existsSync(ignoreFilePath)
        ? (0, ignore_1.default)().add(fs.readFileSync(ignoreFilePath, 'utf8'))
        : (0, ignore_1.default)();
    ignoreRules = ignoreNodeModules ? ignoreRules.add("node_modules") : ignoreRules;
    const options = {
        cwd: where,
        absolute: true,
    };
    const files = fileExtensions.flatMap((ext) => glob.sync(`**/*${ext}`, options));
    const fil = ignoreRules.createFilter();
    const filteredWithIgnore = files.filter(file => {
        return fil(path.relative("/", file));
    });
    console.log(`Found ${filteredWithIgnore.length} files:`);
    return filteredWithIgnore;
}
function convertFileListToDictionary(fileList) {
    const files = {};
    fileList.forEach(file => {
        var _a;
        files[path.extname(file)] === undefined ?
            files[path.extname(file)] = [file] :
            (_a = files[path.extname(file)]) === null || _a === void 0 ? void 0 : _a.push(file);
    });
    return files;
}
function findImagesInHTML(file) {
    //TODO: add support for images loaded through prefetching; i.e. <link href="image.jpeg" />
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html);
    const imageSources = $('img').map((i, el) => {
        const source = $(el).attr('src');
        if (source) {
            //relative path between current working directory and "file"'s directory + source
            return path.join(path.relative("/", path.dirname(file)), source);
        }
        else {
            return undefined;
        }
    }).get();
    return imageSources;
}
function buildImageReferenceDictionary(files) {
    var _a;
    const imageReferencesFromFiles = {};
    // if (files['.html']) {
    (_a = files['.html']) === null || _a === void 0 ? void 0 : _a.forEach(file => {
        imageReferencesFromFiles[file] = findImagesInHTML(file);
    });
    return imageReferencesFromFiles;
}
// test with // C:\Users\user\Documents\PRog\fountain-baby
function main() {
    const workspaceDir = getCommandLineArguments();
    const fileList = listRelevantFiles(workspaceDir, [...fileExtensions]);
    const files = convertFileListToDictionary(fileList);
    const imageReferencesFromFiles = buildImageReferenceDictionary(files);
    console.log(files);
    console.log(imageReferencesFromFiles); // should images be keys and not the files themselves?
}
main();
