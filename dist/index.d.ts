export {};
/**
 * Currently a Type error occurs when a file points to a non-existent image reference in html (e.g a deleted image or broken link of some sort):
 * throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
   ^
    TypeError [ERR_INVALID_ARG_TYPE]: The "to" argument must be of type string. Received undefined

    It's very undescriptive and unexplanatory and it's a headache to have to figure it out each time it happens, //TODO: maybe create a try catch here?

    A good idea would be to try catch for this during image conversion instead of in the replace html stage.
 *
 */
/**
 * TODO: Convert html replacer to use regex replacing instead of Cheerio
 */ 
//# sourceMappingURL=index.d.ts.map