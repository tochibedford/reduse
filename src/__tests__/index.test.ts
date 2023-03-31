import { getCommandLineArguments } from ".."

describe('Comman Line Arguments', () => {
    test("Returns false when no directory argument is passed", () => {
        const argv: string[] = []
        argv.push("")

        const args = getCommandLineArguments(argv);
        console.error = jest.fn()
        expect(args).toEqual(false)
    })

    test("Returns object with command line arguments", () => {
        const argv: string[] = []
        argv.push("C:\\Users\\user\\Documents\\PRog\\reduse\\test_project")
        argv.push("-f")
        argv.push("png")
        argv.push("--fixImports")
        const args = getCommandLineArguments(argv) as Exclude<ReturnType<typeof getCommandLineArguments>, false>
        expect(args.workspaceDir).toEqual("C:\\Users\\user\\Documents\\PRog\\reduse\\test_project")
        expect(args.format).toEqual("png")
        expect(args.fixImports).toEqual(true)

    })
})