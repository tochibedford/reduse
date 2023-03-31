#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import glob from 'glob'
import sharp from 'sharp'
import chalk from 'chalk'
import ignore from 'ignore'
import csstree from 'css-tree'
import minimist from 'minimist'
import * as cheerio from 'cheerio'

type IRecognizedFiles = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"]
const fileExtensions: IRecognizedFiles = ['.html', '.css', '.scss', '.ts', ".js", ".tsx", ".jsx"]

/**
 * @description Returns the workspace directory passed to the program via command-line and returns it
 */
function getCommandLineArguments(): { workspaceDir: string, format: keyof sharp.FormatEnum, fixImports: boolean } {
    const args = minimist(process.argv.slice(2))

    const { _, f, fixImports } = args
    if (!args._[0]) {
        console.error(chalk.bgRed('Usage: node index.js <directory>'))
        process.exit(1)
    }

    const workspaceDir = path.resolve(_[0])

    if (!fs.existsSync(workspaceDir)) {
        console.error(chalk.bgRed(`Directory "${chalk.bold.underline(workspaceDir)}" does not exist`))
        process.exit(1)
    }

    return { workspaceDir, format: f, fixImports }
}

/**
 * Returns a list of files in the directory that have any of the file extensions passed to the function
 * 
 * @param directory - the directory of the workspace you want to scan
 * @param fileExtensions - a list of file extensions to look for in the directory
 * @param ignoreNodeModules - an optional boolean that determines whether to ignore the "node_modules" folder, Defaults to true
 */
function listRelevantFiles(directory: string, fileExtensions: string[], ignoreNodeModules = true) {
    const ignoreFilePath = path.join(directory, '.gitignore')
    let ignoreRules = fs.existsSync(ignoreFilePath)
        ? ignore().add(fs.readFileSync(ignoreFilePath, 'utf8'))
        : ignore()
    ignoreRules = ignoreNodeModules ? ignoreRules.add("node_modules") : ignoreRules
    const options = {
        cwd: directory,
        absolute: true,
    }
    const files = fileExtensions.flatMap((ext) => glob.sync(`**/*${ext}`, options))
    const fil = ignoreRules.createFilter()
    const filteredWithIgnore = files.filter(file => {
        return fil(path.relative("/", file))
    })
    console.log(`Found ${filteredWithIgnore.length} files`)
    return filteredWithIgnore
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
 * Converts a compatible image type to another compatible type.
 * 
 * Compatible formats are: ```heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl```
 * 
 * @param inputFilePath - a string representing file path to image to be converted
 * @param outputFilePath - a string representing file path where new image is to be written to
 * @param outputFormat - a string representing the image format of `outputFilePath`. See compatible types above.
 */
async function convertImage(inputFilePath: string, outputFilePath: string, outputFormat: keyof sharp.FormatEnum | sharp.AvailableFormatInfo): Promise<void> {
    // Use Sharp to read the input image file
    const image = sharp(inputFilePath)

    // Use Sharp to set the output format and write to the output file path

    try {
        await image.toFormat(outputFormat).toFile(outputFilePath)
    } catch {
        console.log(`Same file input -> output ${inputFilePath}`)
    }
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
function convertImagesInDirectory(workspaceDir: string, outputFormat: keyof sharp.FormatEnum | sharp.AvailableFormatInfo) {
    const conversionMap: {
        [key: string]: string
    } = {}

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
    ])

    imageFilesList.forEach(imageFilePath => {
        const extname = path.extname(imageFilePath)
        const basename = path.basename(imageFilePath, extname)
        const outputPath = path.join(path.dirname(imageFilePath), `${basename}.${outputFormat}`)

        convertImage(imageFilePath, outputPath, outputFormat)
        conversionMap[imageFilePath] = outputPath
    })

    return conversionMap
}

/**
 * Opens a file to be passed and returns a function that accepts a replacer (html, css, scss, js, jsx, ts, tsx). 
 * Passing a replacer to the returned function replaces image references in the opened file then writes a modified file.
 * @param pathToFile 
 * @param conversionMap 
 * @returns 
 */
function replaceInFile(pathToFile: string, conversionMap: {
    [key: string]: string
}) {
    const fileString = fs.readFileSync(pathToFile, 'utf8')

    return function (replacer: (fileString: string, conversion: typeof conversionMap, pathToFile: string) => string) {
        const modifiedFile = replacer(fileString, conversionMap, pathToFile)
        fs.writeFileSync(pathToFile, modifiedFile)
    }
}

/**
 * Returns a converted html file. It parses a html file looking for references to images, 
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 * @deprecated
 */
function htmlOldReplacer(fileString: string, conversionMap: { [key: string]: string }, pathToFile: string) {
    const $ = cheerio.load(fileString, null, true)

    $('img').toArray().forEach(el => {
        const source = $(el).attr('src')
        if (source) {
            $(el).attr('src', path.relative(path.dirname(pathToFile), conversionMap[path.join(path.dirname(pathToFile), source)]))
        }
    })

    return $.html()
}

