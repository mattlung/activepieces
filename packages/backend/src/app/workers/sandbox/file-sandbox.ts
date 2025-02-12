import { rmdir, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { AbstractSandbox, ExecuteSandboxResult, SandboxCtorParams } from './abstract-sandbox'
import { logger } from '../../helper/logger'
import { system } from '../../helper/system/system'
import { SystemProp } from '../../helper/system/system-prop'
import { EngineResponseStatus } from '@activepieces/shared'

export class FileSandbox extends AbstractSandbox {
    public constructor(params: SandboxCtorParams) {
        super(params)
    }

    protected override async recreateCleanup(): Promise<void> {
        const sandboxFolderPath = this.getSandboxFolderPath()

        try {
            await rmdir(sandboxFolderPath, { recursive: true })
        }
        catch (e) {
            logger.debug(e, `[Sandbox#recreateCleanup] rmdir failure ${sandboxFolderPath}`)
        }

        await mkdir(sandboxFolderPath, { recursive: true })
    }

    async runCommandLine(commandLine: string): Promise<ExecuteSandboxResult> {
        const startTime = Date.now()
        const environment = system.get(SystemProp.ENVIRONMENT)
        const result = await this.runUnsafeCommand(`cd ${this.getSandboxFolderPath()} && env -i AP_ENVIRONMENT=${environment} NODE_OPTIONS='--enable-source-maps' ${commandLine}`)
        let engineResponse

        if (result.verdict === EngineResponseStatus.OK) {
            engineResponse = await this.parseFunctionOutput()
        }

        return {
            timeInSeconds: (Date.now() - startTime) / 1000,
            verdict: result.verdict,
            output: engineResponse?.response,
            standardOutput: await readFile(this.getSandboxFilePath('_standardOutput.txt'), { encoding: 'utf-8' }),
            standardError: await readFile(this.getSandboxFilePath('_standardError.txt'), { encoding: 'utf-8' }),
        }
    }

    public override getSandboxFolderPath(): string {
        return path.join(__dirname, `../../sandbox/${this.boxId}`)
    }

    private async runUnsafeCommand(cmd: string): Promise<{ verdict: EngineResponseStatus }> {
        logger.info(`sandbox, command: ${cmd}`)

        const standardOutputPath = this.getSandboxFilePath('_standardOutput.txt')
        const standardErrorPath = this.getSandboxFilePath('_standardError.txt')

        await writeFile(standardOutputPath, '')
        await writeFile(standardErrorPath, '')

        return new Promise((resolve, reject) => {
            const process = exec(cmd, async (error, stdout: string | PromiseLike<string>, stderr) => {
                if (error) {
                    reject(error)
                    return
                }

                if (stdout) {
                    await writeFile(standardOutputPath, await stdout)
                }

                if (stderr) {
                    // Don't return an error, because it's okay for engine to print errors, and they should be caught by the engine
                    await writeFile(standardErrorPath, stderr)
                }

                resolve({ verdict: EngineResponseStatus.OK })
            })

            setTimeout(() => {
                process.kill()
                resolve({ verdict: EngineResponseStatus.TIMEOUT })
            }, AbstractSandbox.sandboxRunTimeSeconds * 1000)
        })
    }
}
