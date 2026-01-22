/**
 * Registry de Módulos Especializados
 * 
 * Gerencia os prompts especializados disponíveis no sistema.
 */

import { JEC_SYSTEM_PROMPT } from './jec/prompt';
import { DEFAULT_SYSTEM_PROMPT } from './default/prompt';
import type { Module, ModuleSlug } from './types';

// Re-exportar tipos para uso externo
export type { Module, ModuleSlug } from './types';

const MODULES: Record<ModuleSlug, Module> = {
    default: {
        slug: 'default',
        name: 'Modo Geral',
        shortName: 'Geral',
        description: 'Assistente jurídico generalista',
        icon: 'Scale',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        isAvailable: true,
    },

    jec: {
        slug: 'jec',
        name: 'Juizado Especial Cível',
        shortName: 'JEC',
        description: 'Especializado em JEC (Lei 9.099/95) com Enunciados FONAJE, FONAJEF e FOJESP',
        icon: 'Gavel',
        systemPrompt: JEC_SYSTEM_PROMPT,
        isAvailable: true,
    },

    familia: {
        slug: 'familia',
        name: 'Direito de Família',
        shortName: 'Família',
        description: 'Especializado em Varas de Família',
        icon: 'Heart',
        systemPrompt: '', // TODO
        isAvailable: false,
    },

    criminal: {
        slug: 'criminal',
        name: 'Direito Penal',
        shortName: 'Penal',
        description: 'Especializado em Varas Criminais',
        icon: 'Shield',
        systemPrompt: '', // TODO
        isAvailable: false,
    },

    fazenda: {
        slug: 'fazenda',
        name: 'Fazenda Pública',
        shortName: 'Fazenda',
        description: 'Especializado em Varas de Fazenda Pública',
        icon: 'Building',
        systemPrompt: '', // TODO
        isAvailable: false,
    },
};

/**
 * Retorna o system prompt completo para um módulo
 */
export function getModulePrompt(slug: ModuleSlug = 'default'): string {
    const module = MODULES[slug];

    if (!module || !module.isAvailable) {
        return MODULES.default.systemPrompt;
    }

    return module.systemPrompt;
}

/**
 * Retorna lista de módulos disponíveis
 */
export function getAvailableModules(): Module[] {
    return Object.values(MODULES).filter(m => m.isAvailable);
}

/**
 * Retorna todos os módulos (para UI mostrar "em breve")
 */
export function getAllModules(): Module[] {
    return Object.values(MODULES);
}

/**
 * Retorna um módulo específico
 */
export function getModule(slug: ModuleSlug): Module | undefined {
    return MODULES[slug];
}