/**
 * Returns a converted html file. It parses a html file looking for references to images, 
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 */
function htmlReplacer(fileString: string, conversionMap: { [key: string]: string }, pathToFile: string) {
    const regex = /(?<=<img.+)(?<=src=["']).+?(?=['"])/g
    const output = fileString.replace(regex, (match) => {
        const conversion = conversionMap[path.join(path.dirname(pathToFile), match)]
        if (conversion) {
            const newPath = path.relative(path.dirname(pathToFile), conversion).replace("\\", "/")
            return `${newPath}`
        } else {
            return match
        }
    });
    return output
}

/**
 * Returns a converted css file. It parses a css file looking for references to images, 
 * and replaces those references with references to new converted images gotten from the conversion Map. It then returns the converted file as a string
 * @param fileString - string contents of the file to be parsed
 * @param conversionMap - This is an object containing input images as keys and the images they were converted to (output images) as values
 * @param pathToFile - path to file to be parsed
 */
function cssReplacer(fileString: string, conversionMap: { [key: string]: string }, pathToFile: string) {
    const ast = csstree.parse(fileString)

    csstree.walk(ast, (node) => {
        if (node.type === 'Declaration' && (node.property === 'background-image' || node.property === 'background')) {
            csstree.walk(node.value, {
                visit: "Url",
                enter: (urlNode) => {
                    const source = urlNode.value;
                    const newPath = path.relative(path.dirname(pathToFile), conversionMap[path.join(path.dirname(pathToFile), source)])
                    urlNode.value = newPath;
                }
            })
        }
    })

    return csstree.generate(ast);
}

function scssReplacer(fileString: string, conversionMap: { [key: string]: string }, pathToFile: string) {
    const regex = /(?<=url\()[^)]+(?=\))/g; // a regex string to match url("a.jpg") or url(a.jpg) but alwaysreturn everything inside the parentheses(i.e "a.jpg" and a.jpg)
    const output = fileString.replace(regex, (originalMatch, _) => {
        const stringStartEnd = [0, originalMatch.length]
        if (originalMatch.endsWith('"') || originalMatch.endsWith("'")) {
            stringStartEnd[1] -= 1
        }
        if (originalMatch.startsWith('"') || originalMatch.startsWith("'")) {
            stringStartEnd[0] += 1
        }
        const match = originalMatch.slice(...stringStartEnd)
        const conversion = conversionMap[path.join(path.dirname(pathToFile), match)]
        if (conversion) {
            const newPath = path.relative(path.dirname(pathToFile), conversion).replace("\\", "/")
            return `"${newPath}"`
        } else {
            return originalMatch
        }
    });
    return output
}

function jsReplacer(fileString: string, conversionMap: { [key: string]: string }, pathToFile: string) {
    const regex = /(?<=from.['"]).+(?=['"])/g
    const output = fileString.replace(regex, (match) => {
        const conversion = conversionMap[path.join(path.dirname(pathToFile), match)]
        if (conversion) {
            const newPath = path.relative(path.dirname(pathToFile), conversion).replace("\\", "/")
            return `${newPath}`
        } else {
            return match
        }
    });
    return output
}

async function main() {
    const { workspaceDir, format, fixImports } = getCommandLineArguments()

    if (!Object.keys(sharp.format).includes(format)) {
        console.error(chalk.bold(chalk.white.bgRed(`You used ${format} for format.`)) + chalk.rgb(50, 200, 70)("\n Use one of the following formats instead: \n  heic, heif, avif, jpeg, jpg, jpe, tile, dz, png, raw, tiff, tif, webp, gif, jp2, jpx, j2k, j2c, jxl"))
        process.exit(1)
    }

    const conversionMap = convertImagesInDirectory(workspaceDir, format)
    console.log(`Converted ${Object.keys(conversionMap).length} images (See conversion map below): `)
    console.log(conversionMap)

    if (!fixImports) {
        return
    }

    const fileList = listRelevantFiles(workspaceDir, [...fileExtensions])

    const files = convertFileListToDictionary(fileList)

    Object.entries(files).forEach(([key, value]) => {
        switch (key) {
            case ".html":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(htmlReplacer)
                })
                break;
            case ".css":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(scssReplacer)
                })
                break;
            case ".scss":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(scssReplacer)
                })
                break;
            case ".js":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer)
                })
                break;
            case ".jsx":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer)
                })
                break;
            case ".ts":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer)
                })
                break;
            case ".tsx":
                value.forEach(file => {
                    replaceInFile(file, conversionMap)(jsReplacer)
                })
                break;
            default:
                console.log(`No support for ${key} files just yet`)
                break;
        }
    })
}

main()

/**
 * Currently a Type error occurs when a file points to a non-existent image reference in html (e.g a deleted image or broken link of some sort): 
 * throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
   ^
    TypeError [ERR_INVALID_ARG_TYPE]: The "to" argument must be of type string. Received undefined

    It's very undescriptive and unexplanatory and it's a headache to have to figure it out each time it happens, //TODO: maybe create a try catch here?

    A good idea would be to try catch for this during image conversion instead of in the replace html stage.
 * 
 */
