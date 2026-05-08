import type { Digest } from "../../shared/types.js";
import type { NotificationProvider } from "../interfaces.js";

export class NoopNotificationProvider implements NotificationProvider {
  async notify(_digest: Digest): Promise<void> {
    return;
  }
}
