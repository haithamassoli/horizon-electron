import { ipcMain, type IpcMainInvokeEvent, BrowserWindow } from 'electron';
import type { ZodType } from 'zod';
import type { IpcError } from '@shared/schemas';

type Handler<Req, Res> = (req: Req, event: IpcMainInvokeEvent) => Promise<Res> | Res;

interface HandlerOptions<Req, Res> {
  channel: string;
  request: ZodType<Req>;
  response: ZodType<Res>;
  handler: Handler<Req, Res>;
}

function toIpcError(code: IpcError['code'], message: string, details?: unknown): IpcError {
  const err: IpcError = { code, message };
  if (details !== undefined) err.details = details;
  return err;
}

export function registerHandler<Req, Res>(opts: HandlerOptions<Req, Res>): void {
  ipcMain.handle(opts.channel, async (event, raw: unknown) => {
    const reqParse = opts.request.safeParse(raw);
    if (!reqParse.success) {
      console.warn(`[ipc] validation failed on ${opts.channel}`, reqParse.error.issues);
      throw toIpcError('validation_error', `Invalid request payload for ${opts.channel}`, reqParse.error.issues);
    }
    try {
      const result = await opts.handler(reqParse.data, event);
      const resParse = opts.response.safeParse(result);
      if (!resParse.success) {
        console.error(`[ipc] response validation failed on ${opts.channel}`, resParse.error.issues);
        throw toIpcError('handler_error', `Invalid response payload for ${opts.channel}`, resParse.error.issues);
      }
      return resParse.data;
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err) throw err;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ipc] handler threw on ${opts.channel}`, err);
      throw toIpcError('handler_error', message);
    }
  });
}

export function broadcast<T>(channel: string, schema: ZodType<T>, payload: T): void {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error(`[ipc] refusing to broadcast invalid payload on ${channel}`, parsed.error.issues);
    return;
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, parsed.data);
  }
}

export function unregisterAll(): void {
  ipcMain.removeAllListeners();
}
