import { Injectable } from '@nestjs/common';
import { DEFAULT_MESSAGES } from '../common/constants/messages.const.js';

/**
 * Equivalent of Modules/Core/app/Traits/ResponseMessage.php. Each module can
 * register its own message overrides (parity with a module publishing its
 * own lang/en/app.php) under a namespace, then look them up via lang().
 *
 * For real i18n (multiple locales) swap this for `nestjs-i18n` - this class
 * only exists to give BaseController a `lang()` helper with the exact same
 * key set/interpolation the Laravel modules already use, so response copy
 * doesn't have to be rewritten module by module during the migration.
 */
@Injectable()
export class MessageService {
  private readonly namespaces = new Map<string, Record<string, string>>([['core', { ...DEFAULT_MESSAGES }]]);

  /** Merge module-specific overrides into a namespace, e.g. register('brand', {...}). */
  register(namespace: string, messages: Record<string, string>): void {
    const existing = this.namespaces.get(namespace) ?? {};
    this.namespaces.set(namespace, { ...existing, ...messages });
  }

  /**
   * lang('create-success', { name: 'Brand' }) -> "Brand created successfully."
   * Falls back to `core` namespace, then to the raw key if nothing matches.
   */
  lang(key: string, params: Record<string, string> = {}, namespace = 'core'): string {
    const messages = this.namespaces.get(namespace) ?? {};
    const template = messages[key] ?? DEFAULT_MESSAGES[key] ?? key;

    return Object.entries(params).reduce((result, [param, value]) => result.replaceAll(`:${param}`, value), template);
  }
}
