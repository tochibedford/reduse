import { getCommandLineArguments } from ".."
import mockStdin from 'mock-stdin'

describe('Comman Line Arguments', () => {
    test("Throws an error when no directory argument is passed", () => {
        const stdin = mockStdin.stdin()
        stdin.send("")
        stdin.end()

        const args = getCommandLineArguments(process.argv);
        console.error = jest.fn()
        expect(args).toEqual(false)
    })
})