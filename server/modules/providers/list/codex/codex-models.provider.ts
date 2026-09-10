import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import TOML from '@iarna/toml';

import { codexAppServer } from '@/modules/providers/list/codex/codex-app-server.client.js';

import type { IProviderModels } from '@/shared/interfaces.js';
import type {
  AnyRecord,
  ProviderCurrentActiveModel,
  ProviderModelsDefinition,
} from '@/shared/types.js';
import {
  buildDefaultProviderCurrentActiveModel,
  readObjectRecord,
  readOptionalString,
} from '@/shared/utils.js';

/** Curated Codex catalog shipped as immutable CloudCLI defaults. */
export const CODEX_PREDEFINED_MODELS: ProviderModelsDefinition = {
  OPTIONS: [
    {
      value: 'gpt-6-astra',
      label: 'GPT-6 Astra',
      description: 'Our most capable model for complex, demanding work.',
      effort: {
        default: 'low',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-5.6-sol',
      label: 'GPT-5.6 Sol',
      description: 'Latest frontier agentic coding model.',
      effort: {
        default: 'low',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-5.6-terra',
      label: 'GPT-5.6 Terra',
      description: 'Balanced agentic coding model for everyday work.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
          { value: 'ultra' },
        ],
      },
    },
    {
      value: 'gpt-5.6-luna',
      label: 'GPT-5.6 Luna',
      description: 'Fast and affordable agentic coding model.',
      effort: {
        default: 'medium',
        values: [
          { value: 'low' },
          { value: 'medium' },
          { value: 'high' },
          { value: 'xhigh' },
          { value: 'max' },
        ],
      },
    },
    {
      value: 'gpt-5.5',
      label: 'GPT-5.5',
      description: 'Frontier model for complex coding, research, and real-world work.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
    {
      value: 'gpt-5.4',
      label: 'GPT-5.4',
      description: 'Strong model for everyday coding.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
    {
      value: 'gpt-5.4-mini',
      label: 'GPT-5.4 Mini',
      description: 'Small, fast, and cost-efficient model for simpler coding tasks.',
      effort: {
        default: 'medium',
        values: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }, { value: 'xhigh' }],
      },
    },
  ],
  DEFAULT: 'gpt-5.6-sol',
};

const CODEX_CONFIG_PATH = path.join(os.homedir(), '.codex', 'config.toml');

/** Provider registry model adapter for Codex predefined models and active config. */
export class CodexProviderModels implements IProviderModels {
  private catalog: ProviderModelsDefinition | null = null;
  private expiresAt = 0;
  private discovery: Promise<ProviderModelsDefinition> | null = null;

  async getSupportedModels(): Promise<ProviderModelsDefinition> {
    if (this.catalog && Date.now() < this.expiresAt) return this.catalog;
    if (this.discovery) return this.discovery;
    this.discovery = this.discoverModels();
    try { return await this.discovery; } finally { this.discovery = null; }
  }

  private async discoverModels(): Promise<ProviderModelsDefinition> {
    let client: Awaited<ReturnType<typeof codexAppServer.connect>> | null = null;
    try {
      client = await codexAppServer.connect();
      const models: AnyRecord[] = [];
      let cursor: string | undefined;
      do {
        const result = await client.call('model/list', { limit: 100, ...(cursor ? { cursor } : {}) });
        models.push(...(result.data ?? []));
        cursor = result.nextCursor || undefined;
      } while (cursor);
      const visible = models.filter((model) => !model.hidden && typeof model.model === 'string');
      if (!visible.length) throw new Error('No native models available.');
      this.catalog = {
        OPTIONS: visible.map((model) => ({
          value: model.model, label: model.displayName || model.model, description: model.description,
          inputModalities: model.inputModalities,
          effort: { default: model.defaultReasoningEffort, values: (model.supportedReasoningEfforts ?? []).map((option: AnyRecord) => ({ value: option.reasoningEffort, description: option.description })) },
        })),
        DEFAULT: visible.find((model) => model.isDefault)?.model ?? visible[0].model,
      };
      this.expiresAt = Date.now() + 60_000;
      return this.catalog;
    } catch {
      // Offline startup retains a usable catalogue and retries discovery soon.
      this.catalog ??= CODEX_PREDEFINED_MODELS;
      this.expiresAt = Date.now() + 10_000;
      return this.catalog;
    } finally { client?.close(); }
  }

  async getCurrentActiveModel(): Promise<ProviderCurrentActiveModel> {
    try {
      const raw = await readFile(CODEX_CONFIG_PATH, 'utf8');
      const parsed = readObjectRecord(TOML.parse(raw));
      const model = readOptionalString(parsed?.model);
      if (!model) {
        return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
      }

      return {
        model,
      };
    } catch {
      return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
    }
  }
}
