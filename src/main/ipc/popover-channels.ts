import { registerHandler } from './registry';
import {
  ipcChannels,
  popoverHideRequestSchema,
  popoverHideResponseSchema
} from '@shared/schemas';
import { hidePopover } from '../windows/popover-window';

export function registerPopoverChannels(): void {
  registerHandler({
    channel: ipcChannels.popoverHide,
    request: popoverHideRequestSchema,
    response: popoverHideResponseSchema,
    handler: () => {
      hidePopover();
      return undefined;
    }
  });
}
